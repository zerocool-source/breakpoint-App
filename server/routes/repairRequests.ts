import { Request, Response } from "express";
import { storage } from "../storage";
import { insertRepairRequestSchema, urgentNotifications } from "@shared/schema";
import { db } from "../db";

export function registerRepairRequestRoutes(app: any) {
  app.get("/api/repair-requests", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const assignedTechId = req.query.assignedTechId as string | undefined;
      const technicianEmail = req.query.technicianEmail as string | undefined;
      const technicianName = req.query.technicianName as string | undefined;

      let requests = await storage.getRepairRequests(status);

      // Filter by assignedTechId if provided
      if (assignedTechId) {
        requests = requests.filter(req => req.assignedTechId === assignedTechId);
      }

      // Filter by technicianEmail if provided (for cross-system lookups)
      if (technicianEmail) {
        // Find technician by email to get their ID
        const technicians = await storage.getTechnicians();
        const tech = technicians.find((t: any) =>
          t.email?.toLowerCase() === technicianEmail.toLowerCase()
        );
        if (tech) {
          requests = requests.filter(req => req.assignedTechId === tech.id);
        } else {
          requests = []; // No matching technician found
        }
      }

      // Filter by technicianName if provided
      if (technicianName) {
        requests = requests.filter(req =>
          req.assignedTechName?.toLowerCase().includes(technicianName.toLowerCase())
        );
      }

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

      // Create notification for the assigned technician (admin app database)
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

      // Forward job assignment to mobile app so technicians can see it
      const mobileAppUrl = process.env.MOBILE_APP_URL || "https://breakpoint-moibile.replit.app";
      const webhookKey = process.env.MOBILE_API_KEY || process.env.ADMIN_WEBHOOK_KEY;

      if (webhookKey) {
        try {
          console.log("[Assign] Forwarding repair assignment to mobile app:", mobileAppUrl);
          const webhookPayload = {
            jobId: req.params.id,
            jobNumber: `RR-${req.params.id.substring(0, 8)}`,
            propertyId: request.propertyId,
            propertyName: request.propertyName || request.poolName,
            propertyAddress: request.propertyAddress || '',
            technicianId: technicianId,
            technicianName: technicianName,
            scheduledDate: scheduledDate,
            description: request.issueTitle || request.notes || 'Repair Request',
            notes: notes || request.notes || '',
            priority: request.priority || 'medium',
            status: 'pending',
          };

          const webhookRes = await fetch(`${mobileAppUrl}/api/webhook/job-assignment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Api-Key': webhookKey,
            },
            body: JSON.stringify(webhookPayload),
          });

          if (webhookRes.ok) {
            console.log("[Assign] Successfully forwarded repair to mobile app");
          } else {
            const errorText = await webhookRes.text();
            console.error("[Assign] Mobile webhook error:", webhookRes.status, errorText);
          }
        } catch (webhookError) {
          console.error("[Assign] Failed to forward to mobile app:", webhookError);
          // Don't fail the main request - admin assignment was successful
        }
      } else {
        console.warn("[Assign] MOBILE_API_KEY not set - repair not forwarded to mobile app");
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
