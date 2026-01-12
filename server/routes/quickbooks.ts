import { Request, Response, Express } from "express";
import { db } from "../db";
import { quickbooksTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

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
      const { customerName, lineItems, memo } = req.body;
      
      if (!customerName || !lineItems || !Array.isArray(lineItems)) {
        return res.status(400).json({ error: "Missing required fields: customerName, lineItems" });
      }

      const auth = await getQuickBooksAccessToken();
      if (!auth) {
        return res.status(401).json({ error: "QuickBooks not connected or token expired" });
      }

      const { accessToken, realmId } = auth;
      const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;

      let customerId = await findOrCreateCustomer(baseUrl, accessToken, customerName);

      const invoiceLines = lineItems.map((item: any, index: number) => ({
        LineNum: index + 1,
        Amount: item.amount / 100,
        DetailType: "SalesItemLineDetail",
        Description: item.description || item.productService,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.rate / 100,
        },
      }));

      const invoicePayload = {
        CustomerRef: { value: customerId },
        Line: invoiceLines,
        PrivateNote: memo || undefined,
      };

      const invoiceResponse = await fetch(`${baseUrl}/invoice`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoicePayload),
      });

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.text();
        console.error("QuickBooks invoice creation failed:", errorData);
        return res.status(400).json({ error: "Failed to create invoice in QuickBooks", details: errorData });
      }

      const invoiceData = await invoiceResponse.json();
      const invoice = invoiceData.Invoice;

      res.json({
        success: true,
        invoiceId: invoice.Id,
        invoiceNumber: invoice.DocNumber,
        totalAmount: invoice.TotalAmt,
      });
    } catch (error) {
      console.error("QuickBooks invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });
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
