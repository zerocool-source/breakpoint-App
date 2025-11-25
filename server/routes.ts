import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PoolBrainClient } from "./poolbrain-client";
import { insertAlertSchema, insertWorkflowSchema, insertCustomerSchema, insertChatMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = req.body;
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);
      res.status(201).json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const alert = await storage.updateAlertStatus(id, status);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  // Get enriched alerts with pool and customer information
  app.get("/api/alerts/enriched", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Pool Brain API key not configured."
        });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Fetch data in parallel
      const [alertsData, customersData, custPoolData] = await Promise.all([
        client.getAlertsList({ limit: 1000 }),
        client.getCustomerDetail({ limit: 1000 }).catch(() => ({ data: [] })),
        client.getCustomerPoolDetails({ limit: 1000 }).catch(() => ({ data: [] }))
      ]);

      // Build maps
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          const customerId = c.customerId || c.id;
          if (customerId) customerMap[customerId] = c;
        });
      }

      const poolToCustomerMap: Record<string, string> = {};
      if (custPoolData.data && Array.isArray(custPoolData.data)) {
        custPoolData.data.forEach((cp: any) => {
          const poolId = cp.poolId || cp.waterBodyId;
          const customerId = cp.customerId || cp.customerId;
          if (poolId && customerId) {
            poolToCustomerMap[poolId] = customerId;
          }
        });
      }

      // Enrich alerts
      const enrichedAlerts: any[] = [];
      if (alertsData.data && Array.isArray(alertsData.data)) {
        for (const pbAlert of alertsData.data) {
          const poolId = pbAlert.waterBodyId || pbAlert.poolId;
          const customerId = poolToCustomerMap[poolId];
          const customer = customerId ? customerMap[customerId] : null;

          let poolName = "Unknown Pool";
          let alertType = "Service";
          let severity = "Medium";
          let message = "Alert from Pool Brain";
          let status = "Active";

          if (pbAlert.BodyOfWater) {
            poolName = pbAlert.BodyOfWater;
          }

          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            const categories = pbAlert.AlertCategories[0] || {};
            if (categories.SystemIssue && Array.isArray(categories.SystemIssue) && categories.SystemIssue.length > 0) {
              const issue = categories.SystemIssue[0];
              alertType = issue.type || "System Issue";
              severity = issue.priorityLevel || issue.priority || "URGENT";
              message = issue.AlertName || "System issue detected";
              status = issue.status === "Resolved" ? "Resolved" : "Active";
            } else if (categories.IssueReport && Array.isArray(categories.IssueReport) && categories.IssueReport.length > 0) {
              const report = categories.IssueReport[0];
              alertType = "Repair Needed";
              severity = report.aiPriorityLevel || report.priority || "URGENT";
              message = report.IssueReports || report.AlertName || "Repair needed";
              status = report.status === "Resolved" ? "Resolved" : "Active";
            }
          }

          enrichedAlerts.push({
            alertId: pbAlert.JobID || pbAlert.alertId || pbAlert.id,
            poolId,
            poolName,
            customerId: customerId || null,
            customerName: customer?.name || customer?.companyName || "Unknown Customer",
            address: customer?.address || "",
            notes: customer?.notes || "",
            message,
            type: alertType,
            severity,
            status,
            createdAt: pbAlert.JobDate || pbAlert.Date || new Date().toISOString(),
          });
        }
      }

      res.json({ alerts: enrichedAlerts });
    } catch (error: any) {
      console.error("Error fetching enriched alerts:", error);
      res.status(500).json({ 
        error: "Failed to fetch enriched alerts",
        message: error.message 
      });
    }
  });

  // Sync alerts from Pool Brain
  app.post("/api/alerts/sync", async (req, res) => {
    try {
      // Try environment variables first (Replit Secrets), then fall back to database settings
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Pool Brain API key not configured. Please add POOLBRAIN_ACCESS_KEY to Secrets or configure in Settings." 
        });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Get alerts from last 30 days
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch alerts
      const alertsData = await client.getAlertsList({
        fromDate,
        toDate,
        limit: 1000,
      });

      // Transform and store alerts with pool names extracted from alert data
      let syncedCount = 0;
      if (alertsData.data && Array.isArray(alertsData.data)) {
        for (const pbAlert of alertsData.data) {
          // Extract pool/body name from alert data
          let poolName = "Unknown Pool";
          
          // Try multiple fields to find the pool/body name
          if (pbAlert.BodyOfWater) {
            poolName = pbAlert.BodyOfWater;
          } else if (pbAlert.poolName) {
            poolName = pbAlert.poolName;
          } else if (pbAlert.locationName) {
            poolName = pbAlert.locationName;
          } else if (pbAlert.siteName) {
            poolName = pbAlert.siteName;
          } else if (pbAlert.name) {
            poolName = pbAlert.name;
          }

          // Extract alert details from nested structure or flat structure
          let alertType = "Service";
          let severity = "Medium";
          let message = "Alert from Pool Brain";
          let status = "Active";

          // Check if this has AlertCategories structure (nested)
          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            const categories = pbAlert.AlertCategories[0] || {};
            
            // Check for system issues
            if (categories.SystemIssue && Array.isArray(categories.SystemIssue) && categories.SystemIssue.length > 0) {
              const issue = categories.SystemIssue[0];
              alertType = issue.type || "System Issue";
              severity = issue.priorityLevel || issue.priority || "URGENT";
              message = issue.AlertName || "System issue detected";
              status = issue.status === "Resolved" ? "Resolved" : "Active";
            }
            // Check for issue reports
            else if (categories.IssueReport && Array.isArray(categories.IssueReport) && categories.IssueReport.length > 0) {
              const report = categories.IssueReport[0];
              alertType = "Repair Needed";
              severity = report.aiPriorityLevel || report.priority || "URGENT";
              message = report.IssueReports || report.AlertName || "Repair needed";
              status = report.status === "Resolved" ? "Resolved" : "Active";
            }
            // Check for custom alerts
            else if (categories.CustomAlert && Array.isArray(categories.CustomAlert) && categories.CustomAlert.length > 0) {
              const custom = categories.CustomAlert[0];
              alertType = "Custom Alert";
              severity = custom.priority || "Medium";
              message = custom.message || custom.AlertName || "Custom alert";
              status = custom.status === "Resolved" ? "Resolved" : "Active";
            }
          } else {
            // Flat structure
            alertType = pbAlert.alertType || pbAlert.type || "Service";
            severity = pbAlert.priority || pbAlert.severity || pbAlert.priorityLevel || "Medium";
            message = pbAlert.message || pbAlert.description || pbAlert.AlertName || "Alert from Pool Brain";
            status = pbAlert.status === "Resolved" || pbAlert.resolved ? "Resolved" : "Active";
          }

          // Create alert with enriched data
          const alert = {
            externalId: pbAlert.JobID || pbAlert.alertId || pbAlert.id || `alert-${syncedCount}`,
            poolName,
            type: alertType,
            severity,
            message,
            status,
          };

          await storage.createAlert(alert);
          syncedCount++;
        }
      }

      res.json({ 
        success: true, 
        syncedCount,
        message: `Synced ${syncedCount} alerts from Pool Brain`
      });
    } catch (error: any) {
      console.error("Error syncing Pool Brain alerts:", error);
      res.status(500).json({ 
        error: "Failed to sync alerts from Pool Brain",
        message: error.message 
      });
    }
  });

  // Workflows
  app.get("/api/workflows", async (req, res) => {
    try {
      const workflows = await storage.getWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const data = insertWorkflowSchema.parse(req.body);
      const workflow = await storage.createWorkflow(data);
      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ error: "Invalid workflow data" });
    }
  });

  app.patch("/api/workflows/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const workflow = await storage.updateWorkflowStatus(id, status);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  // Chat
  app.get("/api/chat/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatHistory(limit);
      res.json(messages.reverse());
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat/message", async (req, res) => {
    try {
      const data = insertChatMessageSchema.parse(req.body);
      const message = await storage.addChatMessage(data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error adding chat message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Pool Brain API Proxy - Alerts List
  app.get("/api/poolbrain/alerts", async (req, res) => {
    try {
      // Try environment variables first (Replit Secrets), then fall back to database settings
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Pool Brain API key not configured. Please add POOLBRAIN_ACCESS_KEY to Secrets or configure in Settings." 
        });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

      const data = await client.getAlertsList({
        fromDate,
        toDate,
        offset,
        limit,
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Pool Brain alerts:", error);
      res.status(500).json({ 
        error: "Failed to fetch alerts from Pool Brain",
        message: error.message 
      });
    }
  });

  // Pool Brain API Proxy - Customer List
  app.get("/api/poolbrain/customers", async (req, res) => {
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

      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

      const data = await client.getCustomerList({ offset, limit });
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Pool Brain customers:", error);
      res.status(500).json({ 
        error: "Failed to fetch customers from Pool Brain",
        message: error.message 
      });
    }
  });

  // Pool Brain API Proxy - Invoice List
  app.get("/api/poolbrain/invoices", async (req, res) => {
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

      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

      const data = await client.getInvoiceList({ offset, limit });
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Pool Brain invoices:", error);
      res.status(500).json({ 
        error: "Failed to fetch invoices from Pool Brain",
        message: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
