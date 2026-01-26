import { Request, Response, Express } from "express";
import { db } from "../db";
import { quickbooksTokens, invoices, estimates } from "@shared/schema";
import { eq, sql, ne, isNotNull, and } from "drizzle-orm";
import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";

const QUICKBOOKS_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

const SCOPES = [
  "com.intuit.quickbooks.accounting",
  "openid",
  "profile",
  "email"
].join(" ");

function getConfig() {
  return {
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || "https://pool-brain-genius-1--generalmanager3.replit.app/api/quickbooks/callback",
  };
}

export function registerQuickbooksRoutes(app: Express) {
  app.get("/api/quickbooks/auth", (_req: Request, res: Response) => {
    const config = getConfig();
    
    if (!config.clientId) {
      return res.status(500).json({ error: "QuickBooks Client ID not configured" });
    }

    const state = Math.random().toString(36).substring(7);
    
    const params = new URLSearchParams();
    params.set("client_id", config.clientId);
    params.set("redirect_uri", config.redirectUri);
    params.set("response_type", "code");
    params.set("scope", SCOPES);
    params.set("state", state);
    
    const authUrl = `${QUICKBOOKS_AUTH_URL}?${params.toString().replace(/\+/g, '%20')}`;

    res.json({ authUrl });
  });

  app.get("/api/quickbooks/callback", async (req: Request, res: Response) => {
    const { code, realmId, error } = req.query;
    const config = getConfig();

    if (error) {
      return res.redirect(`/settings?qb_error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !realmId) {
      return res.redirect("/settings?qb_error=missing_params");
    }

    if (!config.clientId || !config.clientSecret) {
      return res.redirect("/settings?qb_error=missing_credentials");
    }

    try {
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
      
      const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: config.redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("QuickBooks token exchange failed:", errorText);
        return res.redirect("/settings?qb_error=token_exchange_failed");
      }

      const tokens = await tokenResponse.json();
      
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));
      const refreshTokenExpiresAt = new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000));

      const existing = await db.select().from(quickbooksTokens).where(eq(quickbooksTokens.realmId, realmId as string));
      
      if (existing.length > 0) {
        await db.update(quickbooksTokens)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(quickbooksTokens.realmId, realmId as string));
      } else {
        await db.insert(quickbooksTokens).values({
          realmId: realmId as string,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        });
      }

      res.redirect("/settings?qb_success=true");
    } catch (error) {
      console.error("QuickBooks OAuth error:", error);
      res.redirect("/settings?qb_error=unknown");
    }
  });

  app.post("/api/quickbooks/refresh", async (_req: Request, res: Response) => {
    const config = getConfig();
    
    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({ error: "QuickBooks credentials not configured" });
    }

    try {
      const tokenRecords = await db.select().from(quickbooksTokens).limit(1);
      
      if (tokenRecords.length === 0) {
        return res.status(404).json({ error: "No QuickBooks connection found" });
      }

      const tokenRecord = tokenRecords[0];
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

      const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRecord.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("QuickBooks token refresh failed:", errorText);
        return res.status(400).json({ error: "Token refresh failed" });
      }

      const tokens = await tokenResponse.json();
      
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));
      const refreshTokenExpiresAt = new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000));

      await db.update(quickbooksTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(quickbooksTokens.id, tokenRecord.id));

      res.json({ success: true, expiresAt: accessTokenExpiresAt });
    } catch (error) {
      console.error("QuickBooks refresh error:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  app.get("/api/quickbooks/status", async (_req: Request, res: Response) => {
    try {
      const tokenRecords = await db.select().from(quickbooksTokens).limit(1);
      
      if (tokenRecords.length === 0) {
        return res.json({ connected: false });
      }

      const tokenRecord = tokenRecords[0];
      const now = new Date();
      const isAccessTokenValid = tokenRecord.accessTokenExpiresAt > now;
      const isRefreshTokenValid = tokenRecord.refreshTokenExpiresAt > now;

      res.json({
        connected: true,
        realmId: tokenRecord.realmId,
        accessTokenValid: isAccessTokenValid,
        refreshTokenValid: isRefreshTokenValid,
        accessTokenExpiresAt: tokenRecord.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokenRecord.refreshTokenExpiresAt,
      });
    } catch (error) {
      console.error("QuickBooks status error:", error);
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  app.delete("/api/quickbooks/disconnect", async (_req: Request, res: Response) => {
    try {
      await db.delete(quickbooksTokens);
      res.json({ success: true });
    } catch (error) {
      console.error("QuickBooks disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.post("/api/quickbooks/invoice", async (req: Request, res: Response) => {
    try {
      const { 
        customerName, 
        customerEmail,
        lineItems, 
        memo,
        estimateId,
        estimateNumber,
        customerId: customerIdFromRequest,
        propertyId,
        propertyName,
        propertyAddress,
        serviceTechId,
        serviceTechName,
        repairTechId,
        repairTechName,
        sentByUserId,
        sentByUserName,
        dueDate,
        customerNote,
        internalNotes,
        selectedPhotos,
        sendEmail = true,
      } = req.body;
      
      console.log("=== QuickBooks Invoice Creation Request ===");
      console.log("Customer Name:", customerName);
      console.log("Customer Email:", customerEmail);
      console.log("Line Items:", JSON.stringify(lineItems, null, 2));
      console.log("Estimate ID:", estimateId);
      console.log("Memo:", memo);
      console.log("Send Email:", sendEmail);
      
      if (!customerName || !lineItems || !Array.isArray(lineItems)) {
        console.error("Missing required fields");
        return res.status(400).json({ error: "Missing required fields: customerName, lineItems" });
      }
      
      // Validate email is provided when sendEmail is true
      if (sendEmail && !customerEmail) {
        console.error("Email required when sendEmail is true");
        return res.status(400).json({ 
          error: "Email address is required to send the invoice",
          code: "EMAIL_REQUIRED"
        });
      }
      
      // Validate email format if provided
      if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        console.error("Invalid email format:", customerEmail);
        return res.status(400).json({ 
          error: "Invalid email address format",
          code: "INVALID_EMAIL"
        });
      }

      const auth = await getQuickBooksAccessToken();
      if (!auth) {
        console.error("QuickBooks authentication failed - no valid token found");
        return res.status(401).json({ 
          error: "QuickBooks not connected or token expired",
          code: "QB_NOT_CONNECTED",
          message: "Please connect to QuickBooks in Settings before sending invoices. Your authorization may have expired and needs to be renewed."
        });
      }

      const { accessToken, realmId } = auth;
      
      // Use sandbox URL for sandbox realm IDs, production URL otherwise
      // Sandbox realm IDs typically start with 9341 or 1234
      const isSandbox = realmId.startsWith("9341") || realmId.startsWith("1234") || realmId === "9341456043862092";
      const apiHost = isSandbox 
        ? "https://sandbox-quickbooks.api.intuit.com" 
        : "https://quickbooks.api.intuit.com";
      const baseUrl = `${apiHost}/v3/company/${realmId}`;
      
      console.log("=== QuickBooks Connection Info ===");
      console.log("Realm ID:", realmId);
      console.log("Is Sandbox:", isSandbox);
      console.log("API Base URL:", baseUrl);
      console.log("Access Token (first 20 chars):", accessToken.substring(0, 20) + "...");

      let customerId = await findOrCreateCustomer(baseUrl, accessToken, customerName);
      console.log("QuickBooks Customer ID:", customerId);

      const defaultItemRef = await getOrCreateDefaultServiceItem(baseUrl, accessToken);
      console.log("QuickBooks Default Item Ref:", JSON.stringify(defaultItemRef));
      
      const invoiceLines = lineItems.map((item: any, index: number) => ({
        LineNum: index + 1,
        Amount: item.amount / 100,
        DetailType: "SalesItemLineDetail",
        Description: item.description || item.productService,
        SalesItemLineDetail: {
          ItemRef: defaultItemRef,
          Qty: item.quantity,
          UnitPrice: item.rate / 100,
        },
      }));

      const invoicePayload: any = {
        CustomerRef: { value: customerId },
        Line: invoiceLines,
        PrivateNote: memo || undefined,
      };
      
      // Add BillEmail if customer email is provided
      if (customerEmail) {
        invoicePayload.BillEmail = { Address: customerEmail };
      }

      console.log("=== QuickBooks Invoice API Request ===");
      console.log("URL:", `${baseUrl}/invoice`);
      console.log("Payload:", JSON.stringify(invoicePayload, null, 2));

      const invoiceResponse = await fetch(`${baseUrl}/invoice`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoicePayload),
      });

      console.log("=== QuickBooks Invoice API Response ===");
      console.log("Status:", invoiceResponse.status, invoiceResponse.statusText);

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.text();
        console.error("QuickBooks invoice creation FAILED");
        console.error("Error Response:", errorData);
        
        // Try to parse error for better message
        let errorMessage = "Failed to create invoice in QuickBooks";
        try {
          const parsedError = JSON.parse(errorData);
          if (parsedError.Fault?.Error?.[0]?.Message) {
            errorMessage = parsedError.Fault.Error[0].Message;
            if (parsedError.Fault.Error[0].Detail) {
              errorMessage += ": " + parsedError.Fault.Error[0].Detail;
            }
          }
        } catch (e) {
          // Use raw error if parsing fails
        }
        
        return res.status(400).json({ 
          error: errorMessage, 
          details: errorData,
          realmId: realmId,
          isSandbox: isSandbox
        });
      }

      const invoiceData = await invoiceResponse.json();
      const qbInvoice = invoiceData.Invoice;
      
      console.log("=== QuickBooks Invoice Created Successfully ===");
      console.log("QuickBooks Invoice ID:", qbInvoice.Id);
      console.log("QuickBooks Invoice DocNumber:", qbInvoice.DocNumber);
      console.log("QuickBooks Invoice TotalAmt:", qbInvoice.TotalAmt);

      // Generate our invoice number atomically using a subquery for the count
      const year = new Date().getFullYear().toString().slice(-2);
      const countResult = await db
        .select({ count: sql<number>`COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1` })
        .from(invoices)
        .where(sql`invoice_number LIKE ${'INV-' + year + '-%'}`);
      const nextNum = (countResult[0]?.count || 1).toString().padStart(5, '0');
      const ourInvoiceNumber = `INV-${year}-${nextNum}`;

      // Calculate totals from line items
      const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const totalAmount = subtotal; // Can add tax calculations if needed

      // Save invoice to our database
      const [savedInvoice] = await db.insert(invoices).values({
        invoiceNumber: ourInvoiceNumber,
        customerId: customerIdFromRequest || null,
        customerName: customerName,
        propertyId: propertyId || null,
        propertyName: propertyName || customerName,
        propertyAddress: propertyAddress || null,
        estimateId: estimateId || null,
        estimateNumber: estimateNumber || null,
        serviceTechId: serviceTechId || null,
        serviceTechName: serviceTechName || null,
        repairTechId: repairTechId || null,
        repairTechName: repairTechName || null,
        sentByUserId: sentByUserId || null,
        sentByUserName: sentByUserName || null,
        lineItems: lineItems.map((item: any) => ({
          description: item.description || item.productService || '',
          quantity: item.quantity || 1,
          rate: item.rate || 0,
          amount: item.amount || 0,
        })),
        subtotal: subtotal,
        totalAmount: totalAmount,
        amountDue: totalAmount,
        status: "sent",
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        quickbooksInvoiceId: qbInvoice.Id,
        quickbooksDocNumber: qbInvoice.DocNumber,
        quickbooksSyncedAt: new Date(),
        quickbooksSyncStatus: "synced",
        notes: customerNote || null,
        internalNotes: internalNotes || null,
        sentAt: new Date(),
      }).returning();

      // Upload selected attachments to QuickBooks using official Attachments API format
      console.log("\n" + "=".repeat(60));
      console.log("STARTING ATTACHMENT UPLOAD PROCESS...");
      console.log("=".repeat(60));
      console.log(`Invoice created successfully. QB Invoice ID: ${qbInvoice.Id}`);
      console.log(`selectedPhotos received from request:`, JSON.stringify(selectedPhotos, null, 2));
      console.log(`Type of selectedPhotos: ${typeof selectedPhotos}`);
      console.log(`Is array: ${Array.isArray(selectedPhotos)}`);
      
      let uploadedAttachments = 0;
      const failedAttachments: string[] = [];
      const photosToUpload: string[] = selectedPhotos || [];
      const totalAttachments = photosToUpload.length;
      
      console.log(`\nFound ${totalAttachments} photos to upload`);
      
      if (totalAttachments === 0) {
        console.log("WARNING: No photos selected for upload - skipping attachment upload");
        console.log("Check if 'Attach to email' checkboxes were selected in the invoice modal");
      }
      
      if (totalAttachments > 0) {
        console.log(`\n=== Uploading ${totalAttachments} selected attachments to QuickBooks invoice ${qbInvoice.Id} ===`);
        console.log(`Photos to upload:`);
        photosToUpload.forEach((url, idx) => {
          console.log(`  ${idx + 1}. ${url}`);
        });
        
        // Upload each selected photo to QuickBooks
        for (let i = 0; i < photosToUpload.length; i++) {
          const photoUrl = photosToUpload[i];
          const attachmentIndex = i + 1; // 1-based index for logging
          
          console.log(`\n--- Processing attachment ${attachmentIndex} of ${totalAttachments} ---`);
          console.log(`Photo URL: ${photoUrl}`);
          
          const photoData = await fetchPhotoData(photoUrl);
          if (photoData) {
            console.log(`Photo data fetched successfully:`);
            console.log(`  - File name: ${photoData.fileName}`);
            console.log(`  - Content type: ${photoData.contentType}`);
            console.log(`  - File size: ${photoData.data.length} bytes`);
            
            const success = await uploadAttachmentToQuickBooks(
              baseUrl,
              accessToken,
              qbInvoice.Id,
              photoData.data,
              photoData.fileName,
              photoData.contentType,
              attachmentIndex,
              totalAttachments
            );
            if (success) {
              uploadedAttachments++;
              console.log(`  => UPLOAD SUCCESS for ${photoData.fileName}`);
            } else {
              failedAttachments.push(photoData.fileName);
              console.log(`  => UPLOAD FAILED for ${photoData.fileName}`);
            }
          } else {
            console.error(`  - Could not fetch photo data from: ${photoUrl}`);
            console.error(`  - This may indicate the photo doesn't exist in storage or URL is invalid`);
            failedAttachments.push(photoUrl.split('/').pop() || 'unknown');
          }
        }
        
        console.log(`\n=== Attachment upload complete: ${uploadedAttachments}/${totalAttachments} successful ===`);
        if (failedAttachments.length > 0) {
          console.log(`=== Failed attachments: ${failedAttachments.join(', ')} ===`);
        }
      }
      console.log("=".repeat(60) + "\n");
      
      // If this is from an estimate, update it with the invoice ID
      if (estimateId) {
        await db.update(estimates)
          .set({ 
            invoiceId: savedInvoice.id,
            invoicedAt: new Date(),
          })
          .where(eq(estimates.id, estimateId));
      }

      // Send invoice via email if email is provided and sendEmail is true
      let emailSent = false;
      let emailSentTo = "";
      let emailError = "";
      
      if (sendEmail && customerEmail) {
        console.log("\n=== Sending Invoice via Email ===");
        console.log(`Sending invoice ${qbInvoice.Id} to: ${customerEmail}`);
        
        try {
          const sendUrl = `${baseUrl}/invoice/${qbInvoice.Id}/send?sendTo=${encodeURIComponent(customerEmail)}`;
          console.log("Send invoice URL:", sendUrl);
          
          const sendResponse = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Accept": "application/json",
              "Content-Type": "application/octet-stream",
            },
          });
          
          console.log("Send invoice response status:", sendResponse.status);
          const sendResponseText = await sendResponse.text();
          console.log("Send invoice response body:", sendResponseText);
          
          if (sendResponse.ok) {
            emailSent = true;
            emailSentTo = customerEmail;
            console.log(`Invoice email sent successfully to: ${customerEmail}`);
            
            // Verify the response contains the invoice with EmailStatus
            try {
              const sendData = JSON.parse(sendResponseText);
              if (sendData.Invoice?.EmailStatus === "EmailSent") {
                console.log("QuickBooks confirmed email was sent");
              } else {
                console.log("QuickBooks email status:", sendData.Invoice?.EmailStatus);
              }
            } catch (e) {
              console.log("Could not parse send response");
            }
            
            // Update invoice record with email sent status
            await db.update(invoices)
              .set({
                emailedTo: customerEmail,
                emailedAt: new Date(),
              })
              .where(eq(invoices.id, savedInvoice.id));
          } else {
            console.error("Failed to send invoice email:", sendResponseText);
            emailError = "Email send failed";
            
            // Try to parse error for better message
            try {
              const parsedError = JSON.parse(sendResponseText);
              if (parsedError.Fault?.Error?.[0]?.Message) {
                emailError = parsedError.Fault.Error[0].Message;
              }
            } catch (e) {
              // Use default error
            }
          }
        } catch (sendError) {
          console.error("Error sending invoice email:", sendError);
          emailError = "Email send request failed";
        }
      } else if (sendEmail && !customerEmail) {
        console.log("Cannot send email: No customer email provided");
        emailError = "No email address provided";
      }

      // Build response message
      let message = "";
      if (emailSent) {
        message = `Invoice Created & Emailed! QB Invoice ID: ${qbInvoice.Id} | Sent to: ${emailSentTo}`;
        if (uploadedAttachments > 0) {
          message += ` | ${uploadedAttachments} attachment${uploadedAttachments !== 1 ? 's' : ''} uploaded`;
        }
      } else {
        message = `Invoice Created! QB Invoice ID: ${qbInvoice.Id}`;
        if (uploadedAttachments > 0) {
          message += ` | ${uploadedAttachments} attachment${uploadedAttachments !== 1 ? 's' : ''} uploaded`;
        }
        if (emailError) {
          message += ` | Email not sent: ${emailError}`;
        }
      }
      if (failedAttachments.length > 0) {
        message += ` (${failedAttachments.length} attachment${failedAttachments.length !== 1 ? 's' : ''} failed)`;
      }

      res.json({
        success: true,
        invoiceId: qbInvoice.Id,
        invoiceNumber: qbInvoice.DocNumber,
        totalAmount: qbInvoice.TotalAmt,
        localInvoiceId: savedInvoice.id,
        localInvoiceNumber: ourInvoiceNumber,
        attachmentsUploaded: uploadedAttachments,
        totalAttachments: totalAttachments,
        failedAttachments: failedAttachments,
        emailSent: emailSent,
        emailSentTo: emailSentTo,
        emailError: emailError || undefined,
        message: message,
      });
    } catch (error) {
      console.error("QuickBooks invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // In-memory set to track processed webhook events for idempotency
  // In production, this should be stored in Redis or database with TTL
  const processedWebhookEvents = new Set<string>();
  
  // QuickBooks Webhooks endpoint for receiving payment notifications
  // This endpoint needs to be registered in QuickBooks Developer Portal
  // Webhook verifier token should be set in environment as QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN
  app.post("/api/webhooks/quickbooks", async (req: Request, res: Response) => {
    console.log("=== QUICKBOOKS WEBHOOK RECEIVED ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    
    try {
      // Verify webhook signature (QuickBooks uses intuit-signature header with HMAC-SHA256)
      const signature = req.headers["intuit-signature"] as string;
      const webhookVerifierToken = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;
      
      // In production, signature must be present and valid
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (webhookVerifierToken) {
        if (!signature) {
          if (isProduction) {
            console.error("Missing webhook signature in production - rejecting");
            return res.status(401).json({ error: "Missing signature" });
          }
          console.warn("No signature in request - proceeding for sandbox testing only");
        } else {
          // Verify signature using raw body bytes
          const crypto = await import('crypto');
          // rawBody is set by express.json verify option in app.ts
          const rawBody = req.rawBody;
          
          if (!rawBody) {
            console.error("No raw body available for signature verification");
            return res.status(400).json({ error: "Cannot verify signature - no raw body" });
          }
          
          const expectedSignature = crypto.createHmac('sha256', webhookVerifierToken)
            .update(rawBody as Buffer)
            .digest('base64');
          
          if (signature !== expectedSignature) {
            console.error("Invalid webhook signature - rejecting request");
            return res.status(401).json({ error: "Invalid signature" });
          }
          console.log("Webhook signature verified successfully");
        }
      }
      
      // QuickBooks sends notifications in a specific format
      const { eventNotifications } = req.body;
      
      if (!eventNotifications || !Array.isArray(eventNotifications)) {
        console.log("No event notifications found in webhook payload");
        return res.status(200).json({ message: "No events to process" });
      }
      
      let processingErrors = 0;
      
      for (const notification of eventNotifications) {
        const realmId = notification.realmId;
        const dataChangeEvent = notification.dataChangeEvent;
        
        if (!dataChangeEvent?.entities) {
          console.log("No entities in data change event");
          continue;
        }
        
        for (const entity of dataChangeEvent.entities) {
          // Generate unique event key for idempotency
          const eventKey = `${realmId}:${entity.name}:${entity.id}:${entity.operation}:${entity.lastUpdated || ''}`;
          
          // Check idempotency at event level
          if (processedWebhookEvents.has(eventKey)) {
            console.log(`Event ${eventKey} already processed - skipping`);
            continue;
          }
          
          console.log(`Processing entity: ${entity.name} (${entity.operation})`);
          
          try {
            // Handle Payment events
            if (entity.name === "Payment") {
              console.log(`Payment event detected: ${entity.operation} for ID ${entity.id}`);
              
              // For Create or Update operations, fetch and process the payment
              if (entity.operation === "Create" || entity.operation === "Update") {
                await processPaymentWebhook(entity.id, realmId);
              }
            }
            
            // Handle Invoice status changes (useful for tracking when invoices are paid directly in QB)
            if (entity.name === "Invoice" && entity.operation === "Update") {
              console.log(`Invoice update event detected for ID ${entity.id}`);
              // Could fetch invoice and check if balance is 0 (fully paid)
            }
            
            // Mark event as processed after successful handling
            processedWebhookEvents.add(eventKey);
            
            // Clean up old events (keep last 1000) to prevent memory leak
            if (processedWebhookEvents.size > 1000) {
              const firstKey = processedWebhookEvents.values().next().value;
              if (firstKey) processedWebhookEvents.delete(firstKey);
            }
          } catch (entityError) {
            console.error(`Error processing entity ${entity.name}:${entity.id}:`, entityError);
            processingErrors++;
          }
        }
      }
      
      // Return 200 if all events processed, 500 if some failed (allows QB to retry)
      if (processingErrors > 0) {
        console.error(`Webhook had ${processingErrors} processing errors`);
        return res.status(500).json({ message: "Partial processing failure", errors: processingErrors });
      }
      
      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Error processing QuickBooks webhook:", error);
      // Return 500 to allow QuickBooks to retry
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  
  // Endpoint to manually query a payment by ID (for testing/debugging)
  app.get("/api/quickbooks/payment/:paymentId", async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    
    try {
      const tokens = await getQuickBooksAccessToken();
      if (!tokens) {
        return res.status(401).json({ error: "QuickBooks not connected" });
      }
      
      const { accessToken, realmId } = tokens;
      const baseUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;
      
      const response = await fetch(`${baseUrl}/payment/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch payment:", errorText);
        return res.status(response.status).json({ error: "Failed to fetch payment", details: errorText });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });
  
  // Endpoint to list recent payments (for debugging)
  app.get("/api/quickbooks/payments", async (req: Request, res: Response) => {
    try {
      const tokens = await getQuickBooksAccessToken();
      if (!tokens) {
        return res.status(401).json({ error: "QuickBooks not connected" });
      }
      
      const { accessToken, realmId } = tokens;
      const baseUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;
      
      // Query recent payments
      const queryResponse = await fetch(
        `${baseUrl}/query?query=${encodeURIComponent("SELECT * FROM Payment ORDER BY TxnDate DESC MAXRESULTS 50")}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        }
      );
      
      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        console.error("Failed to query payments:", errorText);
        return res.status(queryResponse.status).json({ error: "Failed to query payments", details: errorText });
      }
      
      const data = await queryResponse.json();
      res.json(data);
    } catch (error) {
      console.error("Error querying payments:", error);
      res.status(500).json({ error: "Failed to query payments" });
    }
  });

  // Manual payment sync endpoint - checks QuickBooks for payments on our invoices
  app.post("/api/quickbooks/sync-payments", async (_req: Request, res: Response) => {
    console.log("=== MANUAL PAYMENT SYNC STARTED ===");
    try {
      const tokens = await getQuickBooksAccessToken();
      if (!tokens) {
        console.log("QuickBooks not connected - aborting sync");
        return res.status(401).json({ success: false, error: "QuickBooks not connected" });
      }

      const { accessToken, realmId } = tokens;
      const isSandbox = !process.env.QUICKBOOKS_PRODUCTION;
      const baseUrl = isSandbox 
        ? `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`
        : `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
      
      console.log(`Using QuickBooks API: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
      console.log(`Realm ID: ${realmId}`);

      // Get all invoices that are not yet paid
      const unpaidInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            ne(invoices.status, "paid"),
            isNotNull(invoices.quickbooksInvoiceId)
          )
        );

      console.log(`Found ${unpaidInvoices.length} unpaid invoices with QuickBooks IDs to check:`);
      for (const inv of unpaidInvoices) {
        console.log(`  - ${inv.invoiceNumber} (QB ID: ${inv.quickbooksInvoiceId}, Local ID: ${inv.id}, Status: ${inv.status}, Total: $${(inv.totalAmount || 0)/100})`);
      }

      let updatedCount = 0;

      for (const invoice of unpaidInvoices) {
        try {
          console.log(`\n--- Checking invoice ${invoice.invoiceNumber} (QB ID: ${invoice.quickbooksInvoiceId}) ---`);
          
          // Fetch invoice from QuickBooks to check balance
          const qbResponse = await fetch(`${baseUrl}/invoice/${invoice.quickbooksInvoiceId}`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Accept": "application/json",
            },
          });

          console.log(`QuickBooks API response status: ${qbResponse.status}`);

          if (!qbResponse.ok) {
            const errorText = await qbResponse.text();
            console.error(`Failed to fetch QB invoice ${invoice.quickbooksInvoiceId}: ${errorText}`);
            continue;
          }

          const qbData = await qbResponse.json();
          const qbInvoice = qbData.Invoice;
          
          console.log(`QB Invoice found:`);
          console.log(`  - DocNumber: ${qbInvoice.DocNumber}`);
          console.log(`  - TotalAmt: ${qbInvoice.TotalAmt}`);
          console.log(`  - Balance: ${qbInvoice.Balance}`);
          console.log(`  - CustomerRef: ${qbInvoice.CustomerRef?.name || qbInvoice.CustomerRef?.value}`);
          
          const qbBalance = parseFloat(qbInvoice.Balance || "0");
          const qbTotal = parseFloat(qbInvoice.TotalAmt || "0");
          const balance = Math.round(qbBalance * 100);
          const totalAmount = invoice.totalAmount || 0;
          const paidAmount = totalAmount - balance;
          const isFullyPaid = qbBalance === 0;

          console.log(`Payment analysis:`);
          console.log(`  - QB Balance: $${qbBalance} (${balance} cents)`);
          console.log(`  - QB Total: $${qbTotal}`);
          console.log(`  - Local Total: $${totalAmount/100} (${totalAmount} cents)`);
          console.log(`  - Calculated Paid Amount: $${paidAmount/100}`);
          console.log(`  - Is Fully Paid: ${isFullyPaid}`);
          console.log(`  - Current Local Status: ${invoice.status}`);
          console.log(`  - Current Local AmountDue: ${invoice.amountDue}`);

          // Check if payment has been made (balance is less than total in QB)
          const hasPayment = qbBalance < qbTotal;
          console.log(`  - Has Payment in QB: ${hasPayment}`);

          if (hasPayment) {
            // Try to get payment details for payment method
            let paymentMethod: string | null = null;
            let paidAt: Date | null = null;

            // Query payments linked to this invoice
            const paymentQuery = `SELECT * FROM Payment WHERE Line.LinkedTxn.TxnId = '${invoice.quickbooksInvoiceId}'`;
            console.log(`Querying payments: ${paymentQuery}`);
            
            const paymentResponse = await fetch(
              `${baseUrl}/query?query=${encodeURIComponent(paymentQuery)}`,
              {
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Accept": "application/json",
                },
              }
            );

            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              const payments = paymentData.QueryResponse?.Payment || [];
              console.log(`Found ${payments.length} payment(s) linked to this invoice`);

              if (payments.length > 0) {
                const latestPayment = payments[payments.length - 1];
                console.log(`Latest payment details:`);
                console.log(`  - Payment ID: ${latestPayment.Id}`);
                console.log(`  - TotalAmt: ${latestPayment.TotalAmt}`);
                console.log(`  - TxnDate: ${latestPayment.TxnDate}`);
                console.log(`  - PaymentMethodRef: ${JSON.stringify(latestPayment.PaymentMethodRef)}`);
                
                paymentMethod = latestPayment.PaymentMethodRef?.name || latestPayment.PaymentType || null;
                paidAt = latestPayment.TxnDate ? new Date(latestPayment.TxnDate) : new Date();
                
                console.log(`  - Extracted Payment Method: ${paymentMethod}`);
                console.log(`  - Extracted Paid Date: ${paidAt}`);
              }
            } else {
              console.log(`Payment query failed: ${paymentResponse.status}`);
            }

            // Update the invoice
            console.log(`\nUpdating invoice ${invoice.invoiceNumber}...`);
            await db
              .update(invoices)
              .set({
                status: isFullyPaid ? "paid" : "partial",
                paidAmount: paidAmount,
                paidAt: isFullyPaid ? (paidAt || new Date()) : null,
                paymentMethod: paymentMethod,
                amountDue: balance,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, invoice.id));

            console.log(`Invoice ${invoice.invoiceNumber} updated successfully:`);
            console.log(`  - New Status: ${isFullyPaid ? "paid" : "partial"}`);
            console.log(`  - Paid Amount: $${paidAmount/100}`);
            console.log(`  - Payment Method: ${paymentMethod}`);
            console.log(`  - Paid At: ${paidAt || new Date()}`);

            // If fully paid, also update the estimate
            if (isFullyPaid && invoice.estimateId) {
              await db
                .update(estimates)
                .set({
                  status: "paid",
                  updatedAt: new Date(),
                })
                .where(eq(estimates.id, invoice.estimateId));
              console.log(`Estimate ${invoice.estimateId} marked as paid`);
            }

            updatedCount++;
          } else {
            console.log(`No payment detected - invoice balance equals total`);
          }
        } catch (error) {
          console.error(`Error checking invoice ${invoice.invoiceNumber}:`, error);
        }
      }

      console.log(`\n=== MANUAL PAYMENT SYNC COMPLETE ===`);
      console.log(`Updated ${updatedCount} of ${unpaidInvoices.length} invoices`);

      res.json({ success: true, updated: updatedCount, checked: unpaidInvoices.length });
    } catch (error: any) {
      console.error("Error syncing payments:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// Process payment webhook - fetch payment details and update local records
async function processPaymentWebhook(paymentId: string, realmId: string): Promise<void> {
  console.log(`=== PROCESSING PAYMENT WEBHOOK ===`);
  console.log(`Payment ID: ${paymentId}, Realm ID: ${realmId}`);
  
  try {
    const tokens = await getQuickBooksAccessToken();
    if (!tokens) {
      console.error("Cannot process payment webhook - QuickBooks not connected");
      return;
    }
    
    const { accessToken } = tokens;
    const baseUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;
    
    // Fetch the payment details from QuickBooks
    const response = await fetch(`${baseUrl}/payment/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch payment ${paymentId}:`, errorText);
      return;
    }
    
    const paymentData = await response.json();
    const payment = paymentData.Payment;
    
    console.log("Payment details:", JSON.stringify(payment, null, 2));
    
    // Extract payment information
    const totalAmount = Math.round(parseFloat(payment.TotalAmt) * 100); // Convert to cents
    const paymentMethod = payment.PaymentMethodRef?.name || "Unknown";
    const txnDate = payment.TxnDate;
    
    // Get linked invoices from the payment
    const linkedTxns = payment.Line || [];
    
    for (const line of linkedTxns) {
      if (line.LinkedTxn) {
        for (const linkedTxn of line.LinkedTxn) {
          if (linkedTxn.TxnType === "Invoice") {
            const qbInvoiceId = linkedTxn.TxnId;
            const amountApplied = Math.round(parseFloat(line.Amount) * 100);
            
            console.log(`Payment applied to invoice ${qbInvoiceId}: $${amountApplied / 100}`);
            
            // Find the matching invoice in our database
            const matchingInvoices = await db
              .select()
              .from(invoices)
              .where(eq(invoices.quickbooksInvoiceId, qbInvoiceId));
            
            // Check for duplicate payment processing (DB-level idempotency)
            if (matchingInvoices.length > 0 && matchingInvoices[0].qbPaymentId === paymentId) {
              console.log(`Payment ${paymentId} already applied to invoice ${qbInvoiceId} - skipping duplicate`);
              continue;
            }
            
            if (matchingInvoices.length > 0) {
              const invoice = matchingInvoices[0];
              console.log(`Found matching local invoice: ${invoice.id}`);
              
              // Fetch current invoice balance from QuickBooks for accurate status
              // This makes the update idempotent - we compute total paid from QB's authoritative data
              let invoiceBalance: number | null = null;
              try {
                const invoiceResponse = await fetch(`${baseUrl}/invoice/${qbInvoiceId}`, {
                  headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                  },
                });
                if (invoiceResponse.ok) {
                  const invoiceData = await invoiceResponse.json();
                  invoiceBalance = Math.round(parseFloat(invoiceData.Invoice.Balance || "0") * 100);
                  console.log(`QuickBooks invoice balance: $${invoiceBalance / 100}`);
                } else {
                  console.error(`Failed to fetch QB invoice: ${invoiceResponse.status}`);
                }
              } catch (e) {
                console.error("Failed to fetch invoice balance from QB:", e);
              }
              
              // If we couldn't fetch the balance, throw error to trigger retry
              if (invoiceBalance === null) {
                throw new Error(`Could not fetch invoice balance for ${qbInvoiceId} - will retry`);
              }
              
              const invoiceTotal = invoice.totalAmount || 0;
              // Calculate total paid from invoice total minus remaining balance
              const totalPaidFromQB = invoiceTotal - invoiceBalance;
              
              // Only mark as "paid" if fully paid (balance is 0)
              const isFullyPaid = invoiceBalance === 0;
              const newStatus = isFullyPaid ? "paid" : invoice.status;
              
              console.log(`Invoice total: $${invoiceTotal / 100}, QB Balance: $${invoiceBalance / 100}, Total paid: $${totalPaidFromQB / 100}`);
              console.log(`Fully paid: ${isFullyPaid}`);
              
              // Update the invoice with payment information (idempotent - uses QB authoritative data)
              await db
                .update(invoices)
                .set({
                  status: newStatus,
                  paidAt: isFullyPaid ? new Date(txnDate) : invoice.paidAt,
                  paidAmount: totalPaidFromQB, // Use computed value from QB balance
                  qbPaymentId: paymentId, // Track most recent payment
                  paymentMethod: paymentMethod,
                  updatedAt: new Date(),
                })
                .where(eq(invoices.id, invoice.id));
              
              console.log(`Invoice ${invoice.id} updated - status: ${newStatus}`);
              
              // Also update the linked estimate to "paid" if invoice is fully paid
              if (invoice.estimateId && isFullyPaid) {
                await db
                  .update(estimates)
                  .set({
                    status: "paid",
                    updatedAt: new Date(),
                  })
                  .where(eq(estimates.id, invoice.estimateId));
                
                console.log(`Estimate ${invoice.estimateId} marked as paid`);
              }
            } else {
              console.log(`No matching local invoice found for QB invoice ${qbInvoiceId}`);
            }
          }
        }
      }
    }
    
    console.log("=== PAYMENT WEBHOOK PROCESSING COMPLETE ===");
  } catch (error) {
    console.error("Error processing payment webhook:", error);
  }
}

