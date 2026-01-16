import { Request, Response, Express } from "express";
import { storage } from "../storage";

export function registerEstimateHistoryRoutes(app: Express) {
  // Get all history logs with filters
  app.get("/api/estimate-history", async (req: Request, res: Response) => {
    try {
      const { estimateId, actionType, propertyId, performedByUserName, approvalMethod, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (estimateId) filters.estimateId = estimateId as string;
      if (actionType) filters.actionType = actionType as string;
      if (propertyId) filters.propertyId = propertyId as string;
      if (performedByUserName) filters.performedByUserName = performedByUserName as string;
      if (approvalMethod) filters.approvalMethod = approvalMethod as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
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

  // Archive an estimate with reason
  app.post("/api/estimates/:id/archive", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, userId, userName } = req.body;
      
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: "Archive reason is required (minimum 5 characters)" });
      }
      
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const estimate = await storage.archiveEstimate(id, userId || "system", userName || "System", reason.trim());
      
      // Log the action
      await storage.createEstimateHistoryLog({
        estimateId: id,
        estimateNumber: existingEstimate.estimateNumber,
        propertyId: existingEstimate.propertyId,
        propertyName: existingEstimate.propertyName,
        customerId: null,
        customerName: existingEstimate.customerName,
        estimateValue: existingEstimate.totalAmount,
        actionType: "archived",
        actionDescription: `Estimate archived: ${reason.trim()}`,
        performedByUserId: userId || "system",
        performedByUserName: userName || "System",
        performedAt: new Date(),
        previousStatus: existingEstimate.status,
        newStatus: "archived",
        reason: reason.trim(),
      });
      
      res.json({ estimate, message: "Estimate archived successfully" });
    } catch (error: any) {
      console.error("Error archiving estimate:", error);
      res.status(500).json({ error: "Failed to archive estimate" });
    }
  });

  // Soft delete an estimate with reason
  app.post("/api/estimates/:id/soft-delete", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, userId, userName } = req.body;
      
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: "Delete reason is required (minimum 5 characters)" });
      }
      
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const estimate = await storage.softDeleteEstimate(id, userId || "system", userName || "System", reason.trim());
      
      // Log the action
      await storage.createEstimateHistoryLog({
        estimateId: id,
        estimateNumber: existingEstimate.estimateNumber,
        propertyId: existingEstimate.propertyId,
        propertyName: existingEstimate.propertyName,
        customerId: null,
        customerName: existingEstimate.customerName,
        estimateValue: existingEstimate.totalAmount,
        actionType: "deleted",
        actionDescription: `Estimate deleted: ${reason.trim()}`,
        performedByUserId: userId || "system",
        performedByUserName: userName || "System",
        performedAt: new Date(),
        previousStatus: existingEstimate.status,
        newStatus: "deleted",
        reason: reason.trim(),
      });
      
      res.json({ estimate, message: "Estimate deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting estimate:", error);
      res.status(500).json({ error: "Failed to delete estimate" });
    }
  });

  // Restore a deleted/archived estimate
  app.post("/api/estimates/:id/restore", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, userName } = req.body;
      
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const estimate = await storage.restoreEstimate(id);
      
      // Log the action
      await storage.createEstimateHistoryLog({
        estimateId: id,
        estimateNumber: existingEstimate.estimateNumber,
        propertyId: existingEstimate.propertyId,
        propertyName: existingEstimate.propertyName,
        customerId: null,
        customerName: existingEstimate.customerName,
        estimateValue: existingEstimate.totalAmount,
        actionType: "restored",
        actionDescription: "Estimate restored",
        performedByUserId: userId || "system",
        performedByUserName: userName || "System",
        performedAt: new Date(),
        previousStatus: existingEstimate.status,
        newStatus: "draft",
      });
      
      res.json({ estimate, message: "Estimate restored successfully" });
    } catch (error: any) {
      console.error("Error restoring estimate:", error);
      res.status(500).json({ error: "Failed to restore estimate" });
    }
  });

  // Export history as CSV
  app.get("/api/estimate-history/export/csv", async (req: Request, res: Response) => {
    try {
      const { estimateId, actionType, propertyId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (estimateId) filters.estimateId = estimateId as string;
      if (actionType) filters.actionType = actionType as string;
      if (propertyId) filters.propertyId = propertyId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
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
