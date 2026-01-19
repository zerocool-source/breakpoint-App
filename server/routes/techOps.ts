import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertTechOpsEntrySchema } from "@shared/schema";
import { PoolBrainClient } from "../poolbrain-client";

export function registerTechOpsRoutes(app: Express) {
  app.get("/api/tech-ops", async (req: Request, res: Response) => {
    try {
      const { entryType, status, propertyId, technicianName, startDate, endDate, priority } = req.query;
      const entries = await storage.getTechOpsEntries({
        entryType: entryType as string | undefined,
        status: status as string | undefined,
        propertyId: propertyId as string | undefined,
        technicianName: technicianName as string | undefined,
        priority: priority as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching tech ops entries:", error);
      res.status(500).json({ error: "Failed to fetch tech ops entries" });
    }
  });

  app.get("/api/tech-ops/summary", async (req: Request, res: Response) => {
    try {
      const { propertyId, technicianName, startDate, endDate } = req.query;
      const summary = await storage.getTechOpsSummary({
        propertyId: propertyId as string | undefined,
        technicianName: technicianName as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching tech ops summary:", error);
      res.status(500).json({ error: "Failed to fetch tech ops summary" });
    }
  });

  // Get unread counts by entry type for badge notifications - MUST be before :id route
  app.get("/api/tech-ops/unread-counts", async (req: Request, res: Response) => {
    try {
      const counts = await storage.getTechOpsUnreadCounts();
      res.json(counts);
    } catch (error: any) {
      console.error("Error fetching unread counts:", error);
      res.status(500).json({ error: "Failed to fetch unread counts" });
    }
  });

  // Mark all entries of a type as read - MUST be before :id route
  app.post("/api/tech-ops/mark-all-read", async (req: Request, res: Response) => {
    try {
      const { entryType } = req.body;
      await storage.markAllTechOpsRead(entryType);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking entries as read:", error);
      res.status(500).json({ error: "Failed to mark entries as read" });
    }
  });

  // Windy Day Cleanup: Get pending count for badge - MUST be before :id route
  app.get("/api/tech-ops/windy-day-pending-count", async (req: Request, res: Response) => {
    try {
      const entries = await storage.getTechOpsEntries({
        entryType: "windy_day_cleanup",
        status: "pending"
      });
      res.json({ count: entries.length });
    } catch (error: any) {
      console.error("Error fetching windy day pending count:", error);
      res.status(500).json({ error: "Failed to fetch pending count" });
    }
  });

  // Pool Brain API Sync: Sync repairs from Pool Brain alerts - MUST be before :id route
  app.post("/api/tech-ops/sync-repairs", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Fetch alerts, customer details, pool details, and notes from Pool Brain
      const fromDate = req.body.fromDate || "2025-12-18";
      const toDate = req.body.toDate || new Date().toISOString().split("T")[0];

      console.log(`Syncing repairs from Pool Brain: ${fromDate} to ${toDate}`);

      const [alertsData, customersData, custPoolData, custNotesData, techniciansData] = await Promise.all([
        client.getAlertsList({ fromDate, toDate, limit: 10000 }),
        client.getCustomerDetail({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerPoolDetails({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerNotes({ limit: 5000 }).catch(() => ({ data: [] })),
        client.getTechnicianDetail({ limit: 500 }).catch(() => ({ data: [] }))
      ]);

      // Build lookup maps
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          if (c.RecordID) customerMap[c.RecordID] = c;
        });
      }

      const poolToCustomerMap: Record<string, string> = {};
      if (custPoolData.data && Array.isArray(custPoolData.data)) {
        custPoolData.data.forEach((cp: any) => {
          if (cp.RecordID && cp.CustomerID) poolToCustomerMap[cp.RecordID] = cp.CustomerID;
        });
      }

      const customerNotesMap: Record<string, string> = {};
      if (custNotesData.data && Array.isArray(custNotesData.data)) {
        custNotesData.data.forEach((cn: any) => {
          if (cn.CustomerID) {
            const noteText = cn.Note || cn.notes || cn.Notes || cn.description || "";
            if (noteText) customerNotesMap[cn.CustomerID] = noteText;
          }
        });
      }

      const technicianMap: Record<string, any> = {};
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          if (tech.RecordID) technicianMap[tech.RecordID] = tech;
        });
      }

      // Process alerts to find repair-related ones
      const repairEntries: any[] = [];
      const windyDayEntries: any[] = [];

      if (alertsData.data && Array.isArray(alertsData.data)) {
        for (const alert of alertsData.data) {
          const waterBodyId = alert.waterBodyId;
          const poolName = alert.BodyOfWater || "Unknown Pool";
          const customerId = alert.CustomerID || poolToCustomerMap[waterBodyId];
          const customer = customerId ? customerMap[customerId] : undefined;
          const customerNotes = customerId ? customerNotesMap[customerId] : "";

          // Extract technician info
          const techId = alert.TechnicianID || alert.technicianId;
          const technician = techId ? technicianMap[techId] : undefined;
          const techName = technician?.FirstName 
            ? `${technician.FirstName} ${technician.LastName || ""}`.trim() 
            : alert.TechnicianName || "Unknown Tech";

          // Build property info
          const propertyName = customer?.DisplayName || customer?.Company || poolName;
          const propertyAddress = customer?.ServiceAddress || customer?.Address || "";

          // Extract notes from alert (may be updated during parsing)
          let techNote = alert.TechNote || alert.techNote || alert.TechNotes || 
                         alert.Notes || alert.notes || alert.Description || "";

          // Check alert categories for repair and windy day references
          let isRepairNeeded = false;
          let isWindyDay = false;
          const messages: string[] = [];

          if (alert.AlertCategories && Array.isArray(alert.AlertCategories)) {
            for (const cat of alert.AlertCategories) {
              const catName = (cat.CategoryName || cat.Name || "").toLowerCase();
              
              if (catName.includes("repair")) isRepairNeeded = true;
              if (catName.includes("windy") || catName.includes("wind")) isWindyDay = true;

              // Check Issue Reports
              if (cat.IssueReport && Array.isArray(cat.IssueReport)) {
                for (const report of cat.IssueReport) {
                  const alertName = (report.AlertName || report.alertName || "").toLowerCase();
                  const reportText = report.IssueReports || report.issueReports || "";
                  const fullText = `${alertName} ${reportText}`.toLowerCase();
                  
                  if (fullText.includes("repair needed") || fullText.includes("repairneeded") || 
                      fullText.includes("repair")) {
                    isRepairNeeded = true;
                  }
                  if (fullText.includes("windy") || fullText.includes("wind") || 
                      fullText.includes("debris") || fullText.includes("storm")) {
                    isWindyDay = true;
                  }
                  
                  if (reportText) messages.push(reportText);
                  if (!techNote && (report.TechNote || report.Notes)) {
                    techNote = report.TechNote || report.Notes;
                  }
                }
              }

              // Check System Issues
              if (cat.SystemIssue && Array.isArray(cat.SystemIssue)) {
                for (const issue of cat.SystemIssue) {
                  const issueName = (issue.AlertName || "").toLowerCase();
                  const issueDesc = (issue.Description || "").toLowerCase();
                  const fullText = `${issueName} ${issueDesc}`;
                  
                  if (fullText.includes("repair")) isRepairNeeded = true;
                  if (fullText.includes("windy") || fullText.includes("wind")) isWindyDay = true;
                  
                  if (issue.AlertName || issue.Description) {
                    messages.push(`${issue.AlertName || ""}: ${issue.Description || ""}`);
                  }
                }
              }

              // Check Custom Alerts
              if (cat.CustomAlert && Array.isArray(cat.CustomAlert)) {
                for (const custom of cat.CustomAlert) {
                  const alertName = (custom.AlertName || custom.message || "").toLowerCase();
                  
                  if (alertName.includes("repair")) isRepairNeeded = true;
                  if (alertName.includes("windy") || alertName.includes("wind")) isWindyDay = true;
                  
                  if (custom.message || custom.AlertName) {
                    messages.push(custom.message || custom.AlertName);
                  }
                }
              }
            }
          }

          // Also check top-level alert name
          const topAlertName = (alert.AlertName || alert.alertName || "").toLowerCase();
          if (topAlertName.includes("repair")) isRepairNeeded = true;
          if (topAlertName.includes("windy") || topAlertName.includes("wind")) isWindyDay = true;

          // Combine tech note with customer notes AFTER parsing completes (techNote may have been updated)
          const combinedNotes = techNote + (customerNotes ? `\n\nCustomer Notes: ${customerNotes}` : "");

          // Determine priority from severity
          const severity = (alert.Severity || alert.severity || "medium").toLowerCase();
          let priority = "normal";
          if (severity === "urgent" || severity === "critical") priority = "urgent";
          else if (severity === "high") priority = "high";
          else if (severity === "low") priority = "low";

          // Create entry data
          const entryData = {
            technicianName: techName,
            technicianId: techId || null,
            propertyId: customerId || waterBodyId,
            propertyName,
            propertyAddress,
            description: messages.join("\n") || techNote || `Alert from ${poolName}`,
            notes: combinedNotes,
            priority,
            status: "pending",
            isRead: false,
          };

          if (isRepairNeeded) {
            repairEntries.push({ ...entryData, entryType: "repairs_needed" });
          }
          
          if (isWindyDay) {
            windyDayEntries.push({ ...entryData, entryType: "windy_day_cleanup" });
          }
        }
      }

      // Create entries in database (avoiding duplicates based on propertyId + date + description)
      let createdRepairs = 0;
      let createdWindy = 0;
      let skippedDuplicates = 0;

      for (const entry of repairEntries) {
        try {
          // Check for existing entry with same property and description
          const existing = await storage.getTechOpsEntries({
            entryType: "repairs_needed",
            propertyId: entry.propertyId || undefined
          });
          
          const isDuplicate = existing.some(e => 
            e.description === entry.description || 
            (e.notes && entry.notes && e.notes.includes(entry.notes.substring(0, 50)))
          );
          
          if (!isDuplicate) {
            await storage.createTechOpsEntry(entry);
            createdRepairs++;
          } else {
            skippedDuplicates++;
          }
        } catch (e) {
          console.error("Error creating repair entry:", e);
        }
      }

      for (const entry of windyDayEntries) {
        try {
          const existing = await storage.getTechOpsEntries({
            entryType: "windy_day_cleanup",
            propertyId: entry.propertyId || undefined
          });
          
          const isDuplicate = existing.some(e => 
            e.description === entry.description ||
            (e.notes && entry.notes && e.notes.includes(entry.notes.substring(0, 50)))
          );
          
          if (!isDuplicate) {
            await storage.createTechOpsEntry(entry);
            createdWindy++;
          } else {
            skippedDuplicates++;
          }
        } catch (e) {
          console.error("Error creating windy day entry:", e);
        }
      }

      res.json({
        success: true,
        message: `Synced from Pool Brain (${fromDate} to ${toDate})`,
        stats: {
          alertsProcessed: alertsData.data?.length || 0,
          repairsCreated: createdRepairs,
          windyDayCreated: createdWindy,
          skippedDuplicates
        }
      });
    } catch (error: any) {
      console.error("Error syncing from Pool Brain:", error);
      res.status(500).json({ error: "Failed to sync from Pool Brain", details: error.message });
    }
  });

  // Delete old entries before a specified date - MUST be before :id route
  app.post("/api/tech-ops/clear-old-data", async (req: Request, res: Response) => {
    try {
      const { beforeDate } = req.body;
      if (!beforeDate) {
        return res.status(400).json({ error: "beforeDate is required (format: YYYY-MM-DD)" });
      }
      
      const cutoffDate = new Date(beforeDate);
      const entries = await storage.getTechOpsEntries({});
      
      let deletedCount = 0;
      for (const entry of entries) {
        if (entry.createdAt && new Date(entry.createdAt) < cutoffDate) {
          await storage.deleteTechOpsEntry(entry.id);
          deletedCount++;
        }
      }
      
      res.json({ success: true, deletedCount, beforeDate });
    } catch (error: any) {
      console.error("Error clearing old data:", error);
      res.status(500).json({ error: "Failed to clear old data" });
    }
  });

  // Commissions Report: Get commission data for technicians - MUST be before :id route
  app.get("/api/tech-ops/commissions", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const commissions = await storage.getTechOpsCommissions({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(commissions);
    } catch (error: any) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/tech-ops/:id", async (req: Request, res: Response) => {
    try {
      const entry = await storage.getTechOpsEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error fetching tech ops entry:", error);
      res.status(500).json({ error: "Failed to fetch tech ops entry" });
    }
  });

  app.post("/api/tech-ops", async (req: Request, res: Response) => {
    try {
      const parsed = insertTechOpsEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const entry = await storage.createTechOpsEntry(parsed.data);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating tech ops entry:", error);
      res.status(500).json({ error: "Failed to create tech ops entry" });
    }
  });

  app.put("/api/tech-ops/:id", async (req: Request, res: Response) => {
    try {
      const parsed = insertTechOpsEntrySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const entry = await storage.updateTechOpsEntry(req.params.id, parsed.data);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error updating tech ops entry:", error);
      res.status(500).json({ error: "Failed to update tech ops entry" });
    }
  });

  app.post("/api/tech-ops/:id/review", async (req: Request, res: Response) => {
    try {
      const { reviewedBy } = req.body;
      if (!reviewedBy) {
        return res.status(400).json({ error: "reviewedBy is required" });
      }
      const entry = await storage.markTechOpsReviewed(req.params.id, reviewedBy);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error reviewing tech ops entry:", error);
      res.status(500).json({ error: "Failed to review tech ops entry" });
    }
  });

  app.delete("/api/tech-ops/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteTechOpsEntry(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting tech ops entry:", error);
      res.status(500).json({ error: "Failed to delete tech ops entry" });
    }
  });

  app.post("/api/tech-ops/:id/archive", async (req: Request, res: Response) => {
    try {
      const entry = await storage.updateTechOpsEntry(req.params.id, { status: "archived" });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error archiving tech ops entry:", error);
      res.status(500).json({ error: "Failed to archive tech ops entry" });
    }
  });

  // Mark an entry as read
  app.post("/api/tech-ops/:id/mark-read", async (req: Request, res: Response) => {
    try {
      const entry = await storage.updateTechOpsEntry(req.params.id, { isRead: true });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error marking entry as read:", error);
      res.status(500).json({ error: "Failed to mark entry as read" });
    }
  });

  app.post("/api/tech-ops/:id/convert-to-estimate", async (req: Request, res: Response) => {
    try {
      const { urgent, convertedByUserId, convertedByUserName } = req.body;
      const entry = await storage.getTechOpsEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      const estimateNumber = `EST-${Date.now().toString(36).toUpperCase()}`;
      const tags = urgent ? ["URGENT"] : [];

      const estimate = await storage.createEstimate({
        propertyId: entry.propertyId || "",
        propertyName: entry.propertyName || "Unknown Property",
        title: `Repair Request - ${entry.propertyName || "Unknown"}`,
        description: entry.description || "",
        estimateNumber,
        status: "draft",
        tags,
        items: [],
        subtotal: 0,
        totalAmount: 0,
        convertedByUserId: convertedByUserId || undefined,
        convertedByUserName: convertedByUserName || undefined,
        convertedAt: new Date(),
      });

      await storage.updateTechOpsEntry(req.params.id, { status: "completed" });

      res.json(estimate);
    } catch (error: any) {
      console.error("Error converting tech ops entry to estimate:", error);
      res.status(500).json({ error: "Failed to convert to estimate" });
    }
  });

  // Windy Day Cleanup: Mark as completed with no charge (no billing)
  app.post("/api/tech-ops/:id/no-charge", async (req: Request, res: Response) => {
    try {
      const existingEntry = await storage.getTechOpsEntry(req.params.id);
      if (!existingEntry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      
      // Prevent duplicate no-charge marking
      if (existingEntry.status === "completed" && existingEntry.notes?.includes("[No Charge")) {
        return res.status(400).json({ error: "Entry already marked as no charge" });
      }
      
      // Only append note if not already present
      const noChargeNote = "[No Charge - Marked as completed with no billing]";
      const updatedNotes = existingEntry.notes?.includes(noChargeNote) 
        ? existingEntry.notes 
        : (existingEntry.notes || "") + "\n" + noChargeNote;
      
      const entry = await storage.updateTechOpsEntry(req.params.id, { 
        status: "completed",
        notes: updatedNotes
      });
      res.json(entry);
    } catch (error: any) {
      console.error("Error marking entry as no charge:", error);
      res.status(500).json({ error: "Failed to mark entry as no charge" });
    }
  });
}
