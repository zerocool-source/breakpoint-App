import { Request, Response, Express } from "express";
import { db } from "../db";
import { quickbooksTokens, invoices, estimates } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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

      // If this is from an estimate, update the estimate with the invoice ID
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
