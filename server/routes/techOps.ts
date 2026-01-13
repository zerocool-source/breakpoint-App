import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertTechOpsEntrySchema } from "@shared/schema";

export function registerTechOpsRoutes(app: Express) {
  app.get("/api/tech-ops", async (req: Request, res: Response) => {
    try {
      const { entryType, status, propertyId, technicianName, startDate, endDate } = req.query;
      const entries = await storage.getTechOpsEntries({
        entryType: entryType as string | undefined,
        status: status as string | undefined,
        propertyId: propertyId as string | undefined,
        technicianName: technicianName as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching tech ops entries:", error);
      res.status(500).json({ error: "Failed to fetch tech ops entries" });
    }
  });

  app.get("/api/tech-ops/summary", async (req: Request, res: Response) => {
    try {
      const { propertyId, technicianName, startDate, endDate } = req.query;
      const summary = await storage.getTechOpsSummary({
        propertyId: propertyId as string | undefined,
        technicianName: technicianName as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching tech ops summary:", error);
      res.status(500).json({ error: "Failed to fetch tech ops summary" });
    }
  });

  app.get("/api/tech-ops/:id", async (req: Request, res: Response) => {
    try {
      const entry = await storage.getTechOpsEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error fetching tech ops entry:", error);
      res.status(500).json({ error: "Failed to fetch tech ops entry" });
    }
  });

  app.post("/api/tech-ops", async (req: Request, res: Response) => {
    try {
      const parsed = insertTechOpsEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const entry = await storage.createTechOpsEntry(parsed.data);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating tech ops entry:", error);
      res.status(500).json({ error: "Failed to create tech ops entry" });
    }
  });

  app.put("/api/tech-ops/:id", async (req: Request, res: Response) => {
    try {
      const parsed = insertTechOpsEntrySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const entry = await storage.updateTechOpsEntry(req.params.id, parsed.data);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error updating tech ops entry:", error);
      res.status(500).json({ error: "Failed to update tech ops entry" });
    }
  });

  app.post("/api/tech-ops/:id/review", async (req: Request, res: Response) => {
    try {
      const { reviewedBy } = req.body;
      if (!reviewedBy) {
        return res.status(400).json({ error: "reviewedBy is required" });
      }
      const entry = await storage.markTechOpsReviewed(req.params.id, reviewedBy);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error reviewing tech ops entry:", error);
      res.status(500).json({ error: "Failed to review tech ops entry" });
    }
  });

  app.delete("/api/tech-ops/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteTechOpsEntry(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting tech ops entry:", error);
      res.status(500).json({ error: "Failed to delete tech ops entry" });
    }
  });
}
