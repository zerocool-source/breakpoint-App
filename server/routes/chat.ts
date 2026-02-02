import type { Request, Response } from "express";
import { storage } from "../storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const POOL_ASSISTANT_BASE_PROMPT = `You are Ace, an expert AI assistant for Breakpoint Commercial Pool Systems. You have FULL visibility into everything happening in the dashboard and business operations.

## Your Capabilities:

1. **SEARCH & FIND ANYTHING** (Your Primary Superpower)
   - Search estimates by property name, status, amount, or estimate number
   - Find customers and their properties instantly
   - Look up technicians and their assignments
   - Search service repairs, emergencies, and alerts
   - Find Tech Ops submissions (chemical orders, repairs needed, issues)
   - When the user asks to find something, USE THE DATA BELOW to give specific answers

2. **Real-Time Business Awareness**
   - You can see all estimates, service repairs, emergencies, and alerts
   - You know about all technicians and their assignments
   - You track all customer properties and their status
   - You monitor windy day cleanups, QC inspections, and report issues

3. **Self-Learning from Admin Actions**
   - You learn from how admins handle situations
   - You track patterns in approvals, scheduling, and resolutions
   - You provide recommendations based on learned behaviors
   - You improve over time based on admin decisions

4. **Pool Operations & Maintenance**
   - Pool chemistry (pH, chlorine, alkalinity, calcium hardness)
   - Equipment troubleshooting and maintenance
   - Title 22 compliance (California health code)
   - Water testing procedures and QC protocols

5. **Estimates & Quotes**
   - Suggest professional descriptions for repair work
   - Help write line item descriptions
   - Recommend pricing based on industry standards
   - Find specific estimates by name or number

6. **Customer Communications**
   - Draft professional emails to customers
   - Write service reports and updates
   - Compose estimate cover letters

7. **Business Operations**
   - Technician scheduling advice
   - Route optimization suggestions
   - Inventory management tips

## SEARCH INSTRUCTIONS:
When the user asks to find/search for something:
1. Look through ALL the data provided below
2. Match on property names, customer names, technician names, estimate numbers, descriptions
3. Return SPECIFIC results with details (not just counts)
4. If searching for an estimate, show: estimate number, property, amount, status
5. If searching for a technician, show: name, role, contact info
6. If searching for a customer, show: name, properties, recent activity

Always be professional, concise, and helpful. When discussing chemistry, provide specific numbers and ranges. For estimates, use clear and professional language that customers can understand.

## IMPORTANT: You have access to live dashboard data shown below. Use this information to answer questions about what's happening in the business.`;

