import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";
import { buildChemicalOrderEmail, buildChunkedChemicalEmails } from "../email-template";
import { OutlookGraphClient } from "../outlook-graph";

export function registerAlertRoutes(app: any) {
  // ==================== ALERTS ====================
  
  // Update alert status
  app.put("/api/alerts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await storage.updateAlertStatus(id, status);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  // ==================== COMPLETED ALERTS ====================
  
  // Get all completed alert IDs
  app.get("/api/alerts/completed", async (req: Request, res: Response) => {
    try {
      const completedIds = await storage.getCompletedAlertIds();
      res.json({ completedIds });
    } catch (error: any) {
      console.error("Error getting completed alerts:", error);
      res.status(500).json({ error: "Failed to get completed alerts" });
    }
  });

  // Mark an alert as completed
  app.post("/api/alerts/:alertId/complete", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { category } = req.body;
      const completed = await storage.markAlertCompleted(alertId, category || "general");
      res.json({ success: true, completed });
    } catch (error: any) {
      console.error("Error marking alert completed:", error);
      res.status(500).json({ error: "Failed to mark alert completed" });
    }
  });

  // Unmark an alert as completed
  app.delete("/api/alerts/:alertId/complete", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      await storage.unmarkAlertCompleted(alertId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unmarking alert:", error);
      res.status(500).json({ error: "Failed to unmark alert" });
    }
  });

  // Get photos for a specific alert/job from Pool Brain
  app.get("/api/alerts/:jobId/photos", async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
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

      const photos = await client.getJobPhotos(jobId);
      res.json({ photos });
    } catch (error: any) {
      console.error("Error fetching alert photos:", error);
      res.status(500).json({ error: "Failed to fetch photos", photos: [] });
    }
  });

  // Get enriched alerts with pool and customer information
  // Also exposed as /api/alerts_full for API consistency
  const getEnrichedAlerts = async (req: Request, res: Response) => {
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

      // Fetch ALL technicians with pagination
      const fetchAllTechnicians = async () => {
        const allTechs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const techData = await client.getTechnicianDetail({ offset, limit });
            if (techData.data && Array.isArray(techData.data)) {
              allTechs.push(...techData.data);
            }
            hasMore = techData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching technicians at offset", offset, e);
            break;
          }
        }
        return { data: allTechs };
      };

      // Fetch data in parallel - fetch ALL alerts (no limit)
      const [alertsData, customersData, custPoolData, custNotesData, techniciansData] = await Promise.all([
        client.getAlertsList({ limit: 10000 }),
        client.getCustomerDetail({ limit: 1000 }).catch((e) => { console.error("Customer detail error:", e); return { data: [] }; }),
        client.getCustomerPoolDetails({ limit: 1000 }).catch((e) => { console.error("Customer pool details error:", e); return { data: [] }; }),
        client.getCustomerNotes({ limit: 5000 }).catch((e) => { console.error("Customer notes error:", e); return { data: [] }; }),
        fetchAllTechnicians()
      ]);

      // Build customer map using RecordID as key
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          const customerId = c.RecordID;
          if (customerId) {
            customerMap[customerId] = c;
          }
        });
      }

      // Customer notes map (access notes/lockbox codes)
      const customerNotesMap: Record<string, string> = {};
      if (custNotesData.data && Array.isArray(custNotesData.data)) {
        custNotesData.data.forEach((cn: any) => {
          const customerId = cn.CustomerID;
          const noteText = cn.Note || cn.notes || cn.Notes || cn.description || "";
          if (customerId && noteText) {
            customerNotesMap[customerId] = noteText;
          }
        });
      }

      // Pool to customer map - maps waterBodyId (RecordID from pool details) to CustomerID
      const poolToCustomerMap: Record<string, string> = {};
      if (custPoolData.data && Array.isArray(custPoolData.data)) {
        custPoolData.data.forEach((cp: any) => {
          const waterBodyId = cp.RecordID;
          const customerId = cp.CustomerID;
          if (waterBodyId && customerId) {
            poolToCustomerMap[waterBodyId] = customerId;
          }
        });
      }

      // Technician map - maps TechnicianID to technician data
      const technicianMap: Record<string, any> = {};
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          const techId = tech.RecordID;
          if (techId) {
            technicianMap[techId] = tech;
          }
        });
      }

      const enrichedAlerts: any[] = [];
      if (alertsData.data && Array.isArray(alertsData.data)) {
        alertsData.data.forEach((pbAlert: any) => {
          const waterBodyId = pbAlert.waterBodyId;
          const poolName = pbAlert.BodyOfWater || "Unknown Pool";
          
          let customerId = pbAlert.CustomerID || poolToCustomerMap[waterBodyId];
          const customer = customerId ? customerMap[customerId] : undefined;

          let alertType = "Unknown";
          let message = "Alert from Pool Brain";
          let severity = "Medium";
          let status = "Active";
          let isRepairNeeded = false;
          let techNote = "";
          const messages: string[] = [];

          // Extract TechNote from the alert root level
          techNote = pbAlert.TechNote || pbAlert.techNote || pbAlert.TechNotes || 
                     pbAlert.Notes || pbAlert.notes || pbAlert.Description || "";

          // Parse AlertCategories - each category contains an array of alerts
          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            pbAlert.AlertCategories.forEach((cat: any) => {
              // Check if this category is "Repair Needed"
              const catName = (cat.CategoryName || cat.Name || cat.alertCategory || "").toLowerCase();
              if (catName.includes("repair")) {
                isRepairNeeded = true;
              }

              // System Issues
              if (cat.SystemIssue && Array.isArray(cat.SystemIssue) && cat.SystemIssue.length > 0) {
                cat.SystemIssue.forEach((issue: any) => {
                  alertType = "SystemIssue";
                  severity = issue.Severity || issue.severity || "URGENT";
                  const issueName = issue.AlertName || issue.alertName || issue.systemIssue || "";
                  const issueDesc = issue.Description || issue.description || issue.alertDescription || "";
                  
                  // Check if this issue is repair-related
                  if (issueName.toLowerCase().includes("repair") || issueDesc.toLowerCase().includes("repair")) {
                    isRepairNeeded = true;
                  }
                  
                  if (issueName || issueDesc) {
                    messages.push(issueName + (issueDesc ? `: ${issueDesc}` : ""));
                  }
                  if (issue.status === "Resolved" || issue.Status === "Resolved") status = "Resolved";
                  
                  // Extract tech note from issue if not already set
                  if (!techNote && (issue.TechNote || issue.techNote || issue.Notes)) {
                    techNote = issue.TechNote || issue.techNote || issue.Notes || "";
                  }
                });
              }
              
              // Issue Reports - check for "Repair Needed" or "RepairNeeded" alert name
              if (cat.IssueReport && Array.isArray(cat.IssueReport) && cat.IssueReport.length > 0) {
                cat.IssueReport.forEach((report: any) => {
                  const alertName = report.AlertName || report.alertName || "";
                  const alertNameLower = alertName.toLowerCase().replace(/\s+/g, "");
                  const reportText = report.IssueReports || report.issueReports || alertName || report.description || "";
                  
                  // Check if this is a "RepairNeeded" alert (with or without space)
                  if (alertNameLower === "repairneeded" || 
                      alertNameLower.includes("repairneeded") ||
                      alertName.toLowerCase().includes("repair needed") ||
                      reportText.toLowerCase().includes("repair needed")) {
                    isRepairNeeded = true;
                    alertType = "RepairNeeded";
                  } else {
                    if (alertType !== "RepairNeeded") {
                      alertType = "IssueReport";
                    }
                  }
                  
                  severity = report.Severity || report.severity || report.aiPriorityLevel || "HIGH";
                  if (reportText) messages.push(reportText);
                  if (report.status === "Resolved" || report.Status === "Resolved") status = "Resolved";
                  
                  // Extract tech note from report - the IssueReports field often contains the tech note
                  if (!techNote) {
                    techNote = report.TechNote || report.techNote || report.Notes || 
                               report.Description || report.IssueReports || "";
                  }
                });
              }
              
              // Custom Alerts
              if (cat.CustomAlert && Array.isArray(cat.CustomAlert) && cat.CustomAlert.length > 0) {
                cat.CustomAlert.forEach((custom: any) => {
                  const alertName = custom.AlertName || custom.alertName || custom.message || custom.Message || "";
                  
                  // Check if this is a repair-related custom alert
                  if (alertName.toLowerCase().includes("repair")) {
                    isRepairNeeded = true;
                    alertType = "RepairNeeded";
                  } else {
                    alertType = "CustomAlert";
                  }
                  
                  severity = custom.Severity || custom.severity || "Medium";
                  const customMsg = custom.message || custom.Message || alertName || "";
                  if (customMsg) messages.push(customMsg);
                  if (custom.status === "Resolved" || custom.Status === "Resolved") status = "Resolved";
                  
                  // Extract tech note from custom alert if not already set
                  if (!techNote && (custom.TechNote || custom.techNote || custom.Notes || custom.Description)) {
                    techNote = custom.TechNote || custom.techNote || custom.Notes || custom.Description || "";
                  }
                });
              }
            });
          }

          // Also check top-level alert name and message for repair keywords
          const topAlertName = pbAlert.AlertName || pbAlert.alertName || "";
          if (topAlertName.toLowerCase().includes("repair needed") || 
              topAlertName.toLowerCase().includes("repair")) {
            isRepairNeeded = true;
            alertType = "RepairNeeded";
          }

          // Combine all messages or use default
          message = messages.length > 0 ? messages.join(" | ") : "System alert - check pool system";

          // Extract address from Addresses object (first address)
          let address = "";
          if (customer?.Addresses && typeof customer.Addresses === 'object') {
            const firstAddr = Object.values(customer.Addresses)[0] as any;
            if (firstAddr) {
              address = `${firstAddr.BillingAddress || ''}, ${firstAddr.BillingCity || ''}, ${firstAddr.BillingState || ''} ${firstAddr.BillingZip || ''}`.trim();
            }
          }

          // Extract pictures from alert
          const pictures: string[] = [];
          if (pbAlert.Pictures && Array.isArray(pbAlert.Pictures)) {
            pbAlert.Pictures.forEach((pic: any) => {
              if (pic.url || pic.URL || pic.imageUrl) {
                pictures.push(pic.url || pic.URL || pic.imageUrl);
              }
            });
          }

          // Get technician info
          const techId = pbAlert.TechnicianID;
          const technician = techId ? technicianMap[techId] : undefined;
          const techName = technician?.Name || "";
          const techPhone = technician?.Phone || "";
          const techEmail = technician?.Email || "";

          enrichedAlerts.push({
            alertId: pbAlert.JobID || pbAlert.alertId || pbAlert.id,
            poolId: waterBodyId,
            poolName,
            customerId: customerId || null,
            customerName: customer?.CustomerName || customer?.CompanyName || "Unknown Customer",
            address: address || customer?.Address || "",
            phone: customer?.Phone || "",
            email: customer?.Email || "",
            contact: customer?.Contact || customer?.ContactName || "",
            notes: customerNotesMap[customerId] || "",
            message,
            type: alertType,
            severity,
            status,
            isRepairNeeded,
            techNote,
            createdAt: pbAlert.JobDate || pbAlert.Date || new Date().toISOString(),
            pictures,
            techName,
            techPhone,
            techEmail,
            techId,
            rawAlert: pbAlert,
          });
        });
      }

      res.json({ alerts: enrichedAlerts });
    } catch (error: any) {
      console.error("Error fetching enriched alerts:", error);
      res.status(500).json({ 
        error: "Failed to fetch enriched alerts",
        message: error.message 
      });
    }
  };

  // Register both endpoints
  app.get("/api/alerts/enriched", getEnrichedAlerts);
  app.get("/api/alerts_full", getEnrichedAlerts);

  // Create Outlook draft via Microsoft Graph API
  app.post("/api/outlook/create-draft", async (req: Request, res: Response) => {
    try {
      const { subject, to, cc, body } = req.body;

      const tenantId = process.env.AZURE_TENANT_ID;
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const userEmail = process.env.OUTLOOK_USER_EMAIL;

      if (!tenantId || !clientId || !clientSecret || !userEmail) {
        return res.status(400).json({ 
          error: "Microsoft Graph not configured",
          message: "Azure credentials are required for full Outlook integration",
          fallback: true
        });
      }

      const client = new OutlookGraphClient({
        tenantId,
        clientId,
        clientSecret,
        userEmail,
      });

      const draft = await client.createDraft({
        to: to || 'pmtorder@awspoolsupply.com',
        cc: cc || 'Jesus@awspoolsupply.com',
        subject: subject || 'Alpha Chemical Order',
        body: body || '',
      });

      if (!draft) {
        return res.status(500).json({ 
          error: "Failed to create draft",
          fallback: true
        });
      }

      res.json({ 
        success: true,
        draftId: draft.draftId,
        webLink: draft.webLink,
      });
    } catch (error: any) {
      console.error("Error creating Outlook draft:", error);
      res.status(500).json({ 
        error: "Failed to create Outlook draft",
        message: error.message,
        fallback: true
      });
    }
  });

  // Legacy: Create Outlook compose link (fallback)
  app.post("/api/open-outlook", async (req: Request, res: Response) => {
    try {
      const { subject, to, cc, emailText } = req.body;

      const params = new URLSearchParams();
      if (to) params.append('to', to);
      if (cc) params.append('cc', cc);
      if (subject) params.append('subject', subject);
      if (emailText) params.append('body', emailText);

      const outlookUri = `ms-outlook://compose?${params.toString()}`;

      res.json({ 
        outlookUri,
        success: true 
      });
    } catch (error: any) {
      console.error("Error creating Outlook link:", error);
      res.status(500).json({ error: "Failed to create Outlook link" });
    }
  });

  // Generate chemical order email from alerts
  app.get("/api/alerts/chemical-order-email", async (req: Request, res: Response) => {
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

      // Fetch ALL technicians with pagination
      const fetchAllTechnicians = async () => {
        const allTechs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const techData = await client.getTechnicianDetail({ offset, limit });
            if (techData.data && Array.isArray(techData.data)) {
              allTechs.push(...techData.data);
            }
            hasMore = techData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching technicians at offset", offset, e);
            break;
          }
        }
        return { data: allTechs };
      };

      // Fetch data in parallel - fetch ALL alerts
      const [alertsData, customersData, custPoolData, custNotesData, techniciansData] = await Promise.all([
        client.getAlertsList({ limit: 10000 }),
        client.getCustomerDetail({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerPoolDetails({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerNotes({ limit: 5000 }).catch(() => ({ data: [] })),
        fetchAllTechnicians()
      ]);

      // Build customer and pool maps
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          const customerId = c.RecordID;
          if (customerId) customerMap[customerId] = c;
        });
      }

      const poolToCustomerMap: Record<string, string> = {};
      if (custPoolData.data && Array.isArray(custPoolData.data)) {
        custPoolData.data.forEach((cp: any) => {
          const waterBodyId = cp.RecordID;
          const customerId = cp.CustomerID;
          if (waterBodyId && customerId) {
            poolToCustomerMap[waterBodyId] = customerId;
          }
        });
      }

      // Build customer notes map (access notes/lockbox codes from customer_notes_detail)
      const customerNotesMap: Record<string, string> = {};
      if (custNotesData.data && Array.isArray(custNotesData.data)) {
        custNotesData.data.forEach((cn: any) => {
          const customerId = cn.CustomerID;
          const noteText = cn.Note || cn.notes || cn.Notes || cn.description || "";
          if (customerId && noteText) {
            customerNotesMap[customerId] = noteText;
          }
        });
      }

      // Process alerts and filter for CHEMICAL ORDERING alerts
      const chemicalOrders: any[] = [];
      
      if (alertsData.data && Array.isArray(alertsData.data)) {
        alertsData.data.forEach((pbAlert: any) => {
          const waterBodyId = pbAlert.waterBodyId;
          const poolName = pbAlert.BodyOfWater || "Unknown Pool";
          let customerId = pbAlert.CustomerID || poolToCustomerMap[waterBodyId];
          const customer = customerId ? customerMap[customerId] : undefined;

          // Check for CHEMICAL ORDERING alert type
          let isChemicalOrderingAlert = false;
          let techNote = "";
          let message = "";
          const messages: string[] = [];
          
          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            pbAlert.AlertCategories.forEach((cat: any) => {
              // Check for CHEMICAL ORDERING category
              const catName = (cat.CategoryName || cat.AlertCategory || cat.Name || "").toUpperCase();
              if (catName.includes("CHEMICAL ORDERING") || catName.includes("CHEMICAL ORDER")) {
                isChemicalOrderingAlert = true;
              }
              
              if (cat.IssueReport && Array.isArray(cat.IssueReport)) {
                cat.IssueReport.forEach((report: any) => {
                  const reportText = report.IssueReports || report.AlertName || "";
                  if (reportText) messages.push(reportText);
                  
                  // Check if this report is CHEMICAL ORDERING
                  const reportName = (report.AlertName || "").toUpperCase();
                  if (reportName.includes("CHEMICAL ORDERING") || reportName.includes("CHEMICAL ORDER")) {
                    isChemicalOrderingAlert = true;
                  }
                });
              }
            });
          }
          
          // Get Tech Note from the alert
          techNote = pbAlert.TechNote || pbAlert.techNote || pbAlert.TechNotes || pbAlert.Notes || pbAlert.notes || "";
          message = techNote || messages.join(" | ");

          // Also check message content for chemical keywords as fallback
          const msgLower = message.toLowerCase();
          const hasChemicalKeywords = 
            msgLower.includes("chlorine") ||
            msgLower.includes("acid") ||
            msgLower.includes("algae") ||
            msgLower.includes("tank") ||
            msgLower.includes("drum") ||
            msgLower.includes("carboy") ||
            msgLower.includes("chemical") ||
            msgLower.includes("bleach") ||
            msgLower.includes("bicarb") ||
            msgLower.includes("gal") ||
            msgLower.includes("bags") ||
            msgLower.includes("neutralizer");

          // Include if it's a CHEMICAL ORDERING alert OR has chemical keywords
          const shouldInclude = isChemicalOrderingAlert || (hasChemicalKeywords && message);

          if (shouldInclude && message) {
            // ONLY use PRIMARY addresses OR when PRIMARY and BILLING are shared (same location)
            let address = "";
            let primaryAddr: any = null;
            let billingAddr: any = null;
            let accessNotes = "";
            
            if (customer?.Addresses && typeof customer.Addresses === 'object') {
              // Find PRIMARY and BILLING addresses
              Object.values(customer.Addresses).forEach((addr: any) => {
                if (addr.PrimaryAddress || addr.PrimaryCity) {
                  primaryAddr = addr;
                } else if (addr.BillingAddress || addr.BillingCity) {
                  billingAddr = addr;
                }
              });
              
              // Use PRIMARY address if it exists
              if (primaryAddr) {
                const addrLine = primaryAddr.PrimaryAddress || '';
                const city = primaryAddr.PrimaryCity || '';
                const state = primaryAddr.PrimaryState || '';
                const zip = primaryAddr.PrimaryZip || '';
                address = `${addrLine}, ${city}, ${state} ${zip}`.trim();
                accessNotes = primaryAddr.AccessNotes || "";
              }
              // If no PRIMARY but BILLING and PRIMARY share same location, use it
              else if (billingAddr && !primaryAddr) {
                // Check if billing address looks like a physical location (not a PO Box)
                const billingAddrLine = billingAddr.BillingAddress || '';
                const isPOBox = billingAddrLine.toLowerCase().includes('p.o. box') || 
                               billingAddrLine.toLowerCase().includes('po box') ||
                               billingAddrLine.toLowerCase().includes('p o box');
                
                if (!isPOBox) {
                  const city = billingAddr.BillingCity || '';
                  const state = billingAddr.BillingState || '';
                  const zip = billingAddr.BillingZip || '';
                  address = `${billingAddrLine}, ${city}, ${state} ${zip}`.trim();
                  accessNotes = billingAddr.AccessNotes || "";
                }
              }
            }

            // Only add to chemical orders if we have a valid delivery address
            if (address) {
              chemicalOrders.push({
                accountName: customer?.CustomerName || customer?.CompanyName || poolName,
                rush: msgLower.includes("urgent") || msgLower.includes("below half"),
                address: address,
                entryNotes: accessNotes,
                items: [message]
              });
            }
          }
        });
      }

      // Group by customer and combine items
      const groupedOrders: Record<string, any> = {};
      chemicalOrders.forEach(order => {
        const key = order.accountName;
        if (!groupedOrders[key]) {
          groupedOrders[key] = { ...order };
        } else {
          groupedOrders[key].items.push(...order.items);
          if (order.rush) groupedOrders[key].rush = true;
        }
      });

      const finalOrders = Object.values(groupedOrders);

      if (finalOrders.length === 0) {
        return res.json({ 
          emailText: "No chemical alerts found at this time.",
          orderCount: 0,
          emails: []
        });
      }

      // Generate chunked emails if there are many properties
      const chunkedResult = buildChunkedChemicalEmails({
        orders: finalOrders as any[],
        vendorName: "Paramount Orders",
        vendorEmail: "pmtorder@awspoolsupply.com",
        repName: "Jesus Diaz",
        repEmail: "Jesus@awspoolsupply.com",
        subject: "Alpha Chemical Order"
      });

      // For backward compatibility, also include the combined email text
      const emailText = buildChemicalOrderEmail({
        orders: finalOrders as any[],
        vendorName: "Paramount Orders",
        vendorEmail: "pmtorder@awspoolsupply.com",
        repName: "Jesus Diaz",
        repEmail: "Jesus@awspoolsupply.com",
        subject: "Alpha Chemical Order"
      });

      res.json({ 
        emailText,
        orderCount: finalOrders.length,
        orders: finalOrders,
        emails: chunkedResult.emails,
        totalParts: chunkedResult.emails.length
      });
    } catch (error: any) {
      console.error("Error generating chemical order email:", error);
      res.status(500).json({ 
        error: "Failed to generate chemical order email",
        message: error.message 
      });
    }
  });

  // Sync alerts from Pool Brain
  app.post("/api/alerts/sync", async (req: Request, res: Response) => {
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

      const alertsData = await client.getAlertsList({ limit: 150 });

      if (!alertsData.data || !Array.isArray(alertsData.data)) {
        return res.json({ message: "No alerts to sync", syncedCount: 0 });
      }

      let syncedCount = 0;
      for (const pbAlert of alertsData.data) {
        try {
          await storage.createAlert({
            poolName: pbAlert.BodyOfWater || "Unknown Pool",
            type: pbAlert.AlertType || "SystemIssue",
            message: pbAlert.message || "Alert",
            severity: pbAlert.Severity || "Medium",
          });
          syncedCount++;
        } catch (e) {
          // Ignore duplicate or error
        }
      }

      res.json({
        message: `Synced ${syncedCount} alerts from Pool Brain`,
        syncedCount,
      });
    } catch (error: any) {
      console.error("Error syncing alerts:", error);
      res.status(500).json({
        error: "Failed to sync alerts from Pool Brain",
        message: error.message,
      });
    }
  });

  // ==================== ARCHIVED ALERTS ====================

  // Get all archived alert IDs
  app.get("/api/alerts/archived", async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const archivedIds = await storage.getArchivedAlertIds(type as string | undefined);
      res.json({ archivedIds });
    } catch (error: any) {
      console.error("Error getting archived alerts:", error);
      res.status(500).json({ error: "Failed to get archived alerts" });
    }
  });

  // Archive an alert
  app.post("/api/alerts/:alertId/archive", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { type } = req.body;
      const archived = await storage.archiveAlert(alertId, type || "repair");
      res.json({ success: true, archived });
    } catch (error: any) {
      console.error("Error archiving alert:", error);
      res.status(500).json({ error: "Failed to archive alert" });
    }
  });

  // Unarchive an alert
  app.delete("/api/alerts/:alertId/archive", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      await storage.unarchiveAlert(alertId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unarchiving alert:", error);
      res.status(500).json({ error: "Failed to unarchive alert" });
    }
  });

  // Permanently delete an archived alert
  app.delete("/api/alerts/:alertId/permanent", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      await storage.deleteArchivedAlert(alertId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error permanently deleting alert:", error);
      res.status(500).json({ error: "Failed to permanently delete alert" });
    }
  });
}
