import { Request, Response } from "express";
import { storage } from "../storage";

export function registerAiLearningRoutes(app: any) {
  app.post("/api/ai/track-action", async (req: Request, res: Response) => {
    try {
      const { userId, actionType, actionCategory, entityId, entityType, actionDetails, previousState, newState, metadata } = req.body;
      
      if (!userId || !actionType || !actionCategory) {
        return res.status(400).json({ error: "userId, actionType, and actionCategory are required" });
      }

      const action = await storage.createAdminAction({
        userId,
        actionType,
        actionCategory,
        entityId: entityId || null,
        entityType: entityType || null,
        actionDetails: actionDetails || null,
        previousState: previousState || null,
        newState: newState || null,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
        },
      });

      res.status(201).json(action);
    } catch (error: any) {
      console.error("Error tracking admin action:", error);
      res.status(500).json({ error: "Failed to track action" });
    }
  });

  app.get("/api/ai/admin-actions", async (req: Request, res: Response) => {
    try {
      const { userId, actionCategory, limit, startDate, endDate } = req.query;
      
      const actions = await storage.getAdminActions({
        userId: userId as string | undefined,
        actionCategory: actionCategory as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching admin actions:", error);
      res.status(500).json({ error: "Failed to fetch admin actions" });
    }
  });

  app.get("/api/ai/learning-patterns", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const patterns = await storage.getRecentAdminActionPatterns(limit);
      res.json(patterns);
    } catch (error: any) {
      console.error("Error fetching learning patterns:", error);
      res.status(500).json({ error: "Failed to fetch learning patterns" });
    }
  });

  app.get("/api/ai/learning-insights", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const insights = await storage.getAiLearningInsights(category);
      res.json(insights);
    } catch (error: any) {
      console.error("Error fetching learning insights:", error);
      res.status(500).json({ error: "Failed to fetch learning insights" });
    }
  });

  app.post("/api/ai/learning-insights", async (req: Request, res: Response) => {
    try {
      const { insightType, category, description, pattern, confidence } = req.body;
      
      if (!insightType || !category || !description) {
        return res.status(400).json({ error: "insightType, category, and description are required" });
      }

      const insight = await storage.upsertAiLearningInsight({
        insightType,
        category,
        description,
        pattern: pattern || null,
        confidence: confidence || 0.5,
        occurrences: 1,
        lastObserved: new Date(),
      });

      res.status(201).json(insight);
    } catch (error: any) {
      console.error("Error creating learning insight:", error);
      res.status(500).json({ error: "Failed to create learning insight" });
    }
  });
}
