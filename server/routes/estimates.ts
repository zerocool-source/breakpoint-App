import { Request, Response } from "express";
import { storage } from "../storage";
import crypto from "crypto";

export function registerEstimateRoutes(app: any) {
  // Customer Billing Contacts (aggregate across all properties)
  app.get("/api/customers/:customerId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const contacts = await storage.getBillingContactsByCustomer(customerId);
      res.json({ contacts });
    } catch (error: any) {
      console.error("Error fetching customer billing contacts:", error);
      res.status(500).json({ error: "Failed to fetch billing contacts" });
    }
  });

  app.post("/api/customers/:customerId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      // Get the first property for this customer to associate the billing contact
      const customerProperties = await storage.getPropertiesByCustomer(customerId);
      if (customerProperties.length === 0) {
        return res.status(400).json({ error: "Customer has no properties. Please create a property first." });
      }
      const propertyId = req.body.propertyId || customerProperties[0].id;
      const contact = await storage.createPropertyBillingContact({ ...req.body, propertyId });
      res.json({ contact });
    } catch (error: any) {
      console.error("Error creating billing contact:", error);
      res.status(500).json({ error: "Failed to create billing contact" });
    }
  });

  app.delete("/api/customers/:customerId/billing-contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deletePropertyBillingContact(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting billing contact:", error);
      res.status(500).json({ error: "Failed to delete billing contact" });
    }
  });

  // Property Billing Contacts
  app.get("/api/properties/:propertyId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const contacts = await storage.getPropertyBillingContacts(propertyId);
      res.json({ contacts });
    } catch (error: any) {
      console.error("Error fetching billing contacts:", error);
      res.status(500).json({ error: "Failed to fetch billing contacts" });
    }
  });

  app.post("/api/properties/:propertyId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const contact = await storage.createPropertyBillingContact({ ...req.body, propertyId });
      res.json({ contact });
    } catch (error: any) {
      console.error("Error creating billing contact:", error);
      res.status(500).json({ error: "Failed to create billing contact" });
    }
  });

  app.put("/api/billing-contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const contact = await storage.updatePropertyBillingContact(id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Billing contact not found" });
      }
      res.json({ contact });
    } catch (error: any) {
      console.error("Error updating billing contact:", error);
      res.status(500).json({ error: "Failed to update billing contact" });
    }
  });

  app.delete("/api/billing-contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deletePropertyBillingContact(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting billing contact:", error);
      res.status(500).json({ error: "Failed to delete billing contact" });
    }
  });

  app.get("/api/properties/:propertyId/billing-email/:workType", async (req: Request, res: Response) => {
    try {
      const { propertyId, workType } = req.params;
      const email = await storage.getBillingEmailForWorkType(propertyId, workType);
      res.json({ email });
    } catch (error: any) {
      console.error("Error getting billing email:", error);
      res.status(500).json({ error: "Failed to get billing email" });
    }
  });

  // Pool WO Settings
  app.patch("/api/pools/:poolId/wo-settings", async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const { woRequired, woNotes } = req.body;
      await storage.updatePoolWoSettings(poolId, woRequired, woNotes);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating WO settings:", error);
      res.status(500).json({ error: "Failed to update WO settings" });
    }
  });

  // Estimates
  app.get("/api/estimates", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const estimates = await storage.getEstimates(status as string | undefined);
      
      // Check for expired deadlines and auto-return to needs_scheduling
      const now = new Date();
      for (const est of estimates) {
        if (est.status === "scheduled" && est.deadlineAt) {
          const deadline = new Date(est.deadlineAt);
          if (deadline < now) {
            // Deadline expired - return to needs_scheduling
            await storage.updateEstimate(est.id, {
              status: "needs_scheduling",
              deadlineAt: null,
              repairTechId: null,
              repairTechName: null,
            });
            est.status = "needs_scheduling";
            est.deadlineAt = null;
          }
        }
      }
      
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching estimates:", error);
      res.status(500).json({ error: "Failed to fetch estimates" });
    }
  });

  // Estimate metrics - must be before :id routes
  app.get("/api/estimates/metrics", async (req: Request, res: Response) => {
    try {
      const estimates = await storage.getEstimates();
      
      const metrics = {
        total: estimates.length,
        byStatus: {} as Record<string, number>,
        totalValue: 0,
        approvedValue: 0,
        scheduledValue: 0,
        completedValue: 0,
        readyToInvoiceValue: 0,
        readyToInvoiceCount: 0,
        invoicedValue: 0,
        conversionRate: 0,
        avgApprovalTime: 0,
        avgSchedulingTime: 0,
        avgCompletionTime: 0,
      };

      let approvalTimes: number[] = [];
      let schedulingTimes: number[] = [];
      let completionTimes: number[] = [];

      for (const est of estimates) {
        const status = est.status || "draft";
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
        const amount = (est.totalAmount || 0) / 100;
        metrics.totalValue += amount;

        if (["approved", "needs_scheduling", "scheduled", "completed", "ready_to_invoice", "invoiced"].includes(status)) {
          metrics.approvedValue += amount;
        }
        if (["scheduled", "completed", "ready_to_invoice", "invoiced"].includes(status)) {
          metrics.scheduledValue += amount;
        }
        if (["completed", "ready_to_invoice", "invoiced"].includes(status)) {
          metrics.completedValue += amount;
        }
        if (status === "ready_to_invoice") {
          metrics.readyToInvoiceValue += amount;
          metrics.readyToInvoiceCount += 1;
        }
        if (status === "invoiced") {
          metrics.invoicedValue += amount;
        }

        // Calculate average times
        if (est.sentForApprovalAt && est.approvedAt) {
          approvalTimes.push(new Date(est.approvedAt).getTime() - new Date(est.sentForApprovalAt).getTime());
        }
        if (est.approvedAt && est.scheduledAt) {
          schedulingTimes.push(new Date(est.scheduledAt).getTime() - new Date(est.approvedAt).getTime());
        }
        if (est.scheduledAt && est.completedAt) {
          completionTimes.push(new Date(est.completedAt).getTime() - new Date(est.scheduledAt).getTime());
        }
      }

      const approvedCount = estimates.filter(e => 
        ["approved", "needs_scheduling", "scheduled", "completed", "ready_to_invoice", "invoiced"].includes(e.status || "")
      ).length;
      const sentCount = estimates.filter(e => 
        e.status !== "draft"
      ).length;

      metrics.conversionRate = sentCount > 0 ? Math.round((approvedCount / sentCount) * 100) : 0;
      
      // Average times in hours
      metrics.avgApprovalTime = approvalTimes.length > 0 
        ? Math.round(approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length / (1000 * 60 * 60))
        : 0;
      metrics.avgSchedulingTime = schedulingTimes.length > 0 
        ? Math.round(schedulingTimes.reduce((a, b) => a + b, 0) / schedulingTimes.length / (1000 * 60 * 60))
        : 0;
      metrics.avgCompletionTime = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / (1000 * 60 * 60))
        : 0;

      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching estimate metrics:", error);
      res.status(500).json({ error: "Failed to fetch estimate metrics" });
    }
  });

  // Get repair technicians with availability - must be before :id routes
  app.get("/api/estimates/repair-techs", async (req: Request, res: Response) => {
    try {
      const technicians = await storage.getTechnicians();
      const repairTechs = technicians.filter((t: any) => 
        t.role === "repair" || t.role === "repair_tech" || t.role === "repair_foreman"
      );
      
      // Get scheduled estimates for each tech to show their workload
      const allEstimates = await storage.getEstimates("scheduled");
      
      const techsWithAvailability = repairTechs.map((tech: any) => {
        const assignedEstimates = allEstimates.filter((e: any) => e.repairTechId === tech.id);
        const name = tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Unknown';
        return {
          ...tech,
          name,
          assignedJobs: assignedEstimates.length,
          scheduledEstimates: assignedEstimates.slice(0, 5).map((e: any) => ({
            id: e.id,
            title: e.title,
            propertyName: e.propertyName,
            scheduledDate: e.scheduledDate,
          })),
        };
      });

      res.json({ technicians: techsWithAvailability });
    } catch (error: any) {
      console.error("Error fetching repair techs:", error);
      res.status(500).json({ error: "Failed to fetch repair technicians" });
    }
  });

  app.get("/api/estimates/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.getEstimate(id);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error fetching estimate:", error);
      res.status(500).json({ error: "Failed to fetch estimate" });
    }
  });

  app.get("/api/estimates/property/:propertyId", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const estimates = await storage.getEstimatesByProperty(propertyId);
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching property estimates:", error);
      res.status(500).json({ error: "Failed to fetch property estimates" });
    }
  });

  app.post("/api/estimates", async (req: Request, res: Response) => {
    try {
      const estimate = await storage.createEstimate(req.body);
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error creating estimate:", error);
      res.status(500).json({ error: "Failed to create estimate" });
    }
  });

  app.put("/api/estimates/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, req.body);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error updating estimate:", error);
      res.status(500).json({ error: "Failed to update estimate" });
    }
  });

  app.patch("/api/estimates/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, ...extras } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const estimate = await storage.updateEstimateStatus(id, status, extras);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error updating estimate status:", error);
      res.status(500).json({ error: "Failed to update estimate status" });
    }
  });

  app.delete("/api/estimates/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteEstimate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting estimate:", error);
      res.status(500).json({ error: "Failed to delete estimate" });
    }
  });

  // Estimate workflow transitions
  app.patch("/api/estimates/:id/approve", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedByManagerId, approvedByManagerName } = req.body;
      const estimate = await storage.updateEstimate(id, {
        status: "approved",
        approvedAt: new Date(),
        approvedByManagerId,
        approvedByManagerName,
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error approving estimate:", error);
      res.status(500).json({ error: "Failed to approve estimate" });
    }
  });

  app.patch("/api/estimates/:id/reject", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const estimate = await storage.updateEstimate(id, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason,
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error rejecting estimate:", error);
      res.status(500).json({ error: "Failed to reject estimate" });
    }
  });

  app.patch("/api/estimates/:id/needs-scheduling", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, {
        status: "needs_scheduling",
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error updating estimate:", error);
      res.status(500).json({ error: "Failed to update estimate" });
    }
  });

  app.patch("/api/estimates/:id/schedule", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { repairTechId, repairTechName, scheduledDate, scheduledByUserId, scheduledByUserName, deadlineAt, deadlineUnit, deadlineValue } = req.body;
      
      // Get the current estimate first to get property info
      const currentEstimate = await storage.getEstimate(id);
      if (!currentEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      // Update the estimate status to scheduled
      const estimate = await storage.updateEstimate(id, {
        status: "scheduled",
        repairTechId,
        repairTechName,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        scheduledAt: new Date(),
        scheduledByUserId,
        scheduledByUserName,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        deadlineUnit: deadlineUnit || "hours",
        deadlineValue: deadlineValue || null,
      });
      
      // Create a linked service repair job in the Repair Queue
      const repairJob = await storage.createServiceRepairJob({
        jobNumber: `EST-${currentEstimate.estimateNumber || id.slice(0, 8)}`,
        propertyId: currentEstimate.propertyId,
        propertyName: currentEstimate.propertyName,
        customerId: null,
        customerName: currentEstimate.customerName,
        address: currentEstimate.address,
        technicianId: repairTechId,
        technicianName: repairTechName,
        jobDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        description: currentEstimate.title,
        notes: currentEstimate.description,
        totalAmount: currentEstimate.totalAmount || 0,
        status: "in_progress",
        estimateId: id,
      });
      
      // Update estimate with the linked repair job ID
      await storage.updateEstimate(id, {
        assignedRepairJobId: repairJob.id,
      });
      
      res.json({ estimate: { ...estimate, assignedRepairJobId: repairJob.id }, repairJob });
    } catch (error: any) {
      console.error("Error scheduling estimate:", error);
      res.status(500).json({ error: "Failed to schedule estimate" });
    }
  });

  app.patch("/api/estimates/:id/complete", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, {
        status: "completed",
        completedAt: new Date(),
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error completing estimate:", error);
      res.status(500).json({ error: "Failed to complete estimate" });
    }
  });

  app.patch("/api/estimates/:id/ready-to-invoice", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, {
        status: "ready_to_invoice",
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error marking estimate ready to invoice:", error);
      res.status(500).json({ error: "Failed to mark estimate ready to invoice" });
    }
  });

  app.patch("/api/estimates/:id/invoice", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { invoiceId } = req.body;
      const estimate = await storage.updateEstimate(id, {
        status: "invoiced",
        invoicedAt: new Date(),
        invoiceId,
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error invoicing estimate:", error);
      res.status(500).json({ error: "Failed to invoice estimate" });
    }
  });

  // Send estimate for customer approval
  app.post("/api/estimates/:id/send-for-approval", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      // Generate a secure approval token
      const approvalToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const estimate = await storage.updateEstimate(id, {
        status: "pending_approval",
        approvalToken,
        approvalTokenExpiresAt: tokenExpiresAt,
        approvalSentTo: email,
        approvalSentAt: new Date(),
        sentForApprovalAt: new Date(),
      });
      
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      // Generate the approval URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000";
      const approvalUrl = `${baseUrl}/approve/${approvalToken}`;
      
      res.json({ 
        estimate, 
        approvalUrl,
        message: `Estimate sent for approval to ${email}` 
      });
    } catch (error: any) {
      console.error("Error sending estimate for approval:", error);
      res.status(500).json({ error: "Failed to send estimate for approval" });
    }
  });

  // Public: Get estimate by approval token (no auth required)
  app.get("/api/public/estimates/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      const estimate = await storage.getEstimateByApprovalToken(token);
      
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found or link has expired" });
      }
      
      // Check if token has expired
      if (estimate.approvalTokenExpiresAt && new Date(estimate.approvalTokenExpiresAt) < new Date()) {
        return res.status(410).json({ error: "This approval link has expired" });
      }
      
      // Check if already approved or rejected
      if (estimate.status === "approved" || estimate.status === "needs_scheduling" || estimate.status === "scheduled" || estimate.status === "completed") {
        return res.json({ estimate, alreadyProcessed: true, action: "approved" });
      }
      if (estimate.status === "rejected") {
        return res.json({ estimate, alreadyProcessed: true, action: "rejected" });
      }
      
      res.json({ estimate, alreadyProcessed: false });
    } catch (error: any) {
      console.error("Error fetching estimate by token:", error);
      res.status(500).json({ error: "Failed to fetch estimate" });
    }
  });

  // Public: Approve estimate (no auth required)
  app.post("/api/public/estimates/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { approverName, approverTitle } = req.body;
      
      if (!approverName) {
        return res.status(400).json({ error: "Your name is required to approve this estimate" });
      }
      
      const existingEstimate = await storage.getEstimateByApprovalToken(token);
      
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found or link has expired" });
      }
      
      // Check if token has expired
      if (existingEstimate.approvalTokenExpiresAt && new Date(existingEstimate.approvalTokenExpiresAt) < new Date()) {
        return res.status(410).json({ error: "This approval link has expired" });
      }
      
      // Check if already processed
      if (existingEstimate.status !== "pending_approval") {
        return res.status(400).json({ error: "This estimate has already been processed" });
      }
      
      // Approve the estimate and move to needs_scheduling
      const estimate = await storage.updateEstimate(existingEstimate.id, {
        status: "needs_scheduling",
        approvedAt: new Date(),
        customerApproverName: approverName,
        customerApproverTitle: approverTitle || null,
        acceptedBy: `${approverName}${approverTitle ? ` (${approverTitle})` : ""}`,
        acceptedDate: new Date(),
      });
      
      res.json({ 
        estimate, 
        message: "Estimate approved successfully. The team will contact you to schedule the work." 
      });
    } catch (error: any) {
      console.error("Error approving estimate:", error);
      res.status(500).json({ error: "Failed to approve estimate" });
    }
  });

  // Public: Reject estimate (no auth required)
  app.post("/api/public/estimates/reject/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { approverName, approverTitle, rejectionReason } = req.body;
      
      const existingEstimate = await storage.getEstimateByApprovalToken(token);
      
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found or link has expired" });
      }
      
      // Check if token has expired
      if (existingEstimate.approvalTokenExpiresAt && new Date(existingEstimate.approvalTokenExpiresAt) < new Date()) {
        return res.status(410).json({ error: "This approval link has expired" });
      }
      
      // Check if already processed
      if (existingEstimate.status !== "pending_approval") {
        return res.status(400).json({ error: "This estimate has already been processed" });
      }
      
      // Reject the estimate
      const estimate = await storage.updateEstimate(existingEstimate.id, {
        status: "rejected",
        rejectedAt: new Date(),
        customerApproverName: approverName || null,
        customerApproverTitle: approverTitle || null,
        rejectionReason: rejectionReason || null,
      });
      
      res.json({ 
        estimate, 
        message: "Estimate has been declined. Thank you for your response." 
      });
    } catch (error: any) {
      console.error("Error rejecting estimate:", error);
      res.status(500).json({ error: "Failed to reject estimate" });
    }
  });
}
