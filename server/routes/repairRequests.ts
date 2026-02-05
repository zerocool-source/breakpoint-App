import { Request, Response } from "express";
import { storage } from "../storage";
import { insertRepairRequestSchema, urgentNotifications } from "@shared/schema";
import { db } from "../db";

export function registerRepairRequestRoutes(app: any) {
  app.get("/api/repair-requests", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getRepairRequests(status);
      res.json({ requests });
    } catch (error) {
      console.error("Error fetching repair requests:", error);
      res.status(500).json({ error: "Failed to fetch repair requests" });
    }
  });

  app.get("/api/repair-requests/:id", async (req: Request, res: Response) => {
    try {
      const request = await storage.getRepairRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Repair request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching repair request:", error);
      res.status(500).json({ error: "Failed to fetch repair request" });
    }
  });

  app.post("/api/repair-requests", async (req: Request, res: Response) => {
    try {
      // Convert date strings to Date objects for timestamp fields
      const body = { ...req.body };
      if (body.assignedDate && typeof body.assignedDate === 'string') {
        body.assignedDate = new Date(body.assignedDate);
      }
      if (body.requestDate && typeof body.requestDate === 'string') {
        body.requestDate = new Date(body.requestDate);
      }
      
      const parsed = insertRepairRequestSchema.safeParse(body);
      if (!parsed.success) {
        console.error("Validation errors:", parsed.error.errors);
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const request = await storage.createRepairRequest(parsed.data);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating repair request:", error);
      res.status(500).json({ error: "Failed to create repair request" });
    }
  });

  app.patch("/api/repair-requests/:id", async (req: Request, res: Response) => {
    try {
      // Convert date strings to Date objects for timestamp fields
      const body = { ...req.body };
      if (body.assignedDate && typeof body.assignedDate === 'string') {
        body.assignedDate = new Date(body.assignedDate);
      }
      if (body.requestDate && typeof body.requestDate === 'string') {
        body.requestDate = new Date(body.requestDate);
      }
      
      const request = await storage.updateRepairRequest(req.params.id, body);
      if (!request) {
        return res.status(404).json({ error: "Repair request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error updating repair request:", error);
      res.status(500).json({ error: "Failed to update repair request" });
    }
  });

  app.post("/api/repair-requests/:id/assign", async (req: Request, res: Response) => {
    try {
      const { technicianId, technicianName, scheduledDate, scheduledTime, notes } = req.body;
      if (!technicianId || !technicianName) {
        return res.status(400).json({ error: "technicianId and technicianName are required" });
      }

      const request = await storage.updateRepairRequest(req.params.id, {
        assignedTechId: technicianId,
        assignedTechName: technicianName,
        assignedDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        scheduledTime: scheduledTime || null,
        assignmentNotes: notes || null,
        status: "assigned",
      });

      if (!request) {
        return res.status(404).json({ error: "Repair request not found" });
      }

      // Create notification for the assigned technician
      try {
        const formattedDate = scheduledDate
          ? new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : 'Today';
        const formattedTime = scheduledTime || '';

        await db.insert(urgentNotifications).values({
          title: "New Repair Assignment",
          message: `You have been assigned a repair at ${request.propertyName || request.poolName || 'a property'}. Scheduled: ${formattedDate}${formattedTime ? ' at ' + formattedTime : ''}.`,
          severity: "info",
          targetRole: "repair",
          targetUserId: technicianId,
          relatedEntityType: "repair_request",
          relatedEntityId: req.params.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
        console.log(`[NOTIFICATION] Repair ${req.params.id} assigned to ${technicianName} (${technicianId})`);
      } catch (notifError) {
        // Don't fail the assignment if notification fails
        console.error("Failed to create notification:", notifError);
      }

      res.json(request);
    } catch (error) {
      console.error("Error assigning repair request:", error);
      res.status(500).json({ error: "Failed to assign repair request" });
    }
  });

  app.delete("/api/repair-requests/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteRepairRequest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting repair request:", error);
      res.status(500).json({ error: "Failed to delete repair request" });
    }
  });
}
