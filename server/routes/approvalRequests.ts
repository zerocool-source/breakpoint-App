import { Request, Response } from "express";
import { storage } from "../storage";
import { insertApprovalRequestSchema } from "@shared/schema";

export function registerApprovalRequestRoutes(app: any) {
  app.get("/api/approval-requests", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getApprovalRequests(status);
      res.json({ approvalRequests: requests });
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      res.status(500).json({ error: "Failed to fetch approval requests" });
    }
  });

  app.get("/api/approval-requests/:id", async (req: Request, res: Response) => {
    try {
      const request = await storage.getApprovalRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching approval request:", error);
      res.status(500).json({ error: "Failed to fetch approval request" });
    }
  });

  app.post("/api/approval-requests", async (req: Request, res: Response) => {
    try {
      const parsed = insertApprovalRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const request = await storage.createApprovalRequest(parsed.data);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating approval request:", error);
      res.status(500).json({ error: "Failed to create approval request" });
    }
  });

  app.patch("/api/approval-requests/:id", async (req: Request, res: Response) => {
    try {
      const request = await storage.updateApprovalRequest(req.params.id, req.body);
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error updating approval request:", error);
      res.status(500).json({ error: "Failed to update approval request" });
    }
  });

  app.post("/api/approval-requests/:id/approve", async (req: Request, res: Response) => {
    try {
      const { approvedBy, approvedByName } = req.body;
      if (!approvedBy) {
        return res.status(400).json({ error: "approvedBy is required" });
      }
      
      const request = await storage.updateApprovalRequest(req.params.id, {
        status: "approved",
        approvedBy,
        approvedByName,
        approvedAt: new Date(),
      } as any);
      
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  app.post("/api/approval-requests/:id/reject", async (req: Request, res: Response) => {
    try {
      const { rejectionReason } = req.body;
      
      const request = await storage.updateApprovalRequest(req.params.id, {
        status: "rejected",
        rejectionReason,
      } as any);
      
      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ error: "Failed to reject request" });
    }
  });

  app.delete("/api/approval-requests/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteApprovalRequest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting approval request:", error);
      res.status(500).json({ error: "Failed to delete approval request" });
    }
  });
}
