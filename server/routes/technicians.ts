import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";

export function registerTechnicianRoutes(app: any) {
  app.get("/api/technicians", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const techsData = await client.getTechnicianDetail({ limit: 500 });
      
      const technicians = (techsData.data || []).map((t: any) => ({
        id: t.RecordID,
        name: t.Name || `${t.FirstName || ''} ${t.LastName || ''}`.trim() || "Unknown",
        firstName: t.FirstName || t.Name?.split(' ')[0] || "Unknown",
        lastName: t.LastName || t.Name?.split(' ').slice(1).join(' ') || "",
        role: t.Role || "service",
        active: t.Active !== false && t.Active !== 0 && t.Active !== "0",
      }));

      res.json({ technicians });
    } catch (error: any) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians", message: error.message });
    }
  });

  app.get("/api/technicians/poolbrain", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const techsData = await client.getTechnicianDetail({ limit: 500 });
      const technicians = (techsData.data || []).map((t: any) => ({
        TechnicianID: t.RecordID || t.TechnicianID,
        FirstName: t.FirstName || "",
        LastName: t.LastName || "",
        Phone: t.Phone || t.CellPhone || "",
        Email: t.Email || "",
        Active: t.Active !== false && t.Active !== 0,
        CompanyID: t.CompanyID,
      }));

      res.json({ technicians });
    } catch (error: any) {
      console.error("Error fetching technicians from Pool Brain:", error);
      res.status(500).json({ error: "Failed to fetch technicians", message: error.message });
    }
  });

  app.post("/api/technicians/sync", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const techsData = await client.getTechnicianDetail({ limit: 500 });
      const techList = techsData.data || [];

      let synced = 0;
      for (const t of techList) {
        const externalId = String(t.RecordID || t.TechnicianID);
        await storage.upsertTechnician(externalId, {
          externalId,
          firstName: t.FirstName || "",
          lastName: t.LastName || "",
          phone: t.Phone || t.CellPhone || "",
          email: t.Email || "",
          role: "service",
          active: t.Active !== false && t.Active !== 0,
        });
        synced++;
      }

      res.json({ success: true, synced, message: `Synced ${synced} technicians from Pool Brain` });
    } catch (error: any) {
      console.error("Error syncing technicians:", error);
      res.status(500).json({ error: "Failed to sync technicians", message: error.message });
    }
  });

  app.get("/api/technicians/stored", async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string | undefined;
      const technicians = await storage.getTechnicians(role);
      res.json({ technicians });
    } catch (error: any) {
      console.error("Error fetching stored technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians", message: error.message });
    }
  });

  app.post("/api/technicians/add", async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, phone, email, role, active } = req.body;
      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }
      const technician = await storage.createTechnician({
        firstName,
        lastName,
        phone: phone || null,
        email: email || null,
        role: role || "service",
        active: active !== false,
      });
      res.json({ success: true, technician });
    } catch (error: any) {
      console.error("Error adding technician:", error);
      res.status(500).json({ error: "Failed to add technician", message: error.message });
    }
  });

  app.patch("/api/technicians/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.supervisorId !== undefined && updates.supervisorId !== null) {
        const supervisor = await storage.getTechnician(updates.supervisorId);
        if (!supervisor) {
          return res.status(400).json({ error: "Supervisor not found" });
        }
        if (supervisor.role !== "supervisor") {
          return res.status(400).json({ error: "Target technician is not a supervisor" });
        }
      }
      
      const technician = await storage.updateTechnician(id, updates);
      if (!technician) {
        return res.status(404).json({ error: "Technician not found" });
      }
      res.json({ success: true, technician });
    } catch (error: any) {
      console.error("Error updating technician:", error);
      res.status(500).json({ error: "Failed to update technician", message: error.message });
    }
  });

  app.delete("/api/technicians/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteTechnician(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting technician:", error);
      res.status(500).json({ error: "Failed to delete technician", message: error.message });
    }
  });

  app.get('/api/technicians/:id/entries', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const entries = await storage.getFieldEntriesByTechnician(id);
      res.json({ entries });
    } catch (error: any) {
      console.error('Error fetching technician entries:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