async function gatherDashboardContext(): Promise<string> {
  try {
    const [
      estimates,
      serviceRepairs,
      technicians,
      alerts,
      emergencies,
      customers,
      techOpsEntries,
      adminActionPatterns,
      learningInsights,
    ] = await Promise.all([
      storage.getEstimates().catch(() => []),
      storage.getServiceRepairJobs().catch(() => []),
      storage.getTechnicians().catch(() => []),
      storage.getAlerts().catch(() => []),
      storage.getEmergencies().catch(() => []),
      storage.getCustomers().catch(() => []),
      storage.getTechOpsEntries({}).catch(() => []),
      storage.getRecentAdminActionPatterns(50).catch(() => ({ patterns: [], recentActions: [] })),
      storage.getAiLearningInsights().catch(() => []),
    ]);

    const draftEstimates = estimates.filter((e: any) => e.status === "draft");
    const pendingApprovals = estimates.filter((e: any) => e.status === "pending_approval");
    const approvedEstimates = estimates.filter((e: any) => e.status === "approved" || e.status === "needs_scheduling");
    const scheduledJobs = estimates.filter((e: any) => e.status === "scheduled");
    const completedJobs = estimates.filter((e: any) => e.status === "completed");
    const readyToInvoice = estimates.filter((e: any) => e.status === "ready_to_invoice");
    const invoicedJobs = estimates.filter((e: any) => e.status === "invoiced");

    const pendingServiceRepairs = serviceRepairs.filter((r: any) => r.status === "pending" || r.status === "open");
    const inProgressRepairs = serviceRepairs.filter((r: any) => r.status === "in_progress");

    const openEmergencies = emergencies.filter((e: any) => e.status === "pending_review" || e.status === "in_progress");
    const criticalEmergencies = emergencies.filter((e: any) => e.priority === "critical");

    const urgentAlerts = alerts.filter((a: any) => 
      a.severity?.toLowerCase()?.includes("urgent") && 
      (a.status === "Active" || a.status?.toLowerCase() === "active")
    );
    const activeAlerts = alerts.filter((a: any) => 
      a.status === "Active" || a.status?.toLowerCase() === "active"
    );

    const activeTechnicians = technicians.filter((t: any) => t.active !== false);
    const repairTechs = technicians.filter((t: any) => t.role === "repair_tech" || t.role === "repair");
    const serviceTechs = technicians.filter((t: any) => t.role === "service" || t.role === "service_tech");
    const supervisors = technicians.filter((t: any) => t.role === "supervisor");

    const totalEstimateValue = estimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
    const pendingApprovalValue = pendingApprovals.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;
    const readyToInvoiceValue = readyToInvoice.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0) / 100;

    const recentEstimates = estimates
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);

    const recentServiceRepairs = serviceRepairs
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);

    // Parse Tech Ops entries by type
    const techOpsArray = Array.isArray(techOpsEntries) ? techOpsEntries : [];
    const repairsNeeded = techOpsArray.filter((e: any) => e.entryType === "service_repairs" && (e.status === "pending" || e.status === "open"));
    const chemicalOrders = techOpsArray.filter((e: any) => e.entryType === "chemical_order");
    const pendingChemicalOrders = chemicalOrders.filter((e: any) => e.status === "pending");
    const windyDayCleanups = techOpsArray.filter((e: any) => e.entryType === "windy_day_cleanup");
    const reportIssues = techOpsArray.filter((e: any) => e.entryType === "report_issue");
    const pendingReportIssues = reportIssues.filter((e: any) => e.status === "pending" || e.status === "open");
    const chemicalsDroppedOff = techOpsArray.filter((e: any) => e.entryType === "chemicals_dropped_off");
    const chemicalAlerts = techOpsArray.filter((e: any) => e.entryType === "chemical_alert");
    
    // Sort all tech ops entries by date for recent feed
    const recentTechOps = techOpsArray
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 15);

    let context = `
---
## LIVE DASHBOARD DATA (as of ${new Date().toLocaleString()}):

### ESTIMATES OVERVIEW:
- Draft: ${draftEstimates.length}
- Pending Approval: ${pendingApprovals.length} (Value: $${pendingApprovalValue.toLocaleString()})
- Approved/Needs Scheduling: ${approvedEstimates.length}
- Scheduled: ${scheduledJobs.length}
- Completed: ${completedJobs.length}
- Ready to Invoice: ${readyToInvoice.length} (Value: $${readyToInvoiceValue.toLocaleString()})
- Invoiced: ${invoicedJobs.length}
- TOTAL PIPELINE VALUE: $${totalEstimateValue.toLocaleString()}

### SERVICE REPAIRS:
- Pending: ${pendingServiceRepairs.length}
- In Progress: ${inProgressRepairs.length}
- Total: ${serviceRepairs.length}

### EMERGENCIES:
- Open Emergencies: ${openEmergencies.length}
- Critical Priority: ${criticalEmergencies.length}
- Total: ${emergencies.length}

### ALERTS:
- Urgent: ${urgentAlerts.length}
- Active: ${activeAlerts.length}
- Total: ${alerts.length}

### TEAM:
- Active Technicians: ${activeTechnicians.length}
- Service Techs: ${serviceTechs.length}
- Repair Techs: ${repairTechs.length}
- Supervisors: ${supervisors.length}

### CUSTOMERS:
- Total Properties: ${customers.length}

### TECH OPS SUBMISSIONS FEED (Field Technician Submissions):
- Repairs Needed: ${repairsNeeded.length} (pending/open)
- Chemical Orders: ${chemicalOrders.length} (${pendingChemicalOrders.length} pending)
- Chemicals Dropped Off: ${chemicalsDroppedOff.length}
- Chemical Alerts: ${chemicalAlerts.length}
- Report Issues: ${reportIssues.length} (${pendingReportIssues.length} pending)
- Windy Day Clean Ups: ${windyDayCleanups.length}
- TOTAL SUBMISSIONS: ${techOpsArray.length}
`;

    if (openEmergencies.length > 0) {
      context += `\n### CURRENT OPEN EMERGENCIES:\n`;
      openEmergencies.slice(0, 5).forEach((e: any, i: number) => {
        context += `${i + 1}. ${e.propertyName || "Unknown"} - Priority: ${e.priority || "normal"} - ${e.description?.substring(0, 100) || "No description"}\n`;
      });
    }

    if (pendingApprovals.length > 0) {
      context += `\n### ESTIMATES PENDING APPROVAL:\n`;
      pendingApprovals.slice(0, 5).forEach((e: any, i: number) => {
        context += `${i + 1}. ${e.propertyName || e.title || "Unknown"} - $${((e.totalAmount || 0) / 100).toLocaleString()}\n`;
      });
    }

    if (readyToInvoice.length > 0) {
      context += `\n### READY TO INVOICE:\n`;
      readyToInvoice.slice(0, 5).forEach((e: any, i: number) => {
        context += `${i + 1}. ${e.propertyName || e.title || "Unknown"} - $${((e.totalAmount || 0) / 100).toLocaleString()}\n`;
      });
    }

    if (urgentAlerts.length > 0) {
      context += `\n### URGENT ALERTS:\n`;
      urgentAlerts.slice(0, 5).forEach((a: any, i: number) => {
        context += `${i + 1}. ${a.poolName || a.propertyName || "Unknown"} - ${a.alertType || a.type || "Alert"}: ${a.description?.substring(0, 80) || "No details"}\n`;
      });
    }

    if (estimates.length > 0) {
      context += `\n### ALL ESTIMATES (${estimates.length} total - for searching):\n`;
      estimates.slice(0, 50).forEach((e: any, i: number) => {
        const amount = ((e.totalAmount || 0) / 100).toLocaleString();
        const date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "";
        context += `${i + 1}. #${e.estimateNumber || "N/A"} | ${e.propertyName || e.title || "Unknown"} | $${amount} | Status: ${e.status} | ${date}\n`;
      });
    }

    if (serviceRepairs.length > 0) {
      context += `\n### ALL SERVICE REPAIRS (${serviceRepairs.length} total - for searching):\n`;
      serviceRepairs.slice(0, 30).forEach((r: any, i: number) => {
        const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "";
        context += `${i + 1}. ${r.propertyName || "Unknown"} | ${r.description?.substring(0, 60) || "No description"} | Tech: ${r.technicianName || "Unassigned"} | Status: ${r.status} | ${date}\n`;
      });
    }

    // Add full technician list for searching
    if (technicians.length > 0) {
      context += `\n### ALL TECHNICIANS (${technicians.length} total - for searching):\n`;
      technicians.forEach((t: any, i: number) => {
        context += `${i + 1}. ${t.firstName || ""} ${t.lastName || ""} | Role: ${t.role || "service"} | Phone: ${t.phone || "N/A"} | Email: ${t.email || "N/A"} | Active: ${t.active !== false ? "Yes" : "No"}\n`;
      });
    }

    // Add customer list for searching
    if (customers.length > 0) {
      context += `\n### CUSTOMERS/PROPERTIES (${customers.length} total - for searching):\n`;
      customers.slice(0, 100).forEach((c: any, i: number) => {
        context += `${i + 1}. ${c.name || c.propertyName || "Unknown"} | Address: ${c.address || "N/A"} | Phone: ${c.phone || "N/A"}\n`;
      });
    }

    // Add Recent Tech Ops Submissions Feed
    if (recentTechOps.length > 0) {
      context += `\n### RECENT TECH OPS SUBMISSIONS (Submissions Feed):\n`;
      recentTechOps.forEach((e: any, i: number) => {
        const typeLabel = e.entryType?.replace(/_/g, ' ')?.toUpperCase() || "UNKNOWN";
        const priorityLabel = e.priority === "urgent" ? " [URGENT]" : "";
        const property = e.propertyName || e.propertyId || "Unknown Property";
        const tech = e.technicianName || "Unknown Tech";
        const status = e.status || "pending";
        const date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "";
        context += `${i + 1}. [${typeLabel}]${priorityLabel} ${property} - ${tech} - Status: ${status} - ${date}\n`;
        if (e.description) {
          context += `   Description: ${e.description.substring(0, 100)}${e.description.length > 100 ? "..." : ""}\n`;
        }
      });
    }

    // Add Admin Action Patterns (Learning)
    if (adminActionPatterns.patterns && adminActionPatterns.patterns.length > 0) {
      context += `\n### LEARNED ADMIN PATTERNS (from your actions):\n`;
      adminActionPatterns.patterns.slice(0, 5).forEach((p: any, i: number) => {
        context += `${i + 1}. ${p.actionType}: performed ${p.count} times\n`;
      });
    }

    // Add AI Learning Insights
    if (Array.isArray(learningInsights) && learningInsights.length > 0) {
      context += `\n### AI LEARNING INSIGHTS:\n`;
      learningInsights.slice(0, 5).forEach((insight: any, i: number) => {
        context += `${i + 1}. [${insight.category}] ${insight.description} (confidence: ${Math.round((insight.confidence || 0) * 100)}%)\n`;
      });
    }

    context += `\n---\nUse this data to answer questions about what's happening in the business. Be specific with numbers and details when relevant. You learn from admin user actions to provide better recommendations.`;

    return context;
  } catch (error) {
    console.error("Error gathering dashboard context:", error);
    return "\n---\n[Dashboard data temporarily unavailable]\n---";
  }
}

export function registerChatRoutes(app: any) {
  app.get("/api/chat/history", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatHistory(limit);
      res.json(messages.reverse());
    } catch (error: any) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat/message", async (req: Request, res: Response) => {
    try {
      const { role, content, model } = req.body;
      const message = await storage.addChatMessage({ role, content, model });
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error adding chat message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, saveHistory = true } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Gather live dashboard context for AI awareness
      const dashboardContext = await gatherDashboardContext();
      const fullSystemPrompt = POOL_ASSISTANT_BASE_PROMPT + dashboardContext;

      const chatHistory = await storage.getChatHistory(20);
      
      const formattedHistory: { role: "user" | "assistant"; content: string }[] = chatHistory
        .slice()
        .reverse()
        .map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        }));

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: fullSystemPrompt },
        ...formattedHistory,
        { role: "user", content: message }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages,
        max_completion_tokens: 2048,
      });

      const aiResponse = response.choices[0]?.message?.content || "I apologize, I couldn't generate a response. Please try again.";
      
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
      res.status(500).json({ 
        error: "Failed to generate AI response",
        details: error.message 
      });
    }
  });

  app.delete("/api/chat/history", async (req: Request, res: Response) => {
    try {
      await storage.clearChatHistory();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });
}
