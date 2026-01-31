import type { Request, Response } from "express";
import { storage } from "../storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const POOL_ASSISTANT_BASE_PROMPT = `You are Ace, an expert AI assistant for Breakpoint Commercial Pool Systems. You have FULL visibility into everything happening in the dashboard and business operations.

## Your Capabilities:

1. **Real-Time Business Awareness**
   - You can see all estimates, service repairs, emergencies, and alerts
   - You know about all technicians and their assignments
   - You track all customer properties and their status
   - You monitor windy day cleanups, QC inspections, and report issues

2. **Pool Operations & Maintenance**
   - Pool chemistry (pH, chlorine, alkalinity, calcium hardness)
   - Equipment troubleshooting and maintenance
   - Title 22 compliance (California health code)
   - Water testing procedures and QC protocols

3. **Estimates & Quotes**
   - Suggest professional descriptions for repair work
   - Help write line item descriptions
   - Recommend pricing based on industry standards

4. **Customer Communications**
   - Draft professional emails to customers
   - Write service reports and updates
   - Compose estimate cover letters

5. **Business Operations**
   - Technician scheduling advice
   - Route optimization suggestions
   - Inventory management tips

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
      windyDayEntries,
      reportIssues,
    ] = await Promise.all([
      storage.getEstimates().catch(() => []),
      storage.getServiceRepairJobs().catch(() => []),
      storage.getTechnicians().catch(() => []),
      storage.getAlerts().catch(() => []),
      storage.getEmergencies().catch(() => []),
      storage.getCustomers().catch(() => []),
      Promise.resolve([]), // windyDayEntries placeholder
      Promise.resolve([]), // reportIssues placeholder
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

    const pendingReportIssues = Array.isArray(reportIssues) 
      ? reportIssues.filter((i: any) => i.status === "pending" || i.status === "open")
      : [];

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

### REPORT ISSUES:
- Pending Issues: ${pendingReportIssues.length}
- Total Issues: ${Array.isArray(reportIssues) ? reportIssues.length : 0}

### WINDY DAY CLEANUPS:
- Total Entries: ${Array.isArray(windyDayEntries) ? windyDayEntries.length : 0}
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

    if (recentEstimates.length > 0) {
      context += `\n### RECENT ESTIMATES (last 10):\n`;
      recentEstimates.forEach((e: any, i: number) => {
        context += `${i + 1}. [${e.status}] ${e.propertyName || e.title || "Unknown"} - $${((e.totalAmount || 0) / 100).toLocaleString()} - ${e.estimateNumber || "No number"}\n`;
      });
    }

    if (recentServiceRepairs.length > 0) {
      context += `\n### RECENT SERVICE REPAIRS (last 10):\n`;
      recentServiceRepairs.forEach((r: any, i: number) => {
        context += `${i + 1}. [${r.status}] ${r.propertyName || r.description || "Unknown"} - ${r.technicianName || "Unassigned"}\n`;
      });
    }

    context += `\n---\nUse this data to answer questions about what's happening in the business. Be specific with numbers and details when relevant.`;

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
