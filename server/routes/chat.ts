import type { Request, Response } from "express";
import { storage } from "../storage";

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

  app.post("/api/chat/respond", async (req: Request, res: Response) => {
    try {
      const { userMessage, model } = req.body;

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

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, saveHistory = true } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const aceAppUrl = process.env.ACE_APP_URL || process.env.OLLAMA_ENDPOINT;
      
      if (!aceAppUrl) {
        return res.status(503).json({ 
          error: "ACE_APP_URL not configured. Set the URL to your ace-breakpoint-app proxy.",
          errorCode: "NOT_CONFIGURED"
        });
      }

      const chatHistory = await storage.getChatHistory(20);
      
      const formattedHistory = chatHistory
        .slice()
        .reverse()
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));

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
      
      let errorMessage = "Failed to connect to Ace AI.";
      let errorCode = "UNKNOWN";
      let statusCode = 500;
      
      const findCauseCode = (err: any): string | null => {
        if (!err) return null;
        
        if (err.code) return err.code;
        if (err.errno) return err.errno;
        
        if (err.cause && typeof err.cause === "object") {
          const foundCode = findCauseCode(err.cause);
          if (foundCode) return foundCode;
        }
        
        return null;
      };
      
      const causeCode = findCauseCode(error);
      
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
