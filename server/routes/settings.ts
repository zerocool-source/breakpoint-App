import { Request, Response } from "express";
import { storage } from "../storage";

export function registerSettingsRoutes(app: any) {
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Get current global active season
  app.get("/api/settings/active-season", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json({ activeSeason: settings?.globalActiveSeason || "summer" });
    } catch (error: any) {
      console.error("Error fetching active season:", error);
      res.status(500).json({ error: "Failed to fetch active season" });
    }
  });

  // Set global active season and update all route schedules
  app.post("/api/settings/switch-all-season", async (req: Request, res: Response) => {
    try {
      const { season } = req.body;
      if (!season || !["summer", "winter"].includes(season)) {
        return res.status(400).json({ error: "Invalid season. Must be 'summer' or 'winter'" });
      }

      // Update global setting
      await storage.updateSettings({ globalActiveSeason: season });

      // Update all route schedules to use the new active season
      const updatedCount = await storage.switchAllSchedulesToSeason(season);

      res.json({ 
        success: true, 
        activeSeason: season,
        updatedSchedules: updatedCount,
        message: `Switched all schedules to ${season} schedule`
      });
    } catch (error: any) {
      console.error("Error switching season:", error);
      res.status(500).json({ error: "Failed to switch season" });
    }
  });
}
