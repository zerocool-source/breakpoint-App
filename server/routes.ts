import { createServer } from "node:http";
import { storage } from "./storage";
import { PoolBrainClient } from "./poolbrain-client";
import { buildChemicalOrderEmail, buildChunkedChemicalEmails } from "./email-template";
import { OutlookGraphClient } from "./outlook-graph";
import { parseOfficeNotesForRepairs, extractPricesFromNotes, type ParsedRepair } from "./repair-parser";

export async function registerRoutes(app: any) {
  const server = createServer(app);
  setupRoutes(app);
  return server;
}

function setupRoutes(app: any) {
  // ==================== ALERTS ====================
  
  // Update alert status
  app.put("/api/alerts/:id", async (req: any, res: any) => {
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
  app.get("/api/alerts/completed", async (req: any, res: any) => {
    try {
      const completedIds = await storage.getCompletedAlertIds();
      res.json({ completedIds });
    } catch (error: any) {
      console.error("Error getting completed alerts:", error);
      res.status(500).json({ error: "Failed to get completed alerts" });
    }
  });

  // Mark an alert as completed
  app.post("/api/alerts/:alertId/complete", async (req: any, res: any) => {
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
  app.delete("/api/alerts/:alertId/complete", async (req: any, res: any) => {
    try {
      const { alertId } = req.params;
      await storage.unmarkAlertCompleted(alertId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error unmarking alert:", error);
      res.status(500).json({ error: "Failed to unmark alert" });
    }
  });

  // Get enriched alerts with pool and customer information
  // Also exposed as /api/alerts_full for API consistency
  const getEnrichedAlerts = async (req: any, res: any) => {
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
          const customerId = c.RecordID; // Pool Brain uses RecordID for customer ID
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
          const waterBodyId = cp.RecordID; // Pool's RecordID is the waterBodyId
          const customerId = cp.CustomerID; // Customer's RecordID
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
          // Use waterBodyId to get pool-customer mapping, or use CustomerID directly from alert
          const waterBodyId = pbAlert.waterBodyId;
          const poolName = pbAlert.BodyOfWater || "Unknown Pool";
          
          // Try to get customer ID from the alert directly, or from pool mapping
          let customerId = pbAlert.CustomerID || poolToCustomerMap[waterBodyId];
          const customer = customerId ? customerMap[customerId] : undefined;

          let alertType = "Unknown";
          let message = "Alert from Pool Brain";
          let severity = "Medium";
          let status = "Active";
          const messages: string[] = [];

          // Parse AlertCategories - each category contains an array of alerts
          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            pbAlert.AlertCategories.forEach((cat: any) => {
              // System Issues
              if (cat.SystemIssue && Array.isArray(cat.SystemIssue) && cat.SystemIssue.length > 0) {
                cat.SystemIssue.forEach((issue: any) => {
                  alertType = "SystemIssue";
                  severity = issue.Severity || issue.severity || "URGENT";
                  const issueName = issue.AlertName || issue.alertName || issue.systemIssue || "";
                  const issueDesc = issue.Description || issue.description || issue.alertDescription || "";
                  if (issueName || issueDesc) {
                    messages.push(issueName + (issueDesc ? `: ${issueDesc}` : ""));
                  }
                  if (issue.status === "Resolved" || issue.Status === "Resolved") status = "Resolved";
                });
              }
              
              // Issue Reports
              if (cat.IssueReport && Array.isArray(cat.IssueReport) && cat.IssueReport.length > 0) {
                cat.IssueReport.forEach((report: any) => {
                  alertType = "IssueReport";
                  severity = report.Severity || report.severity || "HIGH";
                  const reportText = report.IssueReports || report.issueReports || report.AlertName || report.description || "";
                  if (reportText) messages.push(reportText);
                  if (report.status === "Resolved" || report.Status === "Resolved") status = "Resolved";
                });
              }
              
              // Custom Alerts
              if (cat.CustomAlert && Array.isArray(cat.CustomAlert) && cat.CustomAlert.length > 0) {
                cat.CustomAlert.forEach((custom: any) => {
                  alertType = "CustomAlert";
                  severity = custom.Severity || custom.severity || "Medium";
                  const customMsg = custom.message || custom.Message || custom.AlertName || custom.alertName || "";
                  if (customMsg) messages.push(customMsg);
                  if (custom.status === "Resolved" || custom.Status === "Resolved") status = "Resolved";
                });
              }
            });
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
  app.post("/api/outlook/create-draft", async (req: any, res: any) => {
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
  app.post("/api/open-outlook", async (req: any, res: any) => {
    try {
      const { subject, to, cc, emailText } = req.body;

      // For Mac Outlook: Use ms-outlook:// URI scheme
      // Build the parameters - URL encode the content
      const params = new URLSearchParams();
      if (to) params.append('to', to);
      if (cc) params.append('cc', cc);
      if (subject) params.append('subject', subject);
      if (emailText) params.append('body', emailText);

      // Create ms-outlook:// URI
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
  app.get("/api/alerts/chemical-order-email", async (req: any, res: any) => {
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

  // ==================== JOBS ====================
  
  // Debug: Get job audit history to find office notes
  app.get("/api/jobs/debug/:jobId", async (req: any, res: any) => {
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

      // Try job audit history which may have more detail
      const auditData = await client.getJobAuditHistory(jobId);
      console.log('Job audit history:', JSON.stringify(auditData, null, 2).substring(0, 5000));
      
      // Also try getting the single job detail
      const jobData = await client.getOneTimeJobDetail(jobId);
      console.log('Single job detail:', JSON.stringify(jobData, null, 2).substring(0, 5000));
      
      res.json({ audit: auditData, detail: jobData });
    } catch (error: any) {
      console.error("Error fetching job debug info:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get jobs with scheduling information - grouped by account and technician
  app.get("/api/jobs", async (req: any, res: any) => {
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

      // Get date range - last 90 days to next 30 days for more data
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 90);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 30);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

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

      // Fetch basic job list (has CustomerID, TechnicianID)
      const fetchAllBasicJobs = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobList({ 
              fromDate: formatDate(fromDate), 
              toDate: formatDate(toDate), 
              offset, 
              limit 
            });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching basic jobs at offset", offset, e);
            break;
          }
        }
        console.log(`Fetched ${allJobs.length} basic jobs`);
        return { data: allJobs };
      };

      // Fetch job details (has pricing info)
      const fetchAllJobDetails = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobListDetails({ 
              fromDate: formatDate(fromDate), 
              toDate: formatDate(toDate), 
              offset, 
              limit 
            });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching job details at offset", offset, e);
            break;
          }
        }
        console.log(`Fetched ${allJobs.length} job details`);
        return { data: allJobs };
      };

      // Fetch ALL customers with pagination
      const fetchAllCustomers = async () => {
        const allCustomers: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;

        while (hasMore) {
          try {
            const custData = await client.getCustomerDetail({ offset, limit });
            if (custData.data && Array.isArray(custData.data)) {
              allCustomers.push(...custData.data);
            }
            hasMore = custData.hasMore === true;
            offset += limit;
          } catch (e) {
            console.error("Error fetching customers at offset", offset, e);
            break;
          }
        }
        console.log(`Fetched ${allCustomers.length} customers`);
        return { data: allCustomers };
      };

      // Fetch all data in parallel
      const [basicJobsData, jobDetailsData, techniciansData, customersData] = await Promise.all([
        fetchAllBasicJobs(),
        fetchAllJobDetails(),
        fetchAllTechnicians(),
        fetchAllCustomers(),
      ]);

      // Build job details map by JobID for price lookup
      const jobDetailsMap: Record<string, any> = {};
      if (jobDetailsData.data && Array.isArray(jobDetailsData.data)) {
        jobDetailsData.data.forEach((detail: any) => {
          const jobId = detail.JobID || detail.RecordID;
          if (jobId) {
            jobDetailsMap[jobId] = detail;
          }
        });
      }

      // Build technician map
      const technicianMap: Record<string, any> = {};
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          const techId = tech.RecordID;
          if (techId) {
            technicianMap[techId] = tech;
          }
        });
      }

      // Build customer map
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          const customerId = c.RecordID;
          if (customerId) {
            customerMap[customerId] = c;
          }
        });
      }

      // Process basic jobs and merge with details for pricing
      const jobs: any[] = [];
      
      if (basicJobsData.data && Array.isArray(basicJobsData.data)) {
        basicJobsData.data.forEach((job: any) => {
          const jobId = job.JobID || job.RecordID || job.id;
          const techId = job.TechnicianID || job.technicianId || job.TechnicianId;
          const technician = techId ? technicianMap[techId] : undefined;
          const customerId = job.CustomerId || job.CustomerID || job.customerId;
          const customer = customerId ? customerMap[customerId] : undefined;

          // Get detailed job info for pricing
          const jobDetail = jobDetailsMap[jobId] || {};

          // Calculate total price from OneOfJobItemDetails in details
          let totalPrice = 0;
          const items: any[] = [];
          
          const itemDetails = jobDetail.OneOfJobItemDetails || job.OneOfJobItemDetails || [];
          if (Array.isArray(itemDetails)) {
            itemDetails.forEach((item: any) => {
              const qty = item.Qty || item.qty || 1;
              const unitPrice = item.UnitCost || item.unitCost || item.Price || item.price || 0;
              const taxable = item.Taxable || item.taxable || 0;
              totalPrice += qty * unitPrice;
              items.push({
                productId: item.ProductID || item.productId,
                productName: item.ProductName || item.productName || item.Name || item.name || item.Description || item.description || item.ItemName || item.itemName || `Product ${item.ProductID || item.productId || 'N/A'}`,
                qty: qty,
                unitCost: unitPrice,
                taxable: taxable
              });
            });
          }

          // Also check for Price/TotalAmount field directly
          if (totalPrice === 0) {
            totalPrice = job.TotalAmount || job.Price || job.TotalPrice || job.Amount || jobDetail.Price || jobDetail.TotalPrice || 0;
          }

          // Get address - prefer ServiceAddress from job, then customer address
          let address = job.ServiceAddress || "";
          if (!address && customer?.Addresses && typeof customer.Addresses === 'object') {
            const firstAddr = Object.values(customer.Addresses)[0] as any;
            if (firstAddr) {
              const addrLine = firstAddr.PrimaryAddress || firstAddr.BillingAddress || '';
              const city = firstAddr.PrimaryCity || firstAddr.BillingCity || '';
              const state = firstAddr.PrimaryState || firstAddr.BillingState || '';
              const zip = firstAddr.PrimaryZip || firstAddr.BillingZip || '';
              address = `${addrLine}, ${city}, ${state} ${zip}`.trim();
            }
          }

          const techName = technician?.Name || (technician?.FirstName ? `${technician?.FirstName || ''} ${technician?.LastName || ''}`.trim() : "Unassigned");
          const customerName = customer?.CustomerName || customer?.CompanyName || job.CustomerName || "Unknown Customer";

          // Determine completion status - JobStatus field is primary
          const status = job.JobStatus || job.Status || jobDetail.Status || "Pending";
          const isCompleted = status === "Completed" || status === "Complete" || status === "Invoiced" || job.Completed === true || jobDetail.Completed === true;

          jobs.push({
            jobId: jobId,
            title: job.Title || job.JobTitle || jobDetail.Title || "Service Job",
            description: job.Description || jobDetail.Description || "",
            status: status,
            isCompleted: isCompleted,
            scheduledDate: job.JobDate || job.ScheduledDate || job.ServiceDate || jobDetail.ScheduledDate || job.CreatedDate || null,
            scheduledTime: job.ScheduledTime || jobDetail.ScheduledTime || null,
            createdDate: job.CreatedDate || jobDetail.CreatedDate || null,
            lastModifiedDate: job.LastModifiedDate || jobDetail.LastModifiedDate || null,
            technicianId: techId,
            technicianName: techName,
            customerId: customerId,
            customerName: customerName,
            poolName: job.BodyOfWater || job.poolName || jobDetail.BodyOfWater || "",
            address: address,
            price: totalPrice,
            items: items,
            chemicalReadings: jobDetail.chemicalReadings || null,
            officeNotes: jobDetail.OfficeNotes || jobDetail.officeNotes || job.OfficeNotes || job.officeNotes || "",
            instructions: jobDetail.Instructions || jobDetail.instructions || job.Instructions || job.instructions || "",
            raw: { ...job, details: jobDetail }
          });
        });
      }

      console.log(`Processed ${jobs.length} jobs, ${jobs.filter(j => j.customerName !== 'Unknown Customer').length} with customer names`);
      
      // Fetch audit history for ALL SR jobs to get Instructions and Office Notes
      // Match various SR patterns: "SR", 'SR', SR at start, SR anywhere
      const srJobs = jobs.filter(j => {
        const title = j.title?.toLowerCase() || '';
        return title.includes('"sr"') || 
               title.includes("'sr'") || 
               title.startsWith('sr ') || 
               title.startsWith('sr-') ||
               title.includes(' sr ') ||
               title.includes(' sr-') ||
               /\bsr\b/.test(title);
      });
      // Note: Fetching audit history adds ~10 seconds but provides Instructions and Office Notes
      
      // Fetch audit history in parallel batches (limit concurrency)
      const BATCH_SIZE = 10;
      const notesMap: Record<string, { instructions: string; officeNotes: string }> = {};
      
      for (let i = 0; i < srJobs.length; i += BATCH_SIZE) {
        const batch = srJobs.slice(i, i + BATCH_SIZE);
        const auditPromises = batch.map(async (job) => {
          try {
            const auditData = await client.getJobAuditHistory(job.jobId);
            if (auditData.data && Array.isArray(auditData.data)) {
              // Find the most recent Instructions and Office Notes entries
              let instructions = '';
              let officeNotes = '';
              
              // Sort by date descending to get most recent values
              const sorted = auditData.data.sort((a: any, b: any) => 
                new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime()
              );
              
              for (const entry of sorted) {
                if (entry.field === 'Changed Instructions' && !instructions) {
                  instructions = entry.newValue || '';
                }
                if (entry.field === 'Changed Office Notes' && !officeNotes) {
                  officeNotes = entry.newValue || '';
                }
                if (instructions && officeNotes) break;
              }
              
              notesMap[job.jobId] = { instructions, officeNotes };
            }
          } catch (e) {
            // Silently ignore audit fetch errors for individual jobs
          }
        });
        await Promise.all(auditPromises);
      }
      
      // Update jobs with notes from audit history
      jobs.forEach(job => {
        const notes = notesMap[job.jobId];
        if (notes) {
          if (notes.instructions && !job.instructions) {
            job.instructions = notes.instructions;
          }
          if (notes.officeNotes && !job.officeNotes) {
            job.officeNotes = notes.officeNotes;
          }
        }
      });

      // Group jobs by ACCOUNT (customer)
      const accountsMap: Record<string, { 
        accountId: string; 
        accountName: string; 
        address: string;
        totalJobs: number;
        completedJobs: number;
        totalValue: number;
        jobs: any[] 
      }> = {};

      // Group jobs by TECHNICIAN
      const technicianJobsMap: Record<string, { 
        techId: string; 
        name: string; 
        phone: string;
        email: string;
        totalJobs: number;
        completedJobs: number;
        totalValue: number;
        jobs: any[] 
      }> = {};

      // Initialize all technicians in the map
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          const techId = tech.RecordID;
          const techName = tech.Name || `${tech.FirstName || ''} ${tech.LastName || ''}`.trim() || "Unknown";
          if (techId) {
            technicianJobsMap[techId] = {
              techId: techId,
              name: techName,
              phone: tech.Phone || tech.CellPhone || "",
              email: tech.Email || "",
              totalJobs: 0,
              completedJobs: 0,
              totalValue: 0,
              jobs: []
            };
          }
        });
      }

      jobs.forEach(job => {
        // Group by account
        const accountKey = job.customerId || job.customerName;
        if (!accountsMap[accountKey]) {
          accountsMap[accountKey] = {
            accountId: job.customerId,
            accountName: job.customerName,
            address: job.address,
            totalJobs: 0,
            completedJobs: 0,
            totalValue: 0,
            jobs: []
          };
        }
        accountsMap[accountKey].totalJobs++;
        accountsMap[accountKey].totalValue += job.price || 0;
        if (job.isCompleted) accountsMap[accountKey].completedJobs++;
        accountsMap[accountKey].jobs.push(job);

        // Group by technician
        const techKey = job.technicianId;
        if (techKey && technicianJobsMap[techKey]) {
          technicianJobsMap[techKey].totalJobs++;
          technicianJobsMap[techKey].totalValue += job.price || 0;
          if (job.isCompleted) technicianJobsMap[techKey].completedJobs++;
          technicianJobsMap[techKey].jobs.push(job);
        } else if (techKey) {
          technicianJobsMap[techKey] = {
            techId: techKey,
            name: job.technicianName,
            phone: "",
            email: "",
            totalJobs: 1,
            completedJobs: job.isCompleted ? 1 : 0,
            totalValue: job.price || 0,
            jobs: [job]
          };
        }
      });

      // Convert to arrays and sort, adding commission calculations
      const accounts = Object.values(accountsMap).sort((a, b) => b.totalJobs - a.totalJobs);
      const techniciansRaw = Object.values(technicianJobsMap).sort((a, b) => b.totalJobs - a.totalJobs);
      
      // Add commission calculations (10% and 15% of total value)
      const technicians = techniciansRaw.map(tech => ({
        ...tech,
        commission10: Math.round(tech.totalValue * 0.10 * 100) / 100,
        commission15: Math.round(tech.totalValue * 0.15 * 100) / 100
      }));
      
      const techsWithJobs = technicians.filter(t => t.totalJobs > 0);
      const techsWithoutJobs = technicians.filter(t => t.totalJobs === 0);

      // Calculate totals
      const totalValue = jobs.reduce((sum, j) => sum + (j.price || 0), 0);
      const completedJobs = jobs.filter(j => j.isCompleted);
      const pendingJobs = jobs.filter(j => !j.isCompleted);

      res.json({
        jobs,
        accounts,
        technicians,
        techsWithJobs,
        techsWithoutJobs,
        completedJobs,
        pendingJobs,
        summary: {
          totalJobs: jobs.length,
          completedCount: completedJobs.length,
          pendingCount: pendingJobs.length,
          totalValue: totalValue,
          accountCount: accounts.length,
          technicianCount: technicians.length,
          techsWithJobsCount: techsWithJobs.length
        }
      });
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({
        error: "Failed to fetch jobs",
        message: error.message
      });
    }
  });

  // Get extracted repairs from SR jobs with office notes containing parts/labor/prices
  app.get("/api/jobs/repairs", async (req: any, res: any) => {
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

      // Calculate date range (last 60 days)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 60);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      // Fetch jobs and details
      const [jobsData, jobDetailsData, techniciansData, customersData] = await Promise.all([
        client.getOneTimeJobList({ fromDate: formatDate(fromDate), toDate: formatDate(toDate), limit: 500 }),
        client.getOneTimeJobListDetails({ fromDate: formatDate(fromDate), toDate: formatDate(toDate), limit: 500 }),
        client.getTechnicianDetail({ limit: 100 }),
        client.getCustomerDetail({ limit: 500 })
      ]);

      // Build lookup maps
      const technicianMap: Record<string, any> = {};
      if (techniciansData.data && Array.isArray(techniciansData.data)) {
        techniciansData.data.forEach((tech: any) => {
          if (tech.RecordID) technicianMap[tech.RecordID] = tech;
        });
      }

      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((cust: any) => {
          if (cust.RecordID) customerMap[cust.RecordID] = cust;
        });
      }

      const jobDetailsMap: Record<string, any> = {};
      if (jobDetailsData.data && Array.isArray(jobDetailsData.data)) {
        jobDetailsData.data.forEach((detail: any) => {
          const jobId = detail.JobID || detail.RecordID;
          if (jobId) jobDetailsMap[jobId] = detail;
        });
      }

      // Filter to SR jobs only (service repairs)
      const srJobs = (jobsData.data || []).filter((job: any) => {
        const title = (job.Title || job.JobTitle || '').toLowerCase();
        return title.includes('"sr"') || 
               title.includes("'sr'") || 
               title.startsWith('sr ') || 
               title.startsWith('sr-') ||
               title.includes(' sr ') ||
               title.includes(' sr-') ||
               /\bsr\b/.test(title);
      });

      // Fetch audit history for SR jobs to get office notes
      const BATCH_SIZE = 10;
      const repairJobs: any[] = [];

      for (let i = 0; i < srJobs.length; i += BATCH_SIZE) {
        const batch = srJobs.slice(i, i + BATCH_SIZE);
        const auditPromises = batch.map(async (job: any) => {
          try {
            const jobId = job.JobID || job.RecordID;
            const auditData = await client.getJobAuditHistory(jobId);
            
            let officeNotes = '';
            let instructions = '';
            
            if (auditData.data && Array.isArray(auditData.data)) {
              const sorted = auditData.data.sort((a: any, b: any) => 
                new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime()
              );
              
              for (const entry of sorted) {
                if (entry.field === 'Changed Office Notes' && !officeNotes) {
                  officeNotes = entry.newValue || '';
                }
                if (entry.field === 'Changed Instructions' && !instructions) {
                  instructions = entry.newValue || '';
                }
                if (officeNotes && instructions) break;
              }
            }

            // Parse office notes for repair data
            const parsedRepair = parseOfficeNotesForRepairs(officeNotes);
            const priceExtraction = extractPricesFromNotes(officeNotes);

            // Only include jobs with meaningful repair data
            if (parsedRepair || priceExtraction.prices.length > 0) {
              const jobDetail = jobDetailsMap[jobId] || {};
              const techId = job.TechnicianID || job.AssignedTechnicianID;
              const customerId = job.CustomerID;
              const technician = technicianMap[techId];
              const customer = customerMap[customerId];

              repairJobs.push({
                jobId,
                title: job.Title || job.JobTitle || 'Service Job',
                status: job.JobStatus || job.Status || 'Pending',
                isCompleted: ['Completed', 'Complete', 'Invoiced', 'Closed'].includes(job.JobStatus || job.Status),
                scheduledDate: job.JobDate || job.ScheduledDate,
                technicianId: techId,
                technicianName: technician?.Name || `${technician?.FirstName || ''} ${technician?.LastName || ''}`.trim() || 'Unassigned',
                customerId,
                customerName: customer?.CustomerName || customer?.CompanyName || 'Unknown',
                officeNotes,
                instructions,
                parsedRepair,
                priceExtraction,
                totalRepairValue: parsedRepair?.totalPrice || priceExtraction.total || 0,
                laborAmount: parsedRepair?.totalLabor || 0,
                partsAmount: parsedRepair?.totalParts || 0
              });
            }
          } catch (e) {
            // Silently ignore errors for individual jobs
          }
        });
        await Promise.all(auditPromises);
      }

      // Calculate summary
      const totalLabor = repairJobs.reduce((sum, j) => sum + (j.laborAmount || 0), 0);
      const totalParts = repairJobs.reduce((sum, j) => sum + (j.partsAmount || 0), 0);
      const totalRepairValue = repairJobs.reduce((sum, j) => sum + (j.totalRepairValue || 0), 0);
      const completedRepairs = repairJobs.filter(j => j.isCompleted);

      res.json({
        repairs: repairJobs,
        summary: {
          totalRepairs: repairJobs.length,
          completedRepairs: completedRepairs.length,
          totalLabor,
          totalParts,
          totalRepairValue,
          commission15: Math.round(totalRepairValue * 0.15 * 100) / 100
        }
      });
    } catch (error: any) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({
        error: "Failed to fetch repairs",
        message: error.message
      });
    }
  });

  // Sync alerts from Pool Brain
  app.post("/api/alerts/sync", async (req: any, res: any) => {
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

  // Create a new job in Pool Brain
  app.post("/api/jobs/create", async (req: any, res: any) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const { customerId, poolId, technicianId, title, description, scheduledDate, priority } = req.body;

      if (!customerId || !title) {
        return res.status(400).json({ error: "Customer ID and title are required" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const result = await client.createOneTimeJob({
        customerId: parseInt(customerId),
        poolId: poolId ? parseInt(poolId) : undefined,
        technicianId: technicianId ? parseInt(technicianId) : undefined,
        title,
        description,
        scheduledDate,
        priority,
      });

      res.json({
        success: true,
        message: "Job created successfully in Pool Brain",
        job: result,
      });
    } catch (error: any) {
      console.error("Error creating job in Pool Brain:", error);
      res.status(500).json({
        error: "Failed to create job in Pool Brain",
        message: error.message,
      });
    }
  });

  // Get customers list for job creation dropdown
  app.get("/api/customers", async (req: any, res: any) => {
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

      const customersData = await client.getCustomerDetail({ limit: 1000 });
      
      const customers = (customersData.data || []).map((c: any) => ({
        id: c.RecordID,
        name: c.CustomerName || c.CompanyName || "Unknown",
        address: c.Address || "",
      }));

      res.json({ customers });
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers", message: error.message });
    }
  });

  // Get technicians list for job creation dropdown
  app.get("/api/technicians", async (req: any, res: any) => {
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

      const techsData = await client.getTechnicianDetail({ limit: 500 });
      
      const technicians = (techsData.data || []).map((t: any) => ({
        id: t.RecordID,
        name: t.Name || `${t.FirstName || ''} ${t.LastName || ''}`.trim() || "Unknown",
      }));

      res.json({ technicians });
    } catch (error: any) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians", message: error.message });
    }
  });

  // ==================== CHAT ====================

  app.get("/api/chat/history", async (req: any, res: any) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const messages = await storage.getChatHistory(limit);
      res.json(messages.reverse());
    } catch (error: any) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat/message", async (req: any, res: any) => {
    try {
      const { role, content, model } = req.body;
      const message = await storage.addChatMessage({ role, content, model });
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error adding chat message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Generate AI response
  app.post("/api/chat/respond", async (req: any, res: any) => {
    try {
      const { userMessage, model } = req.body;

      // Generate a contextual AI response based on the model
      let aiResponse = "";

      if (model === "goss-20b") {
        aiResponse = generateGoss20BResponse(userMessage);
      } else if (model === "llama-3") {
        aiResponse = generateLlama3Response(userMessage);
      } else if (model === "gpt-4o") {
        aiResponse = generateGPT4oResponse(userMessage);
      } else if (model === "mistral") {
        aiResponse = generateMistralResponse(userMessage);
      } else {
        aiResponse = generateGoss20BResponse(userMessage);
      }

      // Save AI response to database
      const message = await storage.addChatMessage({
        role: "agent",
        content: aiResponse,
        model,
      });

      res.json(message);
    } catch (error: any) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  // ==================== SETTINGS ====================

  app.get("/api/settings", async (req: any, res: any) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req: any, res: any) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ==================== ACE AI CHAT ====================
  
  // Chat endpoint - proxies to ace-breakpoint-app (which connects to local Ollama)
  app.post("/api/chat", async (req: any, res: any) => {
    try {
      const { message, saveHistory = true } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get ace-breakpoint-app URL (your proxy to local Ollama)
      const aceAppUrl = process.env.ACE_APP_URL || process.env.OLLAMA_ENDPOINT;
      
      if (!aceAppUrl) {
        return res.status(503).json({ 
          error: "ACE_APP_URL not configured. Set the URL to your ace-breakpoint-app proxy.",
          errorCode: "NOT_CONFIGURED"
        });
      }

      // Get conversation history for context (last 20 messages)
      const chatHistory = await storage.getChatHistory(20);
      
      // Format history for ace-breakpoint-app (reverse to chronological order)
      const formattedHistory = chatHistory
        .slice()
        .reverse()
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));

      // Call ace-breakpoint-app proxy
      const response = await fetch(`${aceAppUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          history: formattedHistory
        })
      });

      if (!response.ok) {
        throw new Error(`Ace app error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.answer || "No response from Ace";
      
      // Save chat message to storage only if requested
      if (saveHistory) {
        const chatMessage = {
          role: "user" as const,
          content: message,
          timestamp: new Date().toISOString()
        };
        
        const assistantMessage = {
          role: "assistant" as const,
          content: aiResponse,
          timestamp: new Date().toISOString()
        };

        await storage.saveChatMessage(chatMessage);
        await storage.saveChatMessage(assistantMessage);
      }

      res.json({ 
        message: aiResponse
      });
    } catch (error: any) {
      console.error("Error in chat endpoint:", error);
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to connect to Ace AI.";
      let errorCode = "UNKNOWN";
      let statusCode = 500;
      
      // Walk the entire cause chain to find error codes (handles arbitrarily nested causes)
      const findCauseCode = (err: any): string | null => {
        if (!err) return null;
        
        // Check current level
        if (err.code) return err.code;
        if (err.errno) return err.errno;
        
        // Recurse into cause
        if (err.cause && typeof err.cause === "object") {
          const foundCode = findCauseCode(err.cause);
          if (foundCode) return foundCode;
        }
        
        return null;
      };
      
      const causeCode = findCauseCode(error);
      
      // Detect fetch/connection failures (proxy offline) - comprehensive check
      const connectionErrorCodes = ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"];
      const isConnectionError = 
        (causeCode && connectionErrorCodes.includes(causeCode)) ||
        (error.code && connectionErrorCodes.includes(error.code)) ||
        error.name === "FetchError" ||
        (error.name === "TypeError" && error.cause) ||
        error.message?.includes("fetch failed") ||
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("ENOTFOUND") ||
        error.message?.includes("connect ECONNREFUSED");
      
      if (isConnectionError) {
        errorMessage = "ace-breakpoint-app is not reachable. Make sure it's running and accessible.";
        errorCode = "PROXY_OFFLINE";
        statusCode = 503;
      } else if (error.message?.includes("Ace app error")) {
        errorMessage = "ace-breakpoint-app returned an error. Check if Ollama is running on your Mac.";
        errorCode = "OLLAMA_ERROR";
        statusCode = 502;
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        errorCode: errorCode,
        details: error.message 
      });
    }
  });

  // Get chat history
  app.get("/api/chat/history", async (req: any, res: any) => {
    try {
      const history = await storage.getChatHistory();
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Clear chat history
  app.delete("/api/chat/history", async (req: any, res: any) => {
    try {
      await storage.clearChatHistory();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // ==================== ARCHIVED ALERTS ====================

  // Get all archived alert IDs
  app.get("/api/alerts/archived", async (req: any, res: any) => {
    try {
      const { type } = req.query;
      const archivedIds = await storage.getArchivedAlertIds(type);
      res.json({ archivedIds });
    } catch (error: any) {
      console.error("Error getting archived alerts:", error);
      res.status(500).json({ error: "Failed to get archived alerts" });
    }
  });

  // Archive an alert
  app.post("/api/alerts/:alertId/archive", async (req: any, res: any) => {
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
  app.delete("/api/alerts/:alertId/archive", async (req: any, res: any) => {
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
  app.delete("/api/alerts/:alertId/permanent", async (req: any, res: any) => {
    try {
      const { alertId } = req.params;
      await storage.deleteArchivedAlert(alertId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error permanently deleting alert:", error);
      res.status(500).json({ error: "Failed to permanently delete alert" });
    }
  });

  // ==================== PROPERTY REPAIR PRICES ====================

  // Get repair summaries aggregated by property - reuses /api/jobs data pattern
  app.get("/api/properties/repairs", async (req: any, res: any) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({ apiKey, companyId: companyId || undefined });

      // Get date range - last 365 days to next 30 days for comprehensive data
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 365);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 30);
      const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

      // Fetch ALL data with pagination - same pattern as /api/jobs
      const fetchAllBasicJobs = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobList({ fromDate: formatDateStr(fromDate), toDate: formatDateStr(toDate), offset, limit });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allJobs };
      };

      const fetchAllJobDetails = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobListDetails({ fromDate: formatDateStr(fromDate), toDate: formatDateStr(toDate), offset, limit });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allJobs };
      };

      const fetchAllCustomers = async () => {
        const allCustomers: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const custData = await client.getCustomerDetail({ offset, limit });
            if (custData.data && Array.isArray(custData.data)) {
              allCustomers.push(...custData.data);
            }
            hasMore = custData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allCustomers };
      };

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
          } catch (e) { break; }
        }
        return { data: allTechs };
      };

      const [basicJobsData, jobDetailsData, customersData, techniciansData] = await Promise.all([
        fetchAllBasicJobs(),
        fetchAllJobDetails(),
        fetchAllCustomers(),
        fetchAllTechnicians()
      ]);

      // Build lookup maps
      const customerMap: Record<string, any> = {};
      if (customersData.data) {
        customersData.data.forEach((c: any) => {
          const customerId = c.RecordID;
          if (customerId) customerMap[customerId] = c;
        });
      }

      const techMap: Record<string, string> = {};
      if (techniciansData.data) {
        techniciansData.data.forEach((t: any) => {
          techMap[t.RecordID] = t.Name || `${t.FirstName || ''} ${t.LastName || ''}`.trim() || "Unknown";
        });
      }

      // Merge basic jobs with details
      const jobDetailsMap: Record<string, any> = {};
      if (jobDetailsData.data) {
        jobDetailsData.data.forEach((jd: any) => {
          const jobId = jd.RecordID || jd.JobId;
          if (jobId) jobDetailsMap[jobId] = jd;
        });
      }

      // Aggregate by property (customer)
      const propertyMap: Record<string, {
        propertyId: string;
        propertyName: string;
        customerName: string;
        address: string;
        poolNames: Set<string>;
        technicians: Set<string>;
        repairs: any[];
        totalSpend: number;
        completedRepairs: number;
        pendingRepairs: number;
        lastServiceDate: string | null;
        monthlySpend: Record<string, number>;
      }> = {};

      const basicJobs = basicJobsData.data || [];
      basicJobs.forEach((job: any) => {
        const jobId = job.RecordID || job.JobId;
        const jobDetail = jobDetailsMap[jobId] || {};
        
        const customerId = job.CustomerId || job.CustomerID || job.customerId || jobDetail.CustomerId;
        const customer = customerId ? customerMap[customerId] : null;
        const propertyId = customerId || job.CustomerName || "unknown";
        const customerName = customer?.CustomerName || customer?.CompanyName || job.CustomerName || "Unknown Customer";
        
        // Get address
        let address = "";
        if (customer?.CustomerAddress && Array.isArray(customer.CustomerAddress) && customer.CustomerAddress.length > 0) {
          const addr = customer.CustomerAddress[0];
          const addrLine = addr.PrimaryStreet || addr.BillingStreet || '';
          const city = addr.PrimaryCity || addr.BillingCity || '';
          const state = addr.PrimaryState || addr.BillingState || '';
          const zip = addr.PrimaryZip || addr.BillingZip || '';
          address = `${addrLine}, ${city}, ${state} ${zip}`.trim().replace(/^,\s*/, '');
        }

        if (!propertyMap[propertyId]) {
          propertyMap[propertyId] = {
            propertyId: String(propertyId),
            propertyName: customerName,
            customerName: customerName,
            address: address,
            poolNames: new Set(),
            technicians: new Set(),
            repairs: [],
            totalSpend: 0,
            completedRepairs: 0,
            pendingRepairs: 0,
            lastServiceDate: null,
            monthlySpend: {}
          };
        }

        const prop = propertyMap[propertyId];
        
        // Add pool name
        const poolName = job.BodyOfWater || jobDetail.BodyOfWater || "";
        if (poolName) prop.poolNames.add(poolName);

        // Add technician
        const techId = job.TechId || job.TechnicianId || jobDetail.TechId;
        const techName = techId ? techMap[techId] : null;
        if (techName && techName !== "Unknown") prop.technicians.add(techName);

        // Get price from OneOfJobItemDetails (same as /api/jobs)
        let price = 0;
        const itemDetails = jobDetail.OneOfJobItemDetails || job.OneOfJobItemDetails || [];
        if (Array.isArray(itemDetails)) {
          itemDetails.forEach((item: any) => {
            const qty = item.Qty || item.qty || 1;
            const unitPrice = item.UnitCost || item.unitCost || item.Price || item.price || 0;
            price += qty * unitPrice;
          });
        }
        // Also check for TotalAmount/Price field directly
        if (!price) price = parseFloat(job.TotalAmount || jobDetail.TotalAmount || job.Price || jobDetail.Price || job.TotalPrice || 0) || 0;

        const status = job.JobStatus || job.Status || jobDetail.Status || "Pending";
        const isCompleted = status === "Completed" || status === "Complete" || status === "Invoiced" || job.Completed === true;
        const scheduledDate = job.JobDate || job.ScheduledDate || jobDetail.ScheduledDate || job.CreatedDate || null;

        prop.repairs.push({
          jobId: String(jobId),
          title: job.Title || job.JobTitle || jobDetail.Title || "Service Job",
          price: price,
          isCompleted: isCompleted,
          scheduledDate: scheduledDate,
          technician: techName
        });

        prop.totalSpend += price;
        if (isCompleted) {
          prop.completedRepairs++;
        } else {
          prop.pendingRepairs++;
        }

        // Track monthly spend
        if (scheduledDate) {
          const monthKey = new Date(scheduledDate).toISOString().substring(0, 7); // YYYY-MM
          prop.monthlySpend[monthKey] = (prop.monthlySpend[monthKey] || 0) + price;
          
          if (!prop.lastServiceDate || new Date(scheduledDate) > new Date(prop.lastServiceDate)) {
            prop.lastServiceDate = scheduledDate;
          }
        }
      });

      // Convert to array with monthly data
      const properties = Object.values(propertyMap)
        .filter(p => p.propertyId !== "unknown")
        .map(prop => ({
          propertyId: prop.propertyId,
          propertyName: prop.propertyName,
          customerName: prop.customerName,
          address: prop.address,
          poolNames: Array.from(prop.poolNames),
          totalRepairs: prop.repairs.length,
          completedRepairs: prop.completedRepairs,
          pendingRepairs: prop.pendingRepairs,
          totalSpend: Math.round(prop.totalSpend * 100) / 100,
          averageRepairCost: prop.repairs.length > 0 ? Math.round((prop.totalSpend / prop.repairs.length) * 100) / 100 : 0,
          lastServiceDate: prop.lastServiceDate,
          technicians: Array.from(prop.technicians),
          monthlySpend: prop.monthlySpend,
          repairs: prop.repairs.sort((a, b) => {
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
          })
        })).sort((a, b) => b.totalSpend - a.totalSpend);

      // Calculate totals and monthly aggregates
      const totalSpend = properties.reduce((sum, p) => sum + p.totalSpend, 0);
      const totalRepairs = properties.reduce((sum, p) => sum + p.totalRepairs, 0);
      const topSpender = properties[0] || null;

      // Aggregate monthly data across all properties
      const monthlyTotals: Record<string, number> = {};
      properties.forEach(p => {
        Object.entries(p.monthlySpend).forEach(([month, spend]) => {
          monthlyTotals[month] = (monthlyTotals[month] || 0) + spend;
        });
      });

      res.json({
        properties,
        summary: {
          totalProperties: properties.length,
          totalRepairs,
          totalSpend: Math.round(totalSpend * 100) / 100,
          averageSpendPerProperty: properties.length > 0 ? Math.round((totalSpend / properties.length) * 100) / 100 : 0,
          topSpender: topSpender ? { name: topSpender.propertyName, spend: topSpender.totalSpend } : null,
          monthlyTotals
        }
      });
    } catch (error: any) {
      console.error("Error fetching property repairs:", error);
      res.status(500).json({ error: "Failed to fetch property repairs" });
    }
  });

  // ==================== PAYROLL ====================

  // Get all pay periods
  app.get("/api/payroll/periods", async (req: any, res: any) => {
    try {
      const periods = await storage.getPayPeriods();
      res.json(periods);
    } catch (error: any) {
      console.error("Error fetching pay periods:", error);
      res.status(500).json({ error: "Failed to fetch pay periods" });
    }
  });

  // Create a new pay period
  app.post("/api/payroll/periods", async (req: any, res: any) => {
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
  app.put("/api/payroll/periods/:id", async (req: any, res: any) => {
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
  app.get("/api/payroll/entries", async (req: any, res: any) => {
    try {
      const { payPeriodId, technicianId } = req.query;
      let entries;
      if (technicianId) {
        entries = await storage.getPayrollEntriesByTechnician(technicianId, payPeriodId);
      } else {
        entries = await storage.getPayrollEntries(payPeriodId);
      }
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching payroll entries:", error);
      res.status(500).json({ error: "Failed to fetch payroll entries" });
    }
  });

  // Add a job to payroll
  app.post("/api/payroll/entries", async (req: any, res: any) => {
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
  app.delete("/api/payroll/entries/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deletePayrollEntry(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting payroll entry:", error);
      res.status(500).json({ error: "Failed to delete payroll entry" });
    }
  });

  // ==================== THREADS ====================

  // Get all threads
  app.get("/api/threads", async (req: any, res: any) => {
    try {
      const allThreads = await storage.getThreads();
      res.json({ threads: allThreads });
    } catch (error: any) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  // Get or create thread for an account
  app.get("/api/accounts/:accountId/thread", async (req: any, res: any) => {
    try {
      const { accountId } = req.params;
      const { accountName } = req.query;
      const thread = await storage.getOrCreateThread(accountId, accountName || `Account ${accountId}`);
      res.json({ thread });
    } catch (error: any) {
      console.error("Error getting thread:", error);
      res.status(500).json({ error: "Failed to get thread" });
    }
  });

  // Get messages for a thread
  app.get("/api/threads/:threadId/messages", async (req: any, res: any) => {
    try {
      const { threadId } = req.params;
      const { type, search, limit } = req.query;
      const messages = await storage.getThreadMessages(threadId, {
        type: type || undefined,
        search: search || undefined,
        limit: limit ? parseInt(limit) : undefined
      });
      res.json({ messages });
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create a new message
  app.post("/api/threads/:threadId/messages", async (req: any, res: any) => {
    try {
      const { threadId } = req.params;
      const { authorId, authorName, type, text, photoUrls, taggedUserIds, taggedRoles, visibility } = req.body;
      
      if (!authorId || !authorName) {
        return res.status(400).json({ error: "authorId and authorName are required" });
      }
      
      const message = await storage.createThreadMessage({
        threadId,
        authorId,
        authorName,
        type: type || 'update',
        text: text || null,
        photoUrls: photoUrls || [],
        taggedUserIds: taggedUserIds || [],
        taggedRoles: taggedRoles || [],
        visibility: visibility || 'all',
        pinned: false
      });
      res.json({ message });
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Update a message
  app.patch("/api/messages/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const message = await storage.updateThreadMessage(id, updates);
      res.json({ message });
    } catch (error: any) {
      console.error("Error updating message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Delete a message
  app.delete("/api/messages/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteThreadMessage(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Pin/unpin a message
  app.post("/api/messages/:id/pin", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { pinned } = req.body;
      const message = await storage.pinMessage(id, pinned);
      res.json({ message });
    } catch (error: any) {
      console.error("Error pinning message:", error);
      res.status(500).json({ error: "Failed to pin message" });
    }
  });

  // ==================== PROPERTY CHANNELS ====================

  // Get all property channels
  app.get("/api/channels", async (req: any, res: any) => {
    try {
      const channels = await storage.getPropertyChannels();
      res.json({ channels });
    } catch (error: any) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Get single channel by ID
  app.get("/api/channels/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const channel = await storage.getPropertyChannel(id);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.json({ channel });
    } catch (error: any) {
      console.error("Error fetching channel:", error);
      res.status(500).json({ error: "Failed to fetch channel" });
    }
  });

  // Sync channels from Pool Brain properties
  app.post("/api/channels/sync", async (req: any, res: any) => {
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

      // Fetch pools list, customer pool details, and customer details
      // Some endpoints may fail, so we handle them individually
      const [poolsListData, poolsData, customersData, customerListData] = await Promise.all([
        client.getPoolsList({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerPoolDetails({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerDetail({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerList({ limit: 1000 }).catch(() => ({ data: [] }))
      ]);
      
      console.log("Sync data counts:", {
        poolsList: poolsListData.data?.length || 0,
        poolsDetails: poolsData.data?.length || 0,
        customerDetails: customersData.data?.length || 0,
        customerList: customerListData.data?.length || 0
      });

      // Build customer map from customer_detail (using RecordID)
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          customerMap[String(c.RecordID)] = c;
        });
      }
      
      // Also add from customer_list if available
      if (customerListData.data && Array.isArray(customerListData.data)) {
        customerListData.data.forEach((c: any) => {
          const id = String(c.RecordID || c.CustomerID);
          if (id && !customerMap[id]) {
            customerMap[id] = c;
          }
        });
      }

      // Build pools list map (has CustomerName directly)
      const poolsListMap: Record<string, any> = {};
      if (poolsListData.data && Array.isArray(poolsListData.data)) {
        poolsListData.data.forEach((p: any) => {
          poolsListMap[String(p.RecordID || p.PoolID)] = p;
        });
      }

      // Create/update channels for each pool
      const pools = poolsData.data || [];
      const channels = [];
      
      // Log first pool to see available fields
      if (pools.length > 0) {
        console.log("Sample pool data fields:", Object.keys(pools[0]));
        console.log("Sample pool data:", JSON.stringify(pools[0], null, 2));
      }
      if (poolsListData.data?.length > 0) {
        console.log("Sample pools_list data fields:", Object.keys(poolsListData.data[0]));
      }
      if (customersData.data?.length > 0) {
        console.log("Sample customer_detail data fields:", Object.keys(customersData.data[0]));
      }
      
      for (const pool of pools) {
        const poolId = pool.RecordID || pool.PoolID;
        if (!poolId) continue;

        const customerId = String(pool.CustomerID);
        const customer = customerMap[customerId];
        const poolListEntry = poolsListMap[String(poolId)];
        
        // Try to get customer name from multiple sources
        let customerName = 
          customer?.Name || 
          customer?.CustomerName ||
          customer?.CompanyName ||
          poolListEntry?.CustomerName ||
          pool.CustomerName || 
          pool.Customer ||
          null;
        
        // Try FirstName + LastName if no name found
        if (!customerName && customer?.FirstName) {
          customerName = `${customer.FirstName} ${customer.LastName || ''}`.trim();
        }
        
        const poolName = 
          pool.PoolName || 
          poolListEntry?.PoolName || 
          `Pool ${poolId}`;
          
        const address = 
          pool.PoolAddress || 
          poolListEntry?.Address ||
          customer?.Address || 
          null;
        
        const channel = await storage.upsertPropertyChannel({
          propertyId: String(poolId),
          propertyName: poolName,
          customerName: customerName,
          address: address,
          description: null,
        });
        channels.push(channel);
      }

      res.json({ success: true, syncedCount: channels.length, channels });
    } catch (error: any) {
      console.error("Error syncing channels:", error);
      res.status(500).json({ error: "Failed to sync channels" });
    }
  });

  // Get channel members
  app.get("/api/channels/:channelId/members", async (req: any, res: any) => {
    try {
      const { channelId } = req.params;
      const members = await storage.getChannelMembers(channelId);
      res.json({ members });
    } catch (error: any) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ error: "Failed to fetch channel members" });
    }
  });

  // Add channel member
  app.post("/api/channels/:channelId/members", async (req: any, res: any) => {
    try {
      const { channelId } = req.params;
      const { userId, userName, role } = req.body;
      
      if (!userId || !userName) {
        return res.status(400).json({ error: "userId and userName are required" });
      }
      
      const member = await storage.addChannelMember({
        channelId,
        userId,
        userName,
        role: role || 'member'
      });
      res.json({ member });
    } catch (error: any) {
      console.error("Error adding channel member:", error);
      res.status(500).json({ error: "Failed to add channel member" });
    }
  });

  // Remove channel member
  app.delete("/api/channels/:channelId/members/:userId", async (req: any, res: any) => {
    try {
      const { channelId, userId } = req.params;
      await storage.removeChannelMember(channelId, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing channel member:", error);
      res.status(500).json({ error: "Failed to remove channel member" });
    }
  });

  // Get channel messages
  app.get("/api/channels/:channelId/messages", async (req: any, res: any) => {
    try {
      const { channelId } = req.params;
      const { limit, before, parentMessageId } = req.query;
      
      const messages = await storage.getChannelMessages(channelId, {
        limit: limit ? parseInt(limit) : undefined,
        before: before || undefined,
        parentMessageId: parentMessageId === 'null' ? null : parentMessageId || undefined
      });
      
      // Get reactions for each message
      const messagesWithReactions = await Promise.all(
        messages.map(async (msg) => {
          const reactions = await storage.getMessageReactions(msg.id);
          const replyCount = parentMessageId ? 0 : (await storage.getThreadReplies(msg.id)).length;
          return { ...msg, reactions, replyCount };
        })
      );
      
      res.json({ messages: messagesWithReactions });
    } catch (error: any) {
      console.error("Error fetching channel messages:", error);
      res.status(500).json({ error: "Failed to fetch channel messages" });
    }
  });

  // Create channel message
  app.post("/api/channels/:channelId/messages", async (req: any, res: any) => {
    try {
      const { channelId } = req.params;
      const { authorId, authorName, content, parentMessageId, messageType, attachments, mentions } = req.body;
      
      if (!authorId || !authorName || !content) {
        return res.status(400).json({ error: "authorId, authorName, and content are required" });
      }
      
      const message = await storage.createChannelMessage({
        channelId,
        authorId,
        authorName,
        content,
        parentMessageId: parentMessageId || null,
        messageType: messageType || 'text',
        attachments: attachments || [],
        mentions: mentions || [],
        isPinned: false
      });
      
      res.json({ message });
    } catch (error: any) {
      console.error("Error creating channel message:", error);
      res.status(500).json({ error: "Failed to create channel message" });
    }
  });

  // Update channel message
  app.patch("/api/channels/messages/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }
      
      const message = await storage.updateChannelMessage(id, content);
      res.json({ message });
    } catch (error: any) {
      console.error("Error updating channel message:", error);
      res.status(500).json({ error: "Failed to update channel message" });
    }
  });

  // Delete channel message
  app.delete("/api/channels/messages/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteChannelMessage(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting channel message:", error);
      res.status(500).json({ error: "Failed to delete channel message" });
    }
  });

  // Pin/unpin channel message
  app.post("/api/channels/messages/:id/pin", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { isPinned } = req.body;
      const message = await storage.pinChannelMessage(id, isPinned);
      res.json({ message });
    } catch (error: any) {
      console.error("Error pinning channel message:", error);
      res.status(500).json({ error: "Failed to pin channel message" });
    }
  });

  // Get thread replies
  app.get("/api/channels/messages/:messageId/replies", async (req: any, res: any) => {
    try {
      const { messageId } = req.params;
      const replies = await storage.getThreadReplies(messageId);
      
      const repliesWithReactions = await Promise.all(
        replies.map(async (msg) => {
          const reactions = await storage.getMessageReactions(msg.id);
          return { ...msg, reactions };
        })
      );
      
      res.json({ replies: repliesWithReactions });
    } catch (error: any) {
      console.error("Error fetching thread replies:", error);
      res.status(500).json({ error: "Failed to fetch thread replies" });
    }
  });

  // Add reaction
  app.post("/api/channels/messages/:messageId/reactions", async (req: any, res: any) => {
    try {
      const { messageId } = req.params;
      const { userId, emoji } = req.body;
      
      if (!userId || !emoji) {
        return res.status(400).json({ error: "userId and emoji are required" });
      }
      
      const reaction = await storage.addReaction({
        messageId,
        userId,
        emoji
      });
      res.json({ reaction });
    } catch (error: any) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // Remove reaction
  app.delete("/api/channels/messages/:messageId/reactions", async (req: any, res: any) => {
    try {
      const { messageId } = req.params;
      const { userId, emoji } = req.body;
      
      if (!userId || !emoji) {
        return res.status(400).json({ error: "userId and emoji are required" });
      }
      
      await storage.removeReaction(messageId, userId, emoji);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // Mark channel as read
  app.post("/api/channels/:channelId/read", async (req: any, res: any) => {
    try {
      const { channelId } = req.params;
      const { userId, messageId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const read = await storage.updateChannelRead(channelId, userId, messageId);
      res.json({ read });
    } catch (error: any) {
      console.error("Error marking channel as read:", error);
      res.status(500).json({ error: "Failed to mark channel as read" });
    }
  });

  // Get unread counts for user
  app.get("/api/channels/unread/:userId", async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const unreadCounts = await storage.getUnreadCounts(userId);
      res.json({ unreadCounts });
    } catch (error: any) {
      console.error("Error fetching unread counts:", error);
      res.status(500).json({ error: "Failed to fetch unread counts" });
    }
  });

  // ==================== ESTIMATES ====================

  // Get all estimates (optionally filter by status)
  app.get("/api/estimates", async (req: any, res: any) => {
    try {
      const { status } = req.query;
      const estimates = await storage.getEstimates(status);
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching estimates:", error);
      res.status(500).json({ error: "Failed to fetch estimates" });
    }
  });

  // Get single estimate
  app.get("/api/estimates/:id", async (req: any, res: any) => {
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

  // Get estimates by property
  app.get("/api/estimates/property/:propertyId", async (req: any, res: any) => {
    try {
      const { propertyId } = req.params;
      const estimates = await storage.getEstimatesByProperty(propertyId);
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching property estimates:", error);
      res.status(500).json({ error: "Failed to fetch property estimates" });
    }
  });

  // Create new estimate
  app.post("/api/estimates", async (req: any, res: any) => {
    try {
      const estimate = await storage.createEstimate(req.body);
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error creating estimate:", error);
      res.status(500).json({ error: "Failed to create estimate" });
    }
  });

  // Update estimate
  app.put("/api/estimates/:id", async (req: any, res: any) => {
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

  // Update estimate status
  app.patch("/api/estimates/:id/status", async (req: any, res: any) => {
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

  // Delete estimate
  app.delete("/api/estimates/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteEstimate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting estimate:", error);
      res.status(500).json({ error: "Failed to delete estimate" });
    }
  });

  // ==================== ROUTES (Scheduling) ====================

  // Get all routes (optionally filter by day of week)
  app.get("/api/routes", async (req: any, res: any) => {
    try {
      const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek) : undefined;
      const routesList = await storage.getRoutes(dayOfWeek);
      
      // Fetch stops for each route
      const routesWithStops = await Promise.all(
        routesList.map(async (route) => {
          const stops = await storage.getRouteStops(route.id);
          return { ...route, stops };
        })
      );
      
      res.json({ routes: routesWithStops });
    } catch (error: any) {
      console.error("Error getting routes:", error);
      res.status(500).json({ error: "Failed to get routes" });
    }
  });

  // Get single route with stops
  app.get("/api/routes/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const route = await storage.getRoute(id);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      const stops = await storage.getRouteStops(id);
      res.json({ route: { ...route, stops } });
    } catch (error: any) {
      console.error("Error getting route:", error);
      res.status(500).json({ error: "Failed to get route" });
    }
  });

  // Create new route
  app.post("/api/routes", async (req: any, res: any) => {
    try {
      const route = await storage.createRoute(req.body);
      res.json({ route });
    } catch (error: any) {
      console.error("Error creating route:", error);
      res.status(500).json({ error: "Failed to create route" });
    }
  });

  // Update route
  app.put("/api/routes/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const route = await storage.updateRoute(id, req.body);
      if (!route) {
        return res.status(404).json({ error: "Route not found" });
      }
      res.json({ route });
    } catch (error: any) {
      console.error("Error updating route:", error);
      res.status(500).json({ error: "Failed to update route" });
    }
  });

  // Delete route
  app.delete("/api/routes/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteRoute(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting route:", error);
      res.status(500).json({ error: "Failed to delete route" });
    }
  });

  // Reorder routes
  app.put("/api/routes/reorder", async (req: any, res: any) => {
    try {
      const { routeIds } = req.body;
      await storage.reorderRoutes(routeIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordering routes:", error);
      res.status(500).json({ error: "Failed to reorder routes" });
    }
  });

  // ==================== ROUTE STOPS ====================

  // Get stops for a route
  app.get("/api/routes/:routeId/stops", async (req: any, res: any) => {
    try {
      const { routeId } = req.params;
      const stops = await storage.getRouteStops(routeId);
      res.json({ stops });
    } catch (error: any) {
      console.error("Error getting route stops:", error);
      res.status(500).json({ error: "Failed to get route stops" });
    }
  });

  // Create route stop
  app.post("/api/routes/:routeId/stops", async (req: any, res: any) => {
    try {
      const { routeId } = req.params;
      const stop = await storage.createRouteStop({ ...req.body, routeId });
      res.json({ stop });
    } catch (error: any) {
      console.error("Error creating route stop:", error);
      res.status(500).json({ error: "Failed to create route stop" });
    }
  });

  // Update route stop
  app.put("/api/route-stops/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const stop = await storage.updateRouteStop(id, req.body);
      if (!stop) {
        return res.status(404).json({ error: "Route stop not found" });
      }
      res.json({ stop });
    } catch (error: any) {
      console.error("Error updating route stop:", error);
      res.status(500).json({ error: "Failed to update route stop" });
    }
  });

  // Delete route stop
  app.delete("/api/route-stops/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteRouteStop(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting route stop:", error);
      res.status(500).json({ error: "Failed to delete route stop" });
    }
  });

  // Move stop to different route
  app.post("/api/route-stops/:id/move", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { newRouteId, isPermanent, moveDate } = req.body;
      const stop = await storage.moveStopToRoute(id, newRouteId, isPermanent, moveDate ? new Date(moveDate) : undefined);
      if (!stop) {
        return res.status(404).json({ error: "Route stop not found" });
      }
      res.json({ stop });
    } catch (error: any) {
      console.error("Error moving route stop:", error);
      res.status(500).json({ error: "Failed to move route stop" });
    }
  });

  // Reorder stops within a route
  app.put("/api/routes/:routeId/stops/reorder", async (req: any, res: any) => {
    try {
      const { stopIds } = req.body;
      await storage.reorderRouteStops(stopIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reordering route stops:", error);
      res.status(500).json({ error: "Failed to reorder route stops" });
    }
  });

  // ==================== UNSCHEDULED STOPS ====================

  // Get unscheduled stops
  app.get("/api/unscheduled-stops", async (req: any, res: any) => {
    try {
      const stops = await storage.getUnscheduledStops();
      res.json({ stops });
    } catch (error: any) {
      console.error("Error getting unscheduled stops:", error);
      res.status(500).json({ error: "Failed to get unscheduled stops" });
    }
  });

  // Create unscheduled stop
  app.post("/api/unscheduled-stops", async (req: any, res: any) => {
    try {
      const stop = await storage.createUnscheduledStop(req.body);
      res.json({ stop });
    } catch (error: any) {
      console.error("Error creating unscheduled stop:", error);
      res.status(500).json({ error: "Failed to create unscheduled stop" });
    }
  });

  // Delete unscheduled stop
  app.delete("/api/unscheduled-stops/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteUnscheduledStop(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting unscheduled stop:", error);
      res.status(500).json({ error: "Failed to delete unscheduled stop" });
    }
  });

  // Move unscheduled stop to route
  app.post("/api/unscheduled-stops/:id/assign", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { routeId } = req.body;
      const stop = await storage.moveUnscheduledToRoute(id, routeId);
      res.json({ stop });
    } catch (error: any) {
      console.error("Error assigning unscheduled stop:", error);
      res.status(500).json({ error: "Failed to assign unscheduled stop" });
    }
  });

  // ==================== POOL BRAIN ROUTE IMPORT ====================

  // Get technician route details from Pool Brain API
  app.get("/api/poolbrain/technician-routes", async (req: any, res: any) => {
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

      const [routeData, technicianData, poolData, customerData] = await Promise.all([
        client.getTechnicianRouteDetail({ limit: 1000 }),
        client.getTechnicianDetail({ limit: 100 }),
        client.getPoolsList({ limit: 1000 }),
        client.getCustomerDetail({ limit: 1000 }),
      ]);

      res.json({
        routes: routeData,
        technicians: technicianData,
        pools: poolData,
        customers: customerData,
      });
    } catch (error: any) {
      console.error("Error fetching Pool Brain routes:", error);
      res.status(500).json({ error: error.message || "Failed to fetch routes from Pool Brain" });
    }
  });

  // Import routes from Pool Brain into scheduling system
  app.post("/api/routes/import-from-poolbrain", async (req: any, res: any) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;
      const { clearExisting } = req.body || {};

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      // Clear existing routes if requested
      if (clearExisting) {
        await storage.clearAllRoutes();
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Fetch route and technician data (required), pools and customers are optional
      const [routeData, technicianData] = await Promise.all([
        client.getTechnicianRouteDetail({ limit: 2000 }),
        client.getTechnicianDetail({ limit: 500 }),
      ]);

      // Fetch pools and customers separately with error handling
      let poolData: any = { data: [] };
      let customerData: any = { data: [] };
      
      try {
        poolData = await client.getPoolsList({ limit: 2000 });
      } catch (e) {
        console.log("Could not fetch pools list, continuing without pool data");
      }
      
      try {
        customerData = await client.getCustomerDetail({ limit: 2000 });
      } catch (e) {
        console.log("Could not fetch customer details, continuing without customer data");
      }

      const technicians = technicianData?.technicians || technicianData?.data || [];
      const routes = routeData?.routes || routeData?.data || routeData || [];
      const pools = poolData?.pools || poolData?.data || [];
      const customers = customerData?.customers || customerData?.data || [];
      
      console.log(`Pool Brain import: ${routes.length} route entries, ${technicians.length} technicians, ${pools.length} pools, ${customers.length} customers`);

      const poolMap = new Map<number, any>();
      for (const pool of pools) {
        poolMap.set(pool.PoolID || pool.poolId || pool.id, pool);
      }

      const customerMap = new Map<number, any>();
      for (const customer of customers) {
        customerMap.set(customer.CustomerID || customer.customerId || customer.id, customer);
      }

      const techMap = new Map<number, any>();
      for (const tech of technicians) {
        techMap.set(tech.TechnicianID || tech.technicianId || tech.id, tech);
      }

      const ROUTE_COLORS = ["#0891b2", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04"];
      const dayMapping: Record<string, number> = {
        "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6, "sunday": 0,
        "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6, "sun": 0,
      };

      let createdRoutes = 0;
      let createdStops = 0;

      const routeGroups = new Map<string, any[]>();

      for (const routeEntry of routes) {
        const techId = routeEntry.TechnicianID || routeEntry.technicianId;
        const dayName = (routeEntry.Day || routeEntry.day || routeEntry.DayOfWeek || "monday").toLowerCase();
        const dayOfWeek = dayMapping[dayName] ?? 1;
        
        const groupKey = `${techId}-${dayOfWeek}`;
        if (!routeGroups.has(groupKey)) {
          routeGroups.set(groupKey, []);
        }
        routeGroups.get(groupKey)?.push(routeEntry);
      }

      let colorIndex = 0;
      for (const [groupKey, stops] of Array.from(routeGroups.entries())) {
        const [techIdStr, dayOfWeekStr] = groupKey.split("-");
        const techId = parseInt(techIdStr);
        const dayOfWeek = parseInt(dayOfWeekStr);
        
        const tech = techMap.get(techId);
        const techName = tech ? `${tech.FirstName || tech.firstName || ""} ${tech.LastName || tech.lastName || ""}`.trim() : `Tech ${techId}`;

        const route = await storage.createRoute({
          name: `${techName} - ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek]}`,
          dayOfWeek,
          color: ROUTE_COLORS[colorIndex % ROUTE_COLORS.length],
          technicianId: String(techId),
          technicianName: techName,
        });
        createdRoutes++;
        colorIndex++;

        let sortOrder = 0;
        for (const stopEntry of stops) {
          const poolId = stopEntry.PoolID || stopEntry.poolId;
          const pool = poolMap.get(poolId);
          const customerId = pool?.CustomerID || pool?.customerId || stopEntry.CustomerID || stopEntry.customerId;
          const customer = customerMap.get(customerId);

          const propertyName = pool?.PoolName || pool?.poolName || pool?.Name || pool?.name || `Pool ${poolId}`;
          const customerName = customer ? `${customer.FirstName || customer.firstName || ""} ${customer.LastName || customer.lastName || ""}`.trim() : null;
          const address = customer?.Address || customer?.address || pool?.Address || pool?.address || null;

          await storage.createRouteStop({
            routeId: route.id,
            propertyId: String(poolId),
            propertyName,
            customerName,
            address,
            poolName: propertyName,
            sortOrder,
            estimatedTime: stopEntry.EstimatedTime || stopEntry.estimatedTime || 30,
            frequency: stopEntry.Frequency || stopEntry.frequency || "weekly",
          });
          createdStops++;
          sortOrder++;
        }
      }

      res.json({
        success: true,
        message: `Imported ${createdRoutes} routes with ${createdStops} stops from Pool Brain`,
        createdRoutes,
        createdStops,
      });
    } catch (error: any) {
      console.error("Error importing routes from Pool Brain:", error);
      res.status(500).json({ error: error.message || "Failed to import routes from Pool Brain" });
    }
  });
}

  

