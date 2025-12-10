import { createServer } from "node:http";
import { storage } from "./storage";
import { PoolBrainClient } from "./poolbrain-client";
import { buildChemicalOrderEmail, buildChunkedChemicalEmails } from "./email-template";
import { OutlookGraphClient } from "./outlook-graph";

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

      // Process alerts and filter for chemical-related ones
      const chemicalOrders: any[] = [];
      
      if (alertsData.data && Array.isArray(alertsData.data)) {
        alertsData.data.forEach((pbAlert: any) => {
          const waterBodyId = pbAlert.waterBodyId;
          const poolName = pbAlert.BodyOfWater || "Unknown Pool";
          let customerId = pbAlert.CustomerID || poolToCustomerMap[waterBodyId];
          const customer = customerId ? customerMap[customerId] : undefined;

          // Parse alert message
          let message = "";
          const messages: string[] = [];
          
          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            pbAlert.AlertCategories.forEach((cat: any) => {
              if (cat.IssueReport && Array.isArray(cat.IssueReport)) {
                cat.IssueReport.forEach((report: any) => {
                  const reportText = report.IssueReports || report.AlertName || "";
                  if (reportText) messages.push(reportText);
                });
              }
            });
          }
          
          message = messages.join(" | ");

          // Check if this is a chemical/algae/repair alert
          const msgLower = message.toLowerCase();
          const isChemicalAlert = 
            msgLower.includes("chlorine") ||
            msgLower.includes("acid") ||
            msgLower.includes("algae") ||
            msgLower.includes("tank") ||
            msgLower.includes("drum") ||
            msgLower.includes("carboy") ||
            msgLower.includes("chemical") ||
            msgLower.includes("bleach") ||
            msgLower.includes("requesting");

          if (isChemicalAlert && message) {
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
            raw: { ...job, details: jobDetail }
          });
        });
      }

      console.log(`Processed ${jobs.length} jobs, ${jobs.filter(j => j.customerName !== 'Unknown Customer').length} with customer names`);

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
