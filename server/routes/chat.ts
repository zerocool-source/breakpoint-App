import type { Request, Response } from "express";
import { storage } from "../storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const POOL_ASSISTANT_SYSTEM_PROMPT = `You are Ace, an expert AI assistant for Breakpoint Commercial Pool Systems. You help with:

1. **Pool Operations & Maintenance**
   - Pool chemistry (pH, chlorine, alkalinity, calcium hardness)
   - Equipment troubleshooting and maintenance
   - Title 22 compliance (California health code)
   - Water testing procedures and QC protocols

2. **Estimates & Quotes**
   - Suggest professional descriptions for repair work
   - Help write line item descriptions
   - Recommend pricing based on industry standards

3. **Customer Communications**
   - Draft professional emails to customers
   - Write service reports and updates
   - Compose estimate cover letters

4. **Business Operations**
   - Technician scheduling advice
   - Route optimization suggestions
   - Inventory management tips

Always be professional, concise, and helpful. When discussing chemistry, provide specific numbers and ranges. For estimates, use clear and professional language that customers can understand.`;

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

      const chatHistory = await storage.getChatHistory(20);
      
      const formattedHistory: { role: "user" | "assistant"; content: string }[] = chatHistory
        .slice()
        .reverse()
        .map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        }));

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: POOL_ASSISTANT_SYSTEM_PROMPT },
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
