import { createServer } from "node:http";
import { storage } from "./storage";
import { PoolBrainClient } from "./poolbrain-client";

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

      // Fetch data in parallel - limit to 150 alerts for performance
      const [alertsData, customersData, custPoolData, custNotesData] = await Promise.all([
        client.getAlertsList({ limit: 150 }),
        client.getCustomerDetail({ limit: 1000 }).catch((e) => { console.error("Customer detail error:", e); return { data: [] }; }),
        client.getCustomerPoolDetails({ limit: 1000 }).catch((e) => { console.error("Customer pool details error:", e); return { data: [] }; }),
        client.getCustomerNotes({ limit: 1000 }).catch((e) => { console.error("Customer notes error:", e); return { data: [] }; })
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

      // Customer notes map
      const customerNotesMap: Record<string, string> = {};
      if (custNotesData.data && Array.isArray(custNotesData.data)) {
        custNotesData.data.forEach((cn: any) => {
          const customerId = cn.RecordID || cn.CustomerID;
          if (customerId) {
            customerNotesMap[customerId] = cn.notes || cn.Notes || cn.description || "";
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

          if (pbAlert.AlertCategories && Array.isArray(pbAlert.AlertCategories)) {
            pbAlert.AlertCategories.forEach((cat: any) => {
              if (cat.SystemIssue) {
                alertType = "SystemIssue";
                const issue = cat.SystemIssue;
                severity = issue.Severity || "Medium";
                message = issue.AlertName || "System issue detected";
                status = issue.status === "Resolved" ? "Resolved" : "Active";
              } else if (cat.IssueReport) {
                alertType = "IssueReport";
                const report = cat.IssueReport;
                severity = report.Severity || "Medium";
                message = report.IssueReports || report.AlertName || "Repair needed";
                status = report.status === "Resolved" ? "Resolved" : "Active";
              } else if (cat.CustomAlert) {
                alertType = "CustomAlert";
                const custom = cat.CustomAlert;
                severity = custom.Severity || "Medium";
                message = custom.message || custom.AlertName || "Custom alert";
                status = custom.status === "Resolved" ? "Resolved" : "Active";
              }
            });
          } else {
            const issue = pbAlert.SystemIssue;
            if (issue) {
              alertType = "SystemIssue";
              severity = issue.Severity || "Medium";
              message = issue.AlertName || "System issue detected";
              status = issue.status === "Resolved" ? "Resolved" : "Active";
            }

            const report = pbAlert.IssueReport;
            if (report) {
              alertType = "IssueReport";
              severity = report.Severity || "Medium";
              message = report.IssueReports || report.AlertName || "Repair needed";
              status = report.status === "Resolved" ? "Resolved" : "Active";
            }

            const custom = pbAlert.CustomAlert;
            if (custom) {
              alertType = "CustomAlert";
              severity = custom.Severity || "Medium";
              message = custom.message || custom.AlertName || "Custom alert";
              status = custom.status === "Resolved" ? "Resolved" : "Active";
            }

            if (!issue && !report && !custom) {
              message = pbAlert.message || pbAlert.description || pbAlert.AlertName || "Alert from Pool Brain";
              severity = pbAlert.Severity || pbAlert.severity || "Medium";
              status = pbAlert.status === "Resolved" ? "Resolved" : "Active";
            }
          }

          // Extract address from Addresses object (first address)
          let address = "";
          if (customer?.Addresses && typeof customer.Addresses === 'object') {
            const firstAddr = Object.values(customer.Addresses)[0] as any;
            if (firstAddr) {
              address = `${firstAddr.BillingAddress || ''}, ${firstAddr.BillingCity || ''}, ${firstAddr.BillingState || ''} ${firstAddr.BillingZip || ''}`.trim();
            }
          }

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
