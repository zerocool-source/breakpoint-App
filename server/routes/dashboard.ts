import { Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { invoices, techOpsEntries, techCoverages } from "@shared/schema";
import { eq, and, or, not, isNull, gte, lte } from "drizzle-orm";

export function registerDashboardRoutes(app: any) {
  app.get("/api/dashboard/overview", async (req: Request, res: Response) => {
    try {
      const [
        estimates,
        serviceRepairs,
        techniciansList,
        alerts,
        emergencies,
        allInvoices,
        allTechOpsEntries,
        allCoverages,
      ] = await Promise.all([
        storage.getEstimates(),
        storage.getServiceRepairJobs(),
        storage.getTechnicians(),
        storage.getAlerts(),
        storage.getEmergencies(),
        db.select().from(invoices),
        db.select().from(techOpsEntries),
        db.select().from(techCoverages),
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
      const declinedEstimates = estimates.filter((e: any) => e.status === "rejected");

      // Invoice metrics
      const unpaidInvoices = allInvoices.filter((inv: any) => 
        inv.status === "sent" || inv.status === "overdue" || inv.status === "partial"
      );
      const paidInvoices = allInvoices.filter((inv: any) => inv.status === "paid");

      // Inactive technicians - currently returns empty array as there's no clock-in system
      // This will be populated when clock-in tracking is implemented
      // The frontend shows this section only when there are inactive technicians
      const inactiveTechnicians: Array<{
        id: string;
        name: string;
        role: string;
        expectedStartTime: string;
        minutesLate: number;
      }> = [];

      const pendingServiceRepairs = serviceRepairs.filter((r: any) => r.status === "pending" || r.status === "open");
      const inProgressRepairs = serviceRepairs.filter((r: any) => r.status === "in_progress");

      const repairTechs = techniciansList.filter((t: any) => t.role === "repair_tech");
      const repairForemen = techniciansList.filter((t: any) => t.role === "repair_foreman");
      const supervisors = techniciansList.filter((t: any) => t.role === "supervisor");

      // Calculate repair tech workload - estimates in "scheduled" status assigned to repair techs
      // These are the jobs that appear in the Repair Queue
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get all scheduled estimates (repair queue items) - filter by today's date if available
      const scheduledEstimates = estimates.filter((e: any) => {
        if (e.status !== "scheduled") return false;
        // If no scheduled date, include it (might be scheduled without specific date)
        const scheduledDate = e.scheduledDate;
        if (!scheduledDate) return true;
        const dateStr = typeof scheduledDate === 'string' 
          ? scheduledDate.split('T')[0] 
          : new Date(scheduledDate).toISOString().split('T')[0];
        return dateStr === todayStr;
      });

      // Group by repair technician using repairTechId
      const repairTechWorkload = repairTechs.map((tech: any) => {
        const techJobs = scheduledEstimates.filter((e: any) => 
          e.repairTechId === tech.id
        );
        return {
          id: tech.id,
          name: tech.name,
          jobCount: techJobs.length,
        };
      }).sort((a: any, b: any) => b.jobCount - a.jobCount);

      const urgentAlerts = alerts.filter((a: any) => 
        (a.severity?.toUpperCase()?.includes("URGENT") || a.severity?.toLowerCase()?.includes("urgent")) && 
        (a.status === "Active" || a.status?.toLowerCase() === "active")
      );
      const activeAlerts = alerts.filter((a: any) => 
        a.status === "Active" || a.status?.toLowerCase() === "active"
      );

      // Emergency metrics
      const openEmergencies = emergencies.filter((e: any) => 
        e.status === "pending_review" || e.status === "in_progress"
      );
      const pendingReviewEmergencies = emergencies.filter((e: any) => e.status === "pending_review");
      const inProgressEmergencies = emergencies.filter((e: any) => e.status === "in_progress");

      const totalEstimateValue = estimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const draftValue = draftEstimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const pendingApprovalValue = pendingApprovals.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const approvedValue = approvedEstimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const scheduledValue = scheduledJobs.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
      const readyToInvoiceValue = readyToInvoice.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;

      const recentActivity = [
        ...estimates.slice(0, 5).map((e: any) => ({
          type: "estimate",
          id: e.id,
          title: e.title || "Untitled Estimate",
          property: e.propertyName || "Unknown Property",
          status: e.status || "draft",
          amount: (e.totalAmount || 0) / 100,
          timestamp: e.updatedAt || e.createdAt || new Date().toISOString(),
        })),
        ...serviceRepairs.slice(0, 5).map((r: any) => ({
          type: "service_repair",
          id: r.id,
          title: r.description || r.title || "Service Repair",
          property: r.propertyName || r.propertyId || "Unknown Property",
          status: r.status || "pending",
          amount: (r.estimatedCost || r.amount || 0) / 100,
          timestamp: r.updatedAt || r.createdAt || new Date().toISOString(),
        })),
      ].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 10);

      const urgentItems = [
        ...openEmergencies.slice(0, 5).map((e: any) => ({
          type: "emergency",
          id: e.id,
          title: `Emergency: ${e.propertyName || "Unknown Property"}`,
          description: e.description?.substring(0, 100) || "No description",
          severity: e.priority === "critical" ? "critical" : e.priority === "high" ? "warning" : "info",
          property: e.propertyName || "Unknown",
          reportedBy: e.submittedByName || "Unknown",
          submitterRole: e.submitterRole || "Unknown",
        })),
        ...urgentAlerts.slice(0, 5).map((a: any) => ({
          type: "alert",
          id: a.id,
          title: a.alertType || a.type || "Alert",
          description: a.description || a.message || "No description",
          severity: a.severity || "warning",
          property: a.poolName || a.propertyName || "Unknown",
        })),
        ...readyToInvoice.slice(0, 3).map((e: any) => ({
          type: "ready_to_invoice",
          id: e.id,
          title: e.title || "Ready to Invoice",
          description: `${e.propertyName || "Property"} - $${((e.totalAmount || 0) / 100).toLocaleString()}`,
          severity: "info",
          property: e.propertyName || "Unknown",
        })),
        ...approvedEstimates.filter((e: any) => e.status === "needs_scheduling").slice(0, 3).map((e: any) => ({
          type: "needs_scheduling",
          id: e.id,
          title: e.title || "Needs Scheduling",
          description: `${e.propertyName || "Property"} - Approved, awaiting schedule`,
          severity: "warning",
          property: e.propertyName || "Unknown",
        })),
      ];

      // Calculate unpaid invoice value
      const unpaidInvoiceValue = unpaidInvoices.reduce((sum: number, inv: any) => {
        const balance = inv.balanceDue || inv.totalAmount || 0;
        return sum + (typeof balance === 'number' ? balance : 0);
      }, 0) / 100;

      // Chemical orders by property (pending orders that need to be sent)
      const pendingChemicalOrders = allTechOpsEntries.filter((entry: any) => 
        entry.entryType === "chemical_order" && 
        (!entry.orderStatus || entry.orderStatus === "pending")
      );
      
      const chemicalOrdersByProperty: Record<string, { propertyName: string; count: number }> = {};
      pendingChemicalOrders.forEach((order: any) => {
        const propName = order.propertyName || "Unknown Property";
        if (!chemicalOrdersByProperty[propName]) {
          chemicalOrdersByProperty[propName] = { propertyName: propName, count: 0 };
        }
        chemicalOrdersByProperty[propName].count++;
      });
      
      const chemicalOrdersByPropertyList = Object.values(chemicalOrdersByProperty)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 properties

      // Tech coverage data for calendar
      const activeCoverages = allCoverages.filter((c: any) => 
        c.status === "active" || !c.status
      );
      
      // Build technician name lookup
      const techNameMap: Record<string, string> = {};
      techniciansList.forEach((t: any) => {
        techNameMap[String(t.id)] = t.name || `Tech ${t.id}`;
      });
      
      const coverageList = activeCoverages.map((c: any) => ({
        id: c.id,
        startDate: c.startDate,
        endDate: c.endDate,
        originalTechId: c.originalTechId,
        originalTechName: techNameMap[String(c.originalTechId)] || `Tech ${c.originalTechId}`,
        coveringTechId: c.coveringTechId,
        coveringTechName: techNameMap[String(c.coveringTechId)] || `Tech ${c.coveringTechId}`,
        propertyName: c.propertyName || null,
        reason: c.reason || null,
      }));

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
            declined: declinedEstimates.length,
            total: estimates.length,
          },
          invoices: {
            unpaid: unpaidInvoices.length,
            unpaidValue: unpaidInvoiceValue,
            paid: paidInvoices.length,
            total: allInvoices.length,
          },
          values: {
            total: totalEstimateValue,
            draft: draftValue,
            pendingApproval: pendingApprovalValue,
            approved: approvedValue,
            scheduled: scheduledValue,
            readyToInvoice: readyToInvoiceValue,
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
            inactive: inactiveTechnicians,
            repairTechWorkload,
          },
          alerts: {
            urgent: urgentAlerts.length,
            active: activeAlerts.length,
            total: alerts.length,
          },
          emergencies: {
            open: openEmergencies.length,
            pendingReview: pendingReviewEmergencies.length,
            inProgress: inProgressEmergencies.length,
            total: emergencies.length,
            recentOpen: openEmergencies.slice(0, 3).map((e: any) => ({
              id: e.id,
              propertyName: e.propertyName || "Unknown Property",
              submittedByName: e.submittedByName || "Unknown",
              submitterRole: e.submitterRole || "Unknown",
              priority: e.priority || "normal",
              description: e.description?.substring(0, 80) || "",
              createdAt: e.createdAt,
            })),
          },
        },
        recentActivity,
        urgentItems,
        chemicalOrdersByProperty: chemicalOrdersByPropertyList,
        coverages: coverageList,
        summary: {
          needsScheduling: approvedEstimates.filter((e: any) => e.status === "needs_scheduling").length,
          needsInvoicing: readyToInvoice.length,
          pendingApprovals: pendingApprovals.length,
          activeRepairs: pendingServiceRepairs.length + inProgressRepairs.length,
          pendingChemicalOrders: pendingChemicalOrders.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching dashboard overview:", error);
      res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
  });
}
