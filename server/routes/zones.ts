import type { Express, Request, Response } from "express";
import { storage } from "../storage";

export function registerZoneRoutes(app: Express) {
  // Get all zones with customer counts
  app.get("/api/zones", async (req: Request, res: Response) => {
    try {
      const zones = await storage.getCustomerZones();
      
      // Get customer counts for each zone
      const zonesWithCounts = await Promise.all(
        zones.map(async (zone) => ({
          ...zone,
          customerCount: await storage.getCustomerCountByZone(zone.id),
        }))
      );
      
      res.json({ zones: zonesWithCounts });
    } catch (error: any) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ error: "Failed to fetch zones", message: error.message });
    }
  });

  // Create a new zone
  app.post("/api/zones", async (req: Request, res: Response) => {
    try {
      const { name, color } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ error: "Zone name is required" });
      }
      
      const zone = await storage.createCustomerZone({ 
        name: name.trim(), 
        color: color || "#0077b6" 
      });
      
      res.json({ success: true, zone: { ...zone, customerCount: 0 } });
    } catch (error: any) {
      console.error("Error creating zone:", error);
      res.status(500).json({ error: "Failed to create zone", message: error.message });
    }
  });

  // Update a zone
  app.patch("/api/zones/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const zone = await storage.updateCustomerZone(id, updates);
      if (!zone) {
        return res.status(404).json({ error: "Zone not found" });
      }
      
      const customerCount = await storage.getCustomerCountByZone(id);
      res.json({ success: true, zone: { ...zone, customerCount } });
    } catch (error: any) {
      console.error("Error updating zone:", error);
      res.status(500).json({ error: "Failed to update zone", message: error.message });
    }
  });

  // Delete a zone
  app.delete("/api/zones/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const zone = await storage.getCustomerZone(id);
      if (!zone) {
        return res.status(404).json({ error: "Zone not found" });
      }
      
      await storage.deleteCustomerZone(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting zone:", error);
      res.status(500).json({ error: "Failed to delete zone", message: error.message });
    }
  });
}
