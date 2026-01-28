import type { Request, Response } from "express";
import { storage } from "../storage";
import { onestepgps } from "../lib/onestepgps";

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

  // ==================== GPS TRACKING (OneStepGPS) ====================

  app.get("/api/fleet/gps/devices", async (req: Request, res: Response) => {
    try {
      const data = await onestepgps.getDevices();
      
      const devices = data.result_list.map(device => ({
        id: device.device_id,
        name: device.display_name,
        online: device.online,
        status: device.active_state === 'active' ? 'Active' : device.active_state === 'inactive' ? 'Inactive' : 'In Shop',
        location: {
          lat: device.latest_device_point?.lat,
          lng: device.latest_device_point?.lng,
        },
        speed: device.latest_device_point?.speed || 0,
        heading: device.latest_device_point?.heading || 0,
        odometer: device.latest_device_point?.params?.odometer || 0,
        engineHours: device.latest_device_point?.params?.engine_hours || 0,
        fuelLevel: device.latest_device_point?.params?.fuel_level,
        ignition: device.latest_device_point?.params?.ignition || false,
        lastUpdate: device.latest_device_point?.dt_tracker,
      }));

      const summary = {
        total: devices.length,
        active: devices.filter(d => d.online && d.status === 'Active').length,
        inShop: devices.filter(d => d.status === 'In Shop').length,
        inactive: devices.filter(d => !d.online || d.status === 'Inactive').length,
      };

      res.json({ devices, summary });
    } catch (error) {
      console.error('Fleet GPS devices error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch fleet GPS devices', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get("/api/fleet/gps/geofence-events", async (req: Request, res: Response) => {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      const startDate = (req.query.startDate as string) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = (req.query.endDate as string) || new Date().toISOString();

      const data = await onestepgps.getGeofenceEvents({
        deviceId,
        startDate,
        endDate,
        limit: 100,
      });

      res.json({ events: data.result_list });
    } catch (error) {
      console.error('Geofence events error:', error);
      res.status(500).json({ error: 'Failed to fetch geofence events' });
    }
  });

  app.get("/api/fleet/gps/alerts", async (req: Request, res: Response) => {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      const startDate = (req.query.startDate as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = (req.query.endDate as string) || new Date().toISOString();

      const data = await onestepgps.getDriveEvents({
        deviceId,
        startDate,
        endDate,
        limit: 100,
      });

      const alerts = data.result_list.map(event => ({
        id: event.event_id,
        deviceId: event.device_id,
        type: event.event_type,
        severity: event.severity,
        timestamp: event.timestamp,
        location: { lat: event.lat, lng: event.lng },
        details: event.details,
      }));

      const maintenanceAlerts = {
        overdue: alerts.filter(a => a.type === 'maintenance_overdue').length,
        dueThisWeek: alerts.filter(a => a.type === 'maintenance_due').length,
      };

      res.json({ alerts, maintenanceAlerts });
    } catch (error) {
      console.error('Fleet alerts error:', error);
      res.status(500).json({ error: 'Failed to fetch fleet alerts' });
    }
  });
}
