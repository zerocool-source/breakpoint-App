import { Request, Response, Express } from "express";
import { db } from "../db";
import { quickbooksTokens, invoices, estimates } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
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
      } = req.body;
      
      console.log("=== QuickBooks Invoice Creation Request ===");
      console.log("Customer Name:", customerName);
      console.log("Line Items:", JSON.stringify(lineItems, null, 2));
      console.log("Estimate ID:", estimateId);
      console.log("Memo:", memo);
      
      if (!customerName || !lineItems || !Array.isArray(lineItems)) {
        console.error("Missing required fields");
        return res.status(400).json({ error: "Missing required fields: customerName, lineItems" });
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

      const invoicePayload = {
        CustomerRef: { value: customerId },
        Line: invoiceLines,
        PrivateNote: memo || undefined,
      };

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
        message: totalAttachments > 0 
          ? `Invoice Created! QB Invoice ID: ${qbInvoice.Id} | ${uploadedAttachments} attachment${uploadedAttachments !== 1 ? 's' : ''} uploaded${failedAttachments.length > 0 ? ` (${failedAttachments.length} failed)` : ''}`
          : `Invoice Created! QB Invoice ID: ${qbInvoice.Id}`,
      });
    } catch (error) {
      console.error("QuickBooks invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });
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
