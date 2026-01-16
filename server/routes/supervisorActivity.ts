import type { Express } from "express";
import { storage } from "../storage";
import { insertSupervisorActivitySchema } from "@shared/schema";
import { format } from "date-fns";

export function registerSupervisorActivityRoutes(app: Express) {
  // Get all supervisor activity with optional filters
  app.get("/api/supervisor-activity", async (req, res) => {
    try {
      const { supervisorId, actionType, propertyId, technicianId, startDate, endDate, limit, offset } = req.query;
      
      const filters: any = {};
      if (supervisorId) filters.supervisorId = supervisorId as string;
      if (actionType) filters.actionType = actionType as string;
      if (propertyId) filters.propertyId = propertyId as string;
      if (technicianId) filters.technicianId = technicianId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string, 10);
      if (offset) filters.offset = parseInt(offset as string, 10);

      const activities = await storage.getSupervisorActivity(filters);
      res.json({ activities });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch supervisor activity" });
    }
  });

  // Get supervisor profile metrics
  app.get("/api/supervisors/:supervisorId/metrics", async (req, res) => {
    try {
      const { supervisorId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const metrics = await storage.getSupervisorMetrics(supervisorId, start, end);
      res.json({ metrics });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch supervisor metrics" });
    }
  });

  // Get supervisor profile with activity log
  app.get("/api/supervisors/:supervisorId/profile", async (req, res) => {
    try {
      const { supervisorId } = req.params;
      const { startDate, endDate, actionType, limit = "50" } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Get metrics
      const metrics = await storage.getSupervisorMetrics(supervisorId, start, end);
      
      // Get recent activity
      const filters: any = {
        supervisorId,
        limit: parseInt(limit as string, 10),
      };
      if (actionType && actionType !== 'all') filters.actionType = actionType as string;
      if (start) filters.startDate = start;
      if (end) filters.endDate = end;
      
      const activity = await storage.getSupervisorActivity(filters);

      res.json({ metrics, activity });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch supervisor profile" });
    }
  });

  // Create supervisor activity entry
  app.post("/api/supervisor-activity", async (req, res) => {
    try {
      const parsed = insertSupervisorActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid activity data", details: parsed.error.errors });
      }
      
      const activity = await storage.createSupervisorActivity(parsed.data);
      res.status(201).json({ activity });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create supervisor activity" });
    }
  });

  // Export supervisor activity as CSV
  app.get("/api/supervisors/:supervisorId/activity/export", async (req, res) => {
    try {
      const { supervisorId } = req.params;
      const { startDate, endDate, actionType } = req.query;
      
      const filters: any = { supervisorId };
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (actionType && actionType !== 'all') filters.actionType = actionType as string;

      const activities = await storage.getSupervisorActivity(filters);
      
      // Build CSV
      const headers = ["Date", "Action", "Property", "Technician", "Notes"];
      const rows = activities.map(a => [
        a.createdAt ? format(new Date(a.createdAt), "yyyy-MM-dd HH:mm") : "-",
        formatActionType(a.actionType),
        a.propertyName || "-",
        a.technicianName || "-",
        (a.notes || "-").replace(/"/g, '""')
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="supervisor-activity-${supervisorId}-${format(new Date(), "yyyy-MM-dd")}.csv"`);
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to export supervisor activity" });
    }
  });
}

function formatActionType(type: string): string {
  switch (type) {
    case 'checked_out': return 'Inspected Property';
    case 'assignment_created': return 'Assignment Created';
    case 'resolved_not_completed': return 'Not Completed Resolved';
    case 'resolved_need_assistance': return 'Need Assistance Resolved';
    case 'dismissed': return 'Dismissed';
    default: return type;
  }
}