async function getOrCreateDefaultServiceItem(baseUrl: string, accessToken: string): Promise<{ value: string; name: string }> {
  const serviceName = "Pool Service";
  
  const queryResponse = await fetch(
    `${baseUrl}/query?query=${encodeURIComponent(`SELECT * FROM Item WHERE Name = '${serviceName}' AND Type = 'Service'`)}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    }
  );

  if (queryResponse.ok) {
    const queryData = await queryResponse.json();
    if (queryData.QueryResponse?.Item?.length > 0) {
      const item = queryData.QueryResponse.Item[0];
      return { value: item.Id, name: item.Name };
    }
  }

  const incomeAccountQuery = await fetch(
    `${baseUrl}/query?query=${encodeURIComponent(`SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 1`)}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    }
  );

  let incomeAccountId = null;
  if (incomeAccountQuery.ok) {
    const accountData = await incomeAccountQuery.json();
    if (accountData.QueryResponse?.Account?.length > 0) {
      incomeAccountId = accountData.QueryResponse.Account[0].Id;
    }
  }

  const createPayload: any = {
    Name: serviceName,
    Type: "Service",
  };
  
  if (incomeAccountId) {
    createPayload.IncomeAccountRef = { value: incomeAccountId };
  }

  const createResponse = await fetch(`${baseUrl}/item`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.text();
    console.error("Failed to create service item:", errorData);
    throw new Error("Failed to create service item in QuickBooks");
  }

  const createData = await createResponse.json();
  return { value: createData.Item.Id, name: createData.Item.Name };
}

