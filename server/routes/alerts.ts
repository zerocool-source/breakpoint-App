import type { Request, Response } from "express";
import { storage } from "../storage";
import { OutlookGraphClient } from "../outlook-graph";

export function registerAlertRoutes(app: any) {
  // ==================== OUTLOOK INTEGRATION ====================
  
  // Create Outlook draft via Microsoft Graph API
  app.post("/api/outlook/create-draft", async (req: Request, res: Response) => {
    try {
      const { subject, to, cc, body } = req.body;

      const tenantId = process.env.AZURE_TENANT_ID;
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const userEmail = process.env.OUTLOOK_USER_EMAIL;

      if (!tenantId || !clientId || !clientSecret || !userEmail) {
        return res.status(400).json({ 
          error: "Microsoft Graph not configured",
          message: "Azure credentials are required for full Outlook integration",
          fallback: true
        });
      }

      const client = new OutlookGraphClient({
        tenantId,
        clientId,
        clientSecret,
        userEmail,
      });

      const draft = await client.createDraft({
        to: to || 'pmtorder@awspoolsupply.com',
        cc: cc || 'Jesus@awspoolsupply.com',
        subject: subject || 'Alpha Chemical Order',
        body: body || '',
      });

      if (!draft) {
        return res.status(500).json({ 
          error: "Failed to create draft",
          fallback: true
        });
      }

      res.json({ 
        success: true,
        draftId: draft.draftId,
        webLink: draft.webLink,
      });
    } catch (error: any) {
      console.error("Error creating Outlook draft:", error);
      res.status(500).json({ 
        error: "Failed to create Outlook draft",
        message: error.message,
        fallback: true
      });
    }
  });

  // Legacy: Create Outlook compose link (fallback)
  app.post("/api/open-outlook", async (req: Request, res: Response) => {
    try {
      const { subject, to, cc, emailText } = req.body;

      const params = new URLSearchParams();
      if (to) params.append('to', to);
      if (cc) params.append('cc', cc);
      if (subject) params.append('subject', subject);
      if (emailText) params.append('body', emailText);

      const outlookUri = `ms-outlook://compose?${params.toString()}`;

      res.json({ 
        outlookUri,
        success: true 
      });
    } catch (error: any) {
      console.error("Error creating Outlook link:", error);
      res.status(500).json({ error: "Failed to create Outlook link" });
    }
  });

  // ==================== DEPRECATED ALERT ENDPOINTS ====================
  // These endpoints are kept for backwards compatibility but return empty data
  // All data now comes from tech_ops_entries via /api/tech-ops endpoints

  app.get("/api/alerts/enriched", async (_req: Request, res: Response) => {
    res.json({ alerts: [] });
  });

  app.get("/api/alerts_full", async (_req: Request, res: Response) => {
    res.json({ alerts: [] });
  });

  app.get("/api/alerts/completed", async (_req: Request, res: Response) => {
    res.json({ completedIds: [] });
  });

  app.get("/api/alerts/archived", async (_req: Request, res: Response) => {
    res.json({ archivedIds: [] });
  });
}
