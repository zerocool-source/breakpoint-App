import type { Request, Response } from "express";
import { storage } from "../storage";
import { parseOfficeNotesForRepairs, extractPricesFromNotes } from "../repair-parser";

export function registerJobRoutes(app: any) {
  // ==================== JOBS ====================
  // NOTE: Pool Brain API integration removed - using internal data only
  
  // Get jobs - returns empty list (future: will return internal job data)
  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      res.json({
        jobs: [],
        accounts: [],
        technicians: [],
        techsWithJobs: [],
        techsWithoutJobs: [],
        completedJobs: [],
        pendingJobs: [],
        summary: {
          totalJobs: 0,
          completedCount: 0,
          pendingCount: 0,
          totalValue: 0,
          accountCount: 0,
          technicianCount: 0,
          techsWithJobsCount: 0
        }
      });
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({
        error: "Failed to fetch jobs",
        message: error.message
      });
    }
  });

  // Get repairs from internal tech_ops_entries
  app.get("/api/jobs/repairs", async (req: Request, res: Response) => {
    try {
      const entries = await storage.getTechOpsEntries({ entryType: "service_repairs" });
      const repairs = entries.map(entry => ({
        id: entry.id,
        serviceRepairNumber: entry.serviceRepairNumber,
        propertyId: entry.propertyId,
        propertyName: entry.propertyName,
        technicianId: entry.technicianId,
        technicianName: entry.technicianName,
        description: entry.description,
        notes: entry.notes,
        status: entry.status,
        partsCost: entry.partsCost,
        photos: entry.photos,
        createdAt: entry.createdAt,
        completedAt: entry.completedAt,
      }));
      
      res.json({
        repairs,
        summary: {
          total: repairs.length,
          pending: repairs.filter(r => r.status === "pending" || r.status === "active").length,
          completed: repairs.filter(r => r.status === "completed").length,
          converted: repairs.filter(r => r.status === "converted").length,
          totalValue: repairs.reduce((sum, r) => sum + (r.partsCost || 0), 0),
        }
      });
    } catch (error: any) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({ error: "Failed to fetch repairs", message: error.message });
    }
  });

  // Debug endpoint - disabled
  app.get("/api/jobs/debug/:jobId", async (_req: Request, res: Response) => {
    res.status(501).json({ error: "Debug endpoint disabled - Pool Brain API removed" });
  });

  // Create job endpoint - disabled
  app.post("/api/jobs/create", async (_req: Request, res: Response) => {
    res.status(501).json({ error: "Job creation via Pool Brain API disabled" });
  });
}