async function findOrCreateCustomer(baseUrl: string, accessToken: string, customerName: string): Promise<string> {
  const queryResponse = await fetch(
    `${baseUrl}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${customerName.replace(/'/g, "\\'")}'`)}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    }
  );

  if (queryResponse.ok) {
    const queryData = await queryResponse.json();
    if (queryData.QueryResponse?.Customer?.length > 0) {
      return queryData.QueryResponse.Customer[0].Id;
    }
  }

  const createResponse = await fetch(`${baseUrl}/customer`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      DisplayName: customerName,
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.text();
    console.error("Failed to create customer:", errorData);
    
    // Parse the error for more details
    try {
      const parsedError = JSON.parse(errorData);
      const qbError = parsedError?.fault?.error?.[0];
      if (qbError) {
        const errorMessage = qbError.message || "Unknown QuickBooks error";
        const errorCode = qbError.code || "UNKNOWN";
        
        // Check for authorization errors
        if (errorMessage.includes("ApplicationAuthorizationFailed") || errorCode === "3100") {
          throw new Error(`QuickBooks authorization expired. Please reconnect in Settings. (Code: ${errorCode})`);
        }
        throw new Error(`QuickBooks error: ${errorMessage} (Code: ${errorCode})`);
      }
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message.includes("QuickBooks")) {
        throw parseError;
      }
    }
    throw new Error("Failed to create customer in QuickBooks");
  }

  const createData = await createResponse.json();
  return createData.Customer.Id;
}

