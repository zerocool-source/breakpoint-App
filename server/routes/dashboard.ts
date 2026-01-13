import { Request, Response } from "express";
import { storage } from "../storage";

export function registerDashboardRoutes(app: any) {
  app.get("/api/dashboard/overview", async (req: Request, res: Response) => {
    try {
      const [
        estimates,
        serviceRepairs,
        techniciansList,
        alerts,
      ] = await Promise.all([
        storage.getEstimates(),
        storage.getServiceRepairJobs(),
        storage.getTechnicians(),
        storage.getAlerts(),
      ]);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const draftEstimates = estimates.filter((e: any) => e.status === "draft");
      const pendingApprovals = estimates.filter((e: any) => e.status === "pending_approval");
      const approvedEstimates = estimates.filter((e: any) => e.status === "approved" || e.status === "needs_scheduling");
      const scheduledJobs = estimates.filter((e: any) => e.status === "scheduled");
      const completedJobs = estimates.filter((e: any) => e.status === "completed");
      const readyToInvoice = estimates.filter((e: any) => e.status === "ready_to_invoice");
      const invoicedJobs = estimates.filter((e: any) => e.status === "invoiced");

      const pendingServiceRepairs = serviceRepairs.filter((r: any) => r.status === "pending" || r.status === "open");
      const inProgressRepairs = serviceRepairs.filter((r: any) => r.status === "in_progress");

      const repairTechs = techniciansList.filter((t: any) => t.role === "repair_tech");
      const repairForemen = techniciansList.filter((t: any) => t.role === "repair_foreman");
      const supervisors = techniciansList.filter((t: any) => t.role === "supervisor");

      const urgentAlerts = alerts.filter((a: any) => 
        a.severity?.toUpperCase().includes("URGENT") && a.status === "Active"
      );
      const activeAlerts = alerts.filter((a: any) => a.status === "Active");

      const totalEstimateValue = estimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const pendingApprovalValue = pendingApprovals.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const readyToInvoiceValue = readyToInvoice.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const scheduledValue = scheduledJobs.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;

      const recentActivity = [
        ...estimates.slice(0, 5).map((e: any) => ({
          type: "estimate",
          id: e.id,
          title: e.title || "Untitled Estimate",
          property: e.propertyName,
          status: e.status,
          amount: (e.totalAmount || 0) / 100,
          timestamp: e.updatedAt || e.createdAt,
        })),
        ...serviceRepairs.slice(0, 5).map((r: any) => ({
          type: "service_repair",
          id: r.id,
          title: r.description || "Service Repair",
          property: r.propertyName,
          status: r.status,
          amount: (r.estimatedCost || 0) / 100,
          timestamp: r.updatedAt || r.createdAt,
        })),
      ].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 10);

      const urgentItems = [
        ...urgentAlerts.slice(0, 5).map((a: any) => ({
          type: "alert",
          id: a.id,
          title: a.alertType || "Alert",
          description: a.description,
          severity: a.severity,
          property: a.poolName,
        })),
        ...readyToInvoice.slice(0, 3).map((e: any) => ({
          type: "ready_to_invoice",
          id: e.id,
          title: e.title || "Ready to Invoice",
          description: `${e.propertyName} - $${((e.totalAmount || 0) / 100).toLocaleString()}`,
          severity: "info",
          property: e.propertyName,
        })),
        ...approvedEstimates.filter((e: any) => e.status === "needs_scheduling").slice(0, 3).map((e: any) => ({
          type: "needs_scheduling",
          id: e.id,
          title: e.title || "Needs Scheduling",
          description: `${e.propertyName} - Approved, awaiting schedule`,
          severity: "warning",
          property: e.propertyName,
        })),
      ];

      res.json({
        metrics: {
          estimates: {
            draft: draftEstimates.length,
            pendingApproval: pendingApprovals.length,
            approved: approvedEstimates.length,
            scheduled: scheduledJobs.length,
            completed: completedJobs.length,
            readyToInvoice: readyToInvoice.length,
            invoiced: invoicedJobs.length,
            total: estimates.length,
          },
          values: {
            total: totalEstimateValue,
            pendingApproval: pendingApprovalValue,
            readyToInvoice: readyToInvoiceValue,
            scheduled: scheduledValue,
          },
          serviceRepairs: {
            pending: pendingServiceRepairs.length,
            inProgress: inProgressRepairs.length,
            total: serviceRepairs.length,
          },
          technicians: {
            repairTechs: repairTechs.length,
            repairForemen: repairForemen.length,
            supervisors: supervisors.length,
            total: techniciansList.length,
          },
          alerts: {
            urgent: urgentAlerts.length,
            active: activeAlerts.length,
            total: alerts.length,
          },
        },
        recentActivity,
        urgentItems,
        summary: {
          needsScheduling: approvedEstimates.filter((e: any) => e.status === "needs_scheduling").length,
          needsInvoicing: readyToInvoice.length,
          pendingApprovals: pendingApprovals.length,
          activeRepairs: pendingServiceRepairs.length + inProgressRepairs.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching dashboard overview:", error);
      res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
  });
}
