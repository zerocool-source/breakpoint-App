import { Request, Response } from "express";
import { storage } from "../storage";
import { insertServiceRepairJobSchema } from "@shared/schema";

export function registerServiceRepairRoutes(app: any) {
  app.get("/api/service-repairs", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined;
      const technicianId = req.query.technicianId as string | undefined;
      const technicianEmail = req.query.technicianEmail as string | undefined;
      const technicianName = req.query.technicianName as string | undefined;

      let jobs = await storage.getServiceRepairJobs(status, maxAmount);

      // Filter by technicianId if provided
      if (technicianId) {
        jobs = jobs.filter(job => job.technicianId === technicianId);
      }

      // Filter by technicianEmail if provided (for cross-system lookups)
      if (technicianEmail) {
        // First find the technician by email to get their ID
        const technicians = await storage.getTechnicians();
        const tech = technicians.find((t: any) =>
          t.email?.toLowerCase() === technicianEmail.toLowerCase()
        );
        if (tech) {
          jobs = jobs.filter(job => job.technicianId === tech.id);
        } else {
          jobs = []; // No matching technician found
        }
      }

      // Filter by technicianName if provided
      if (technicianName) {
        jobs = jobs.filter(job =>
          job.technicianName?.toLowerCase().includes(technicianName.toLowerCase())
        );
      }

      res.json({ jobs });
    } catch (error) {
      console.error("Error fetching service repair jobs:", error);
      res.status(500).json({ error: "Failed to fetch service repair jobs" });
    }
  });

  app.get("/api/service-repairs/:id", async (req: Request, res: Response) => {
    try {
      const job = await storage.getServiceRepairJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Service repair job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching service repair job:", error);
      res.status(500).json({ error: "Failed to fetch service repair job" });
    }
  });

  app.post("/api/service-repairs", async (req: Request, res: Response) => {
    try {
      const parsed = insertServiceRepairJobSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const job = await storage.createServiceRepairJob(parsed.data);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating service repair job:", error);
      res.status(500).json({ error: "Failed to create service repair job" });
    }
  });

  app.patch("/api/service-repairs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const previousJob = await storage.getServiceRepairJob(id);
      
      const job = await storage.updateServiceRepairJob(id, req.body);
      if (!job) {
        return res.status(404).json({ error: "Service repair job not found" });
      }
      
      // Sync with linked estimate if status changed to completed
      if (job.estimateId && req.body.status === "completed" && previousJob?.status !== "completed") {
        await storage.updateEstimate(job.estimateId, {
          status: "ready_to_invoice",
          completedAt: new Date(),
        });
      }
      
      // If status changed from completed back to in_progress, update estimate too
      if (job.estimateId && req.body.status === "in_progress" && previousJob?.status === "completed") {
        await storage.updateEstimate(job.estimateId, {
          status: "scheduled",
          completedAt: null,
        });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error updating service repair job:", error);
      res.status(500).json({ error: "Failed to update service repair job" });
    }
  });

  app.delete("/api/service-repairs/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteServiceRepairJob(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service repair job:", error);
      res.status(500).json({ error: "Failed to delete service repair job" });
    }
  });

  app.post("/api/service-repairs/batch-status", async (req: Request, res: Response) => {
    try {
      const { ids, status, estimateId, invoiceId } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids must be a non-empty array" });
      }
      
      if (!status || !['pending', 'selected', 'estimated', 'invoiced'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      await storage.updateServiceRepairJobsStatus(ids, status, estimateId, invoiceId);
      res.json({ success: true, updatedCount: ids.length });
    } catch (error) {
      console.error("Error updating service repair job statuses:", error);
      res.status(500).json({ error: "Failed to update service repair job statuses" });
    }
  });

  app.post("/api/service-repairs/batch-to-estimate", async (req: Request, res: Response) => {
    try {
      const { ids, propertyId, propertyName, notes, convertedByUserId, convertedByUserName } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids must be a non-empty array" });
      }
      
      const jobs = await Promise.all(ids.map((id: string) => storage.getServiceRepairJob(id)));
      const validJobs = jobs.filter(Boolean);
      
      if (validJobs.length === 0) {
        return res.status(400).json({ error: "No valid jobs found" });
      }
      
      const totalAmount = validJobs.reduce((sum, job) => sum + (job?.totalAmount || 0), 0);
      const descriptions = validJobs.map(job => job?.description).filter(Boolean);
      const firstJob = validJobs[0]!;
      
      const estimate = await storage.createEstimate({
        propertyId: propertyId || firstJob.propertyId,
        propertyName: propertyName || firstJob.propertyName || 'Unknown Property',
        title: `Service Repairs Batch - ${ids.length} items`,
        status: 'draft',
        subtotal: totalAmount,
        totalAmount: totalAmount,
        description: descriptions.join('\n'),
        techNotes: notes || `Batch service repairs: ${ids.length} items`,
        woRequired: false,
        sourceType: 'service_tech',
        sourceRepairJobId: ids.length === 1 ? ids[0] : ids.join(','),
        convertedByUserId: convertedByUserId || undefined,
        convertedByUserName: convertedByUserName || undefined,
        convertedAt: new Date(),
      });
      
      await storage.updateServiceRepairJobsStatus(ids, 'estimated', estimate.id);
      
      res.json({ 
        success: true, 
        estimate,
        updatedJobCount: ids.length 
      });
    } catch (error) {
      console.error("Error batching service repairs to estimate:", error);
      res.status(500).json({ error: "Failed to batch service repairs to estimate" });
    }
  });
}