export async function getQuickBooksAccessToken(): Promise<{ accessToken: string; realmId: string } | null> {
  const config = getConfig();
  
  try {
    const tokenRecords = await db.select().from(quickbooksTokens).limit(1);
    
    if (tokenRecords.length === 0) {
      return null;
    }

    const tokenRecord = tokenRecords[0];
    const now = new Date();

    if (tokenRecord.accessTokenExpiresAt <= now) {
      if (tokenRecord.refreshTokenExpiresAt <= now) {
        return null;
      }

      if (!config.clientId || !config.clientSecret) {
        return null;
      }

      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

      const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRecord.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        return null;
      }

      const tokens = await tokenResponse.json();
      
      const accessTokenExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));
      const refreshTokenExpiresAt = new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000));

      await db.update(quickbooksTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(quickbooksTokens.id, tokenRecord.id));

      return { accessToken: tokens.access_token, realmId: tokenRecord.realmId };
    }

    return { accessToken: tokenRecord.accessToken, realmId: tokenRecord.realmId };
  } catch (error) {
    console.error("Error getting QuickBooks access token:", error);
    return null;
  }
}

// Helper function to upload attachments to QuickBooks and link them to an invoice
// Following official QuickBooks Attachments API documentation format
async function uploadAttachmentToQuickBooks(
  baseUrl: string, 
  accessToken: string, 
  invoiceId: string,
  fileData: Buffer,
  fileName: string,
  contentType: string,
  attachmentIndex: number,
  totalAttachments: number
): Promise<boolean> {
  try {
    console.log(`\n>>> UPLOAD ATTACHMENT TO QUICKBOOKS <<<`);
    console.log(`Uploading attachment ${attachmentIndex} of ${totalAttachments}: ${fileName}`);
    console.log(`Target Invoice ID: ${invoiceId}`);
    console.log(`Access token present: ${accessToken ? 'YES (first 20 chars: ' + accessToken.substring(0, 20) + '...)' : 'NO'}`);
    
    // Create unique boundary string
    const boundary = `Boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Format the index with leading zero (01, 02, etc.)
    const indexStr = attachmentIndex.toString().padStart(2, '0');
    
    // Build the attachment metadata JSON per QuickBooks documentation
    const attachmentMetadata = {
      AttachableRef: [{
        EntityRef: {
          type: "Invoice",
          value: invoiceId
        },
        IncludeOnSend: true
      }],
      FileName: fileName,
      ContentType: contentType
    };
    
    console.log(`Attachment metadata:`, JSON.stringify(attachmentMetadata, null, 2));
    
    // Base64 encode the file content
    const fileBase64 = fileData.toString('base64');
    console.log(`File base64 encoded. Length: ${fileBase64.length} characters`);
    
    // Build multipart body following official QuickBooks format:
    // Part 1: Metadata with Content-Transfer-Encoding: 8bit
    // Part 2: File content with Content-Transfer-Encoding: base64
    const CRLF = '\r\n';
    
    const metadataPart = 
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file_metadata_${indexStr}"; filename="attachment.json"${CRLF}` +
      `Content-Type: application/json; charset=UTF-8${CRLF}` +
      `Content-Transfer-Encoding: 8bit${CRLF}` +
      `${CRLF}` +
      JSON.stringify(attachmentMetadata) +
      `${CRLF}`;
    
    const filePart = 
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file_content_${indexStr}"; filename="${fileName}"${CRLF}` +
      `Content-Type: ${contentType}${CRLF}` +
      `Content-Transfer-Encoding: base64${CRLF}` +
      `${CRLF}` +
      fileBase64 +
      `${CRLF}`;
    
    const endBoundary = `--${boundary}--${CRLF}`;
    
    // Combine all parts
    const body = metadataPart + filePart + endBoundary;
    
    console.log(`\nMultipart Request Structure:`);
    console.log(`  - Boundary: ${boundary}`);
    console.log(`  - Metadata part name: file_metadata_${indexStr}`);
    console.log(`  - File content part name: file_content_${indexStr}`);
    console.log(`  - Total body size: ${body.length} bytes`);
    console.log(`  - Metadata part preview:`, metadataPart.substring(0, 300) + '...');
    
    const uploadUrl = `${baseUrl}/upload`;
    console.log(`\nMaking POST request to: ${uploadUrl}`);
    console.log(`Request headers:`);
    console.log(`  - Authorization: Bearer ${accessToken.substring(0, 20)}...`);
    console.log(`  - Accept: application/json`);
    console.log(`  - Content-Type: multipart/form-data; boundary=${boundary}`);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });
    
    console.log(`\nQuickBooks API Response:`);
    console.log(`  - Status: ${uploadResponse.status} ${uploadResponse.statusText}`);
    console.log(`  - Response headers:`, Object.fromEntries(uploadResponse.headers.entries()));
    
    const responseText = await uploadResponse.text();
    console.log(`  - Response body (raw): ${responseText.substring(0, 1000)}${responseText.length > 1000 ? '...[truncated]' : ''}`);
    
    if (!uploadResponse.ok) {
      console.error(`\n!!! UPLOAD FAILED !!!`);
      console.error(`Status: ${uploadResponse.status}`);
      console.error(`Full error response: ${responseText}`);
      return false;
    }
    
    let uploadData;
    try {
      uploadData = JSON.parse(responseText);
    } catch (e) {
      console.error(`Failed to parse response as JSON: ${e}`);
      return false;
    }
    
    console.log(`\n=== UPLOAD SUCCESS ===`);
    console.log(`Full response data:`, JSON.stringify(uploadData, null, 2));
    const attachmentId = uploadData?.AttachableResponse?.[0]?.Attachable?.Id;
    console.log(`Attachment ID: ${attachmentId || 'unknown'}`);
    return true;
  } catch (error) {
    console.error(`\n!!! EXCEPTION during attachment upload !!!`);
    console.error(`Error type: ${(error as Error).name}`);
    console.error(`Error message: ${(error as Error).message}`);
    console.error(`Error stack: ${(error as Error).stack}`);
    return false;
  }
}

