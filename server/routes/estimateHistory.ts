import { Request, Response, Express } from "express";
import { z } from "zod";
import { storage } from "../storage";

const archiveDeleteSchema = z.object({
  reason: z.string().min(5, "Reason is required (minimum 5 characters)"),
  userId: z.string().optional().default("system"),
  userName: z.string().optional().default("System"),
});

const restoreSchema = z.object({
  userId: z.string().optional().default("system"),
  userName: z.string().optional().default("System"),
});

const historyFilterSchema = z.object({
  estimateId: z.string().optional(),
  actionType: z.string().optional(),
  propertyId: z.string().optional(),
  performedByUserName: z.string().optional(),
  approvalMethod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export function registerEstimateHistoryRoutes(app: Express) {
  // Get all history logs with filters
  app.get("/api/estimate-history", async (req: Request, res: Response) => {
    try {
      const validation = historyFilterSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid filter parameters", details: validation.error.flatten() });
      }
      
      const { estimateId, actionType, propertyId, performedByUserName, approvalMethod, startDate, endDate } = validation.data;
      
      const filters: any = {};
      if (estimateId) filters.estimateId = estimateId;
      if (actionType) filters.actionType = actionType;
      if (propertyId) filters.propertyId = propertyId;
      if (performedByUserName) filters.performedByUserName = performedByUserName;
      if (approvalMethod) filters.approvalMethod = approvalMethod;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      
      const logs = await storage.getEstimateHistoryLogs(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching estimate history logs:", error);
      res.status(500).json({ error: "Failed to fetch history logs" });
    }
  });

  // Get history for a specific estimate
  app.get("/api/estimate-history/:estimateId", async (req: Request, res: Response) => {
    try {
      const { estimateId } = req.params;
      if (!estimateId) {
        return res.status(400).json({ error: "Estimate ID is required" });
      }
      const logs = await storage.getEstimateHistory(estimateId);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching estimate history:", error);
      res.status(500).json({ error: "Failed to fetch estimate history" });
    }
  });

  // Get history metrics
  app.get("/api/estimate-history-metrics", async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getEstimateHistoryMetrics();
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching history metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Archive an estimate with reason (atomic transaction)
  app.post("/api/estimates/:id/archive", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = archiveDeleteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { reason, userId, userName } = validation.data;
      
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const estimate = await storage.archiveEstimateWithHistory(
        id, 
        existingEstimate, 
        userId, 
        userName, 
        reason.trim()
      );
      
      res.json({ estimate, message: "Estimate archived successfully" });
    } catch (error: any) {
      console.error("Error archiving estimate:", error);
      res.status(500).json({ error: "Failed to archive estimate" });
    }
  });

  // Soft delete an estimate with reason (atomic transaction)
  app.post("/api/estimates/:id/soft-delete", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = archiveDeleteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { reason, userId, userName } = validation.data;
      
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const estimate = await storage.softDeleteEstimateWithHistory(
        id, 
        existingEstimate, 
        userId, 
        userName, 
        reason.trim()
      );
      
      res.json({ estimate, message: "Estimate deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting estimate:", error);
      res.status(500).json({ error: "Failed to delete estimate" });
    }
  });

  // Restore a deleted/archived estimate (atomic transaction)
  app.post("/api/estimates/:id/restore", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = restoreSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { userId, userName } = validation.data;
      
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const estimate = await storage.restoreEstimateWithHistory(id, existingEstimate, userId, userName);
      
      res.json({ estimate, message: "Estimate restored successfully" });
    } catch (error: any) {
      console.error("Error restoring estimate:", error);
      res.status(500).json({ error: "Failed to restore estimate" });
    }
  });

  // Export history as CSV
  app.get("/api/estimate-history/export/csv", async (req: Request, res: Response) => {
    try {
      const validation = historyFilterSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid filter parameters" });
      }
      
      const { estimateId, actionType, propertyId, startDate, endDate } = validation.data;
      
      const filters: any = {};
      if (estimateId) filters.estimateId = estimateId;
      if (actionType) filters.actionType = actionType;
      if (propertyId) filters.propertyId = propertyId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      
      const logs = await storage.getEstimateHistoryLogs(Object.keys(filters).length > 0 ? filters : undefined);
      
      // Build CSV
      const headers = ["Estimate Number", "Property Name", "Customer Name", "Value", "Action", "Performed By", "Date/Time", "Approval Method", "Approver Name", "Approver Title", "Reason", "Previous Status", "New Status"];
      const rows = logs.map(log => [
        log.estimateNumber || "",
        log.propertyName || "",
        log.customerName || "",
        log.estimateValue ? (log.estimateValue / 100).toFixed(2) : "",
        log.actionType,
        log.performedByUserName || "",
        log.performedAt ? new Date(log.performedAt).toISOString() : "",
        log.approvalMethod || "",
        log.approverName || "",
        log.approverTitle || "",
        log.reason || "",
        log.previousStatus || "",
        log.newStatus || "",
      ]);
      
      const csv = [headers.join(","), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=estimate-history-${new Date().toISOString().split("T")[0]}.csv`);
      res.send(csv);
    } catch (error: any) {
      console.error("Error exporting history:", error);
      res.status(500).json({ error: "Failed to export history" });
    }
  });
}
