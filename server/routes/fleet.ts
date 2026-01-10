import type { Request, Response } from "express";
import { storage } from "../storage";

export function registerFleetRoutes(app: any) {
  // ==================== FLEET MANAGEMENT ====================

  app.get("/api/fleet/trucks", async (req: Request, res: Response) => {
    try {
      const trucks = await storage.getFleetTrucks();
      res.json(trucks);
    } catch (error: any) {
      console.error("Error getting fleet trucks:", error);
      res.status(500).json({ error: "Failed to get fleet trucks" });
    }
  });

  app.get("/api/fleet/trucks/:id", async (req: Request, res: Response) => {
    try {
      const truck = await storage.getFleetTruck(req.params.id);
      if (!truck) {
        return res.status(404).json({ error: "Truck not found" });
      }
      res.json(truck);
    } catch (error: any) {
      console.error("Error getting truck:", error);
      res.status(500).json({ error: "Failed to get truck" });
    }
  });

  app.post("/api/fleet/trucks", async (req: Request, res: Response) => {
    try {
      const truck = await storage.createFleetTruck(req.body);
      res.json(truck);
    } catch (error: any) {
      console.error("Error creating truck:", error);
      res.status(500).json({ error: "Failed to create truck" });
    }
  });

  app.put("/api/fleet/trucks/:id", async (req: Request, res: Response) => {
    try {
      const truck = await storage.updateFleetTruck(req.params.id, req.body);
      res.json(truck);
    } catch (error: any) {
      console.error("Error updating truck:", error);
      res.status(500).json({ error: "Failed to update truck" });
    }
  });

  app.get("/api/fleet/maintenance", async (req: Request, res: Response) => {
    try {
      const { truckId, truckNumber } = req.query;
      let records;
      if (truckId) {
        records = await storage.getFleetMaintenanceRecordsByTruck(truckId as string);
      } else if (truckNumber) {
        records = await storage.getFleetMaintenanceRecordsByTruckNumber(parseInt(truckNumber as string));
      } else {
        records = await storage.getFleetMaintenanceRecords();
      }
      res.json(records);
    } catch (error: any) {
      console.error("Error getting maintenance records:", error);
      res.status(500).json({ error: "Failed to get maintenance records" });
    }
  });

  app.post("/api/fleet/maintenance", async (req: Request, res: Response) => {
    try {
      const record = await storage.createFleetMaintenanceRecord(req.body);
      res.json(record);
    } catch (error: any) {
      console.error("Error creating maintenance record:", error);
      res.status(500).json({ error: "Failed to create maintenance record" });
    }
  });

  app.get("/api/fleet/stats", async (req: Request, res: Response) => {
    try {
      const trucks = await storage.getFleetTrucks();
      const records = await storage.getFleetMaintenanceRecords();
      
      const stats = {
        totalTrucks: trucks.length,
        activeTrucks: trucks.filter(t => t.isActive).length,
        totalMaintenanceRecords: records.length,
        recentServices: records.slice(0, 10),
      };
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting fleet stats:", error);
      res.status(500).json({ error: "Failed to get fleet stats" });
    }
  });

  app.post("/api/fleet/seed", async (req: Request, res: Response) => {
    try {
      const { trucks, maintenanceRecords } = req.body;
      let trucksCreated = 0;
      let recordsCreated = 0;

      const truckIdMap: Record<number, string> = {};
      
      for (const truck of trucks) {
        const upserted = await storage.upsertFleetTruck(truck.truckNumber, truck);
        truckIdMap[truck.truckNumber] = upserted.id;
        trucksCreated++;
      }

      for (const record of maintenanceRecords) {
        const truckId = truckIdMap[record.truckNumber];
        if (truckId) {
          await storage.createFleetMaintenanceRecord({
            ...record,
            truckId,
          });
          recordsCreated++;
        }
      }

      res.json({ trucksCreated, recordsCreated });
    } catch (error: any) {
      console.error("Error seeding fleet data:", error);
      res.status(500).json({ error: "Failed to seed fleet data" });
    }
  });

  // ==================== TRUCK INVENTORY ====================

  app.get("/api/fleet/inventory/:truckId", async (req: Request, res: Response) => {
    try {
      const { truckId } = req.params;
      const inventory = await storage.getTruckInventory(truckId);
      res.json(inventory);
    } catch (error: any) {
      console.error("Error getting truck inventory:", error);
      res.status(500).json({ error: "Failed to get truck inventory" });
    }
  });

  app.get("/api/fleet/inventory", async (req: Request, res: Response) => {
    try {
      const inventory = await storage.getAllTruckInventory();
      res.json(inventory);
    } catch (error: any) {
      console.error("Error getting all inventory:", error);
      res.status(500).json({ error: "Failed to get all inventory" });
    }
  });

  app.get("/api/fleet/inventory-low-stock", async (req: Request, res: Response) => {
    try {
      const lowStock = await storage.getLowStockItems();
      res.json(lowStock);
    } catch (error: any) {
      console.error("Error getting low stock items:", error);
      res.status(500).json({ error: "Failed to get low stock items" });
    }
  });

  app.post("/api/fleet/inventory", async (req: Request, res: Response) => {
    try {
      const item = await storage.createTruckInventoryItem(req.body);
      res.json(item);
    } catch (error: any) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  });

  app.put("/api/fleet/inventory/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateTruckInventoryItem(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });

  app.delete("/api/fleet/inventory/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteTruckInventoryItem(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Failed to delete inventory item" });
    }
  });
}
