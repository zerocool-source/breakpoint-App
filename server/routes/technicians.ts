import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";
import { db } from "../db";
import { technicians } from "@shared/schema";
import { eq } from "drizzle-orm";

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
      
      // When assigning to a supervisor, inherit the supervisor's region
      if (updates.supervisorId !== undefined && updates.supervisorId !== null) {
        const supervisor = await storage.getTechnician(updates.supervisorId);
        if (!supervisor) {
          return res.status(400).json({ error: "Supervisor not found" });
        }
        if (supervisor.role !== "supervisor") {
          return res.status(400).json({ error: "Target technician is not a supervisor" });
        }
        // Inherit region from supervisor (or null if supervisor has no region)
        updates.region = supervisor.region || null;
      }
      
      // When removing from supervisor (supervisorId set to null), technician keeps their current region
      // (no action needed - they retain existing region value)
      
      // Check if this is a supervisor and their region is being updated
      const currentTechnician = await storage.getTechnician(id);
      if (currentTechnician?.role === "supervisor" && updates.region !== undefined) {
        // Use transaction for atomic region cascade to all team members
        await db.transaction(async (tx: typeof db) => {
          // Get all team members
          const allTechnicians = await storage.getTechnicians();
          const teamMembers = allTechnicians.filter((t: { supervisorId: string | null }) => t.supervisorId === id);
          
          // Update all team members' region atomically
          for (const member of teamMembers) {
            await tx.update(technicians)
              .set({ region: updates.region || null })
              .where(eq(technicians.id, member.id));
          }
          
          // Update the supervisor's region
          await tx.update(technicians)
            .set({ region: updates.region || null, ...updates })
            .where(eq(technicians.id, id));
        });
        
        const updatedTechnician = await storage.getTechnician(id);
        return res.json({ success: true, technician: updatedTechnician });
      }
      
      // Standard update for non-supervisor or non-region changes
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

  // Technician Notes CRUD
  app.get('/api/technicians/:id/notes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const notes = await storage.getTechnicianNotes(id);
      res.json({ notes });
    } catch (error: any) {
      console.error('Error fetching technician notes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/technicians/:id/notes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, createdBy } = req.body;
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Note content is required and cannot be empty" });
      }
      
      const note = await storage.createTechnicianNote({ 
        technicianId: id, 
        content: content.trim(), 
        createdBy: createdBy || null 
      });
      res.json({ note });
    } catch (error: any) {
      console.error('Error creating technician note:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/technician-notes/:noteId', async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      const { content } = req.body;
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Note content is required and cannot be empty" });
      }
      
      const note = await storage.updateTechnicianNote(noteId, content.trim());
      res.json({ note });
    } catch (error: any) {
      console.error('Error updating technician note:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/technician-notes/:noteId', async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      await storage.deleteTechnicianNote(noteId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting technician note:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