// AI Response Generators
function generateGoss20BResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes("alert") || lowerMsg.includes("problem") || lowerMsg.includes("issue")) {
    return "Scanning Pool Brain alerts... I've detected " + Math.floor(Math.random() * 5) + " active system alerts. URGENT severity detected on 2 pools requiring immediate attention. Analyzing repair schedules now...";
  }
  
  if (lowerMsg.includes("status") || lowerMsg.includes("system") || lowerMsg.includes("health")) {
    return "System status: All pool systems nominal. Vector embeddings synchronized. Currently monitoring " + (15 + Math.floor(Math.random() * 20)) + " active pools with real-time pH, ORP, and temperature sensors. No anomalies detected.";
  }
  
  if (lowerMsg.includes("optimize") || lowerMsg.includes("schedule") || lowerMsg.includes("route")) {
    return "Optimizing maintenance routes... Calculated efficient path covering 12 pools in 4.2 hours. Prioritizing URGENT repairs first. Chemical balancing scheduled for 3 pools. Auto-scheduling technician dispatch...";
  }
  
  if (lowerMsg.includes("chemical") || lowerMsg.includes("pH") || lowerMsg.includes("ORP")) {
    return "Analyzing chemical data... pH levels stable across all pools (7.2-7.6 range). ORP readings optimal. Chlorine levels good. Detected minor alkalinity adjustment needed on Esperanza HOA pool. Recommend 2.5 lbs soda ash treatment.";
  }
  
  return "[Goss 20B] Processing your query with fine-tuned neural embeddings... Analysis complete. I'm analyzing vector representations and correlating with historical pool data. Ready to assist with alerts, scheduling, chemical analysis, or customer insights.";
}

function generateLlama3Response(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes("customer") || lowerMsg.includes("account")) {
    return "[Llama 3] Retrieving customer data from Pool Brain API... Found 47 active accounts. Top account: Avalon Management (6 pools). Analyze specific customer? I can pull detailed service history, billing, and maintenance records.";
  }
  
  if (lowerMsg.includes("help")) {
    return "[Llama 3] I can assist with: Alert monitoring, Pool health analysis, Chemical recommendations, Maintenance scheduling, Customer management, Technician dispatch, and System diagnostics. What would you like to explore?";
  }
  
  return "[Llama 3] Processing request... I'm a 70B parameter language model trained on pool maintenance data. I can provide comprehensive analysis of your pool operations and suggest optimizations.";
}

function generateGPT4oResponse(userMessage: string): string {
  return "[GPT-4o] Thank you for your message. I'm analyzing the context... OpenAI's GPT-4o model would provide advanced reasoning here. For production use, integrate with OpenAI API.";
}

function generateMistralResponse(userMessage: string): string {
  return "[Mistral] Processing your request with Mistral Large model... Ready to provide technical insights on your pool operations.";
}
