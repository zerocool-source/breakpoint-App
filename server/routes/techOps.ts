import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertTechOpsEntrySchema } from "@shared/schema";

export function registerTechOpsRoutes(app: Express) {
  app.get("/api/tech-ops", async (req: Request, res: Response) => {
    try {
      const { entryType, status, propertyId, technicianName, startDate, endDate, priority } = req.query;
      const entries = await storage.getTechOpsEntries({
        entryType: entryType as string | undefined,
        status: status as string | undefined,
        propertyId: propertyId as string | undefined,
        technicianName: technicianName as string | undefined,
        priority: priority as string | undefined,
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

  app.post("/api/tech-ops/:id/archive", async (req: Request, res: Response) => {
    try {
      const entry = await storage.updateTechOpsEntry(req.params.id, { status: "archived" });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error archiving tech ops entry:", error);
      res.status(500).json({ error: "Failed to archive tech ops entry" });
    }
  });

  // Get unread counts by entry type for badge notifications
  app.get("/api/tech-ops/unread-counts", async (req: Request, res: Response) => {
    try {
      const counts = await storage.getTechOpsUnreadCounts();
      res.json(counts);
    } catch (error: any) {
      console.error("Error fetching unread counts:", error);
      res.status(500).json({ error: "Failed to fetch unread counts" });
    }
  });

  // Mark an entry as read
  app.post("/api/tech-ops/:id/mark-read", async (req: Request, res: Response) => {
    try {
      const entry = await storage.updateTechOpsEntry(req.params.id, { isRead: true });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error marking entry as read:", error);
      res.status(500).json({ error: "Failed to mark entry as read" });
    }
  });

  // Mark all entries of a type as read
  app.post("/api/tech-ops/mark-all-read", async (req: Request, res: Response) => {
    try {
      const { entryType } = req.body;
      await storage.markAllTechOpsRead(entryType);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking entries as read:", error);
      res.status(500).json({ error: "Failed to mark entries as read" });
    }
  });

  app.post("/api/tech-ops/:id/convert-to-estimate", async (req: Request, res: Response) => {
    try {
      const { urgent } = req.body;
      const entry = await storage.getTechOpsEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      const estimateNumber = `EST-${Date.now().toString(36).toUpperCase()}`;
      const tags = urgent ? ["URGENT"] : [];

      const estimate = await storage.createEstimate({
        propertyId: entry.propertyId || "",
        propertyName: entry.propertyName || "Unknown Property",
        title: `Repair Request - ${entry.propertyName || "Unknown"}`,
        description: entry.description || "",
        estimateNumber,
        status: "draft",
        tags,
        items: [],
        subtotal: "0",
        taxRate: "0",
        total: "0",
      });

      await storage.updateTechOpsEntry(req.params.id, { status: "completed" });

      res.json(estimate);
    } catch (error: any) {
      console.error("Error converting tech ops entry to estimate:", error);
      res.status(500).json({ error: "Failed to convert to estimate" });
    }
  });
}