// Helper to fetch photo data from URL or object storage
async function fetchPhotoData(photoUrl: string): Promise<{ data: Buffer; contentType: string; fileName: string } | null> {
  console.log(`\n>>> FETCH PHOTO DATA <<<`);
  console.log(`Photo URL: ${photoUrl}`);
  console.log(`URL type: ${photoUrl.startsWith('/objects/') ? 'Object Storage Path' : 'HTTP URL'}`);
  
  try {
    const objectStorageService = new ObjectStorageService();
    
    // Check if this is an internal object storage path
    if (photoUrl.startsWith('/objects/')) {
      console.log(`Attempting to fetch from Object Storage...`);
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(photoUrl);
        console.log(`Got object file reference`);
        
        const [metadata] = await objectFile.getMetadata();
        console.log(`Metadata:`, metadata);
        
        // Download the file data
        const [data] = await objectFile.download();
        const contentType = metadata.contentType || 'image/jpeg';
        const fileName = photoUrl.split('/').pop() || 'photo.jpg';
        
        console.log(`SUCCESS: Fetched from object storage`);
        console.log(`  - File name: ${fileName}`);
        console.log(`  - Content type: ${contentType}`);
        console.log(`  - Data size: ${data.length} bytes`);
        
        return { data, contentType, fileName };
      } catch (err) {
        console.error(`FAILED to fetch from object storage: ${photoUrl}`);
        console.error(`Error:`, err);
        return null;
      }
    }
    
    // For HTTP URLs (including signed object storage URLs), fetch the data
    console.log(`Attempting HTTP fetch...`);
    const response = await fetch(photoUrl);
    console.log(`HTTP Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`FAILED to fetch photo via HTTP: ${response.status}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Extract filename from URL
    const urlParts = photoUrl.split('/');
    let fileName = urlParts[urlParts.length - 1].split('?')[0];
    if (!fileName.includes('.')) {
      const ext = contentType.split('/')[1] || 'jpg';
      fileName = `photo.${ext}`;
    }
    
    console.log(`SUCCESS: Fetched via HTTP`);
    console.log(`  - File name: ${fileName}`);
    console.log(`  - Content type: ${contentType}`);
    console.log(`  - Data size: ${data.length} bytes`);
    
    return { data, contentType, fileName };
  } catch (error) {
    console.error(`EXCEPTION fetching photo from ${photoUrl}:`);
    console.error(`Error type: ${(error as Error).name}`);
    console.error(`Error message: ${(error as Error).message}`);
    return null;
  }
}
