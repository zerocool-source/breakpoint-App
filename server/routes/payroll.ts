import type { Request, Response } from "express";
import { storage } from "../storage";

export function registerPayrollRoutes(app: any) {
  // Get all pay periods
  app.get("/api/payroll/periods", async (req: Request, res: Response) => {
    try {
      const periods = await storage.getPayPeriods();
      res.json(periods);
    } catch (error: any) {
      console.error("Error fetching pay periods:", error);
      res.status(500).json({ error: "Failed to fetch pay periods" });
    }
  });

  // Create a new pay period
  app.post("/api/payroll/periods", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, status } = req.body;
      const period = await storage.createPayPeriod({ 
        startDate: new Date(startDate), 
        endDate: new Date(endDate), 
        status: status || "open" 
      });
      res.json(period);
    } catch (error: any) {
      console.error("Error creating pay period:", error);
      res.status(500).json({ error: "Failed to create pay period" });
    }
  });

  // Update pay period status
  app.put("/api/payroll/periods/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const period = await storage.updatePayPeriodStatus(id, status);
      res.json(period);
    } catch (error: any) {
      console.error("Error updating pay period:", error);
      res.status(500).json({ error: "Failed to update pay period" });
    }
  });

  // Get payroll entries (optionally by pay period)
  app.get("/api/payroll/entries", async (req: Request, res: Response) => {
    try {
      const { payPeriodId, technicianId } = req.query;
      let entries;
      if (technicianId) {
        entries = await storage.getPayrollEntriesByTechnician(technicianId as string, payPeriodId as string);
      } else {
        entries = await storage.getPayrollEntries(payPeriodId as string);
      }
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching payroll entries:", error);
      res.status(500).json({ error: "Failed to fetch payroll entries" });
    }
  });

  // Add a job to payroll
  app.post("/api/payroll/entries", async (req: Request, res: Response) => {
    try {
      const { payPeriodId, technicianId, technicianName, jobId, jobTitle, customerName, amount, commissionRate, notes, addedBy } = req.body;
      const commissionAmount = Math.round(amount * (commissionRate / 100));
      const entry = await storage.createPayrollEntry({
        payPeriodId,
        technicianId,
        technicianName,
        jobId,
        jobTitle,
        customerName,
        amount,
        commissionRate,
        commissionAmount,
        notes,
        addedBy
      });
      res.json(entry);
    } catch (error: any) {
      console.error("Error creating payroll entry:", error);
      res.status(500).json({ error: "Failed to create payroll entry" });
    }
  });

  // Remove an entry from payroll
  app.delete("/api/payroll/entries/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deletePayrollEntry(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting payroll entry:", error);
      res.status(500).json({ error: "Failed to delete payroll entry" });
    }
  });
}
