import type { Request, Response } from "express";
import { storage } from "../storage";

export function registerPmRoutes(app: any) {
  // ==================== PREVENTATIVE MAINTENANCE ====================

  // PM Service Types
  app.get("/api/pm/service-types", async (req: Request, res: Response) => {
    try {
      const types = await storage.getPmServiceTypes();
      res.json(types);
    } catch (error: any) {
      console.error("Error getting PM service types:", error);
      res.status(500).json({ error: "Failed to get service types" });
    }
  });

  app.post("/api/pm/service-types", async (req: Request, res: Response) => {
    try {
      const type = await storage.createPmServiceType(req.body);
      res.json(type);
    } catch (error: any) {
      console.error("Error creating PM service type:", error);
      res.status(500).json({ error: "Failed to create service type" });
    }
  });

  app.put("/api/pm/service-types/:id", async (req: Request, res: Response) => {
    try {
      const type = await storage.updatePmServiceType(req.params.id, req.body);
      res.json(type);
    } catch (error: any) {
      console.error("Error updating PM service type:", error);
      res.status(500).json({ error: "Failed to update service type" });
    }
  });

  // PM Interval Settings
  app.get("/api/pm/interval-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getPmIntervalSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error getting PM interval settings:", error);
      res.status(500).json({ error: "Failed to get interval settings" });
    }
  });

  app.post("/api/pm/interval-settings", async (req: Request, res: Response) => {
    try {
      const setting = await storage.createPmIntervalSetting(req.body);
      res.json(setting);
    } catch (error: any) {
      console.error("Error creating PM interval setting:", error);
      res.status(500).json({ error: "Failed to create interval setting" });
    }
  });

  app.put("/api/pm/interval-settings/:id", async (req: Request, res: Response) => {
    try {
      const setting = await storage.updatePmIntervalSetting(req.params.id, req.body);
      res.json(setting);
    } catch (error: any) {
      console.error("Error updating PM interval setting:", error);
      res.status(500).json({ error: "Failed to update interval setting" });
    }
  });

  // PM Dashboard Stats
  app.get("/api/pm/stats", async (req: Request, res: Response) => {
    try {
      await storage.updateAllPmScheduleStatuses();
      const stats = await storage.getPmDashboardStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting PM stats:", error);
      res.status(500).json({ error: "Failed to get PM stats" });
    }
  });

  // Equipment PM Schedules
  app.get("/api/pm/schedules", async (req: Request, res: Response) => {
    try {
      const { status, propertyId, equipmentId } = req.query;
      let schedules;
      if (propertyId) {
        schedules = await storage.getEquipmentPmSchedulesByProperty(propertyId as string);
      } else if (equipmentId) {
        schedules = await storage.getEquipmentPmSchedulesByEquipment(equipmentId as string);
      } else {
        schedules = await storage.getEquipmentPmSchedules(status as string | undefined);
      }
      res.json(schedules);
    } catch (error: any) {
      console.error("Error getting PM schedules:", error);
      res.status(500).json({ error: "Failed to get PM schedules" });
    }
  });

  app.get("/api/pm/schedules/:id", async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEquipmentPmSchedule(req.params.id);
      res.json(schedule);
    } catch (error: any) {
      console.error("Error getting PM schedule:", error);
      res.status(500).json({ error: "Failed to get PM schedule" });
    }
  });

  app.post("/api/pm/schedules", async (req: Request, res: Response) => {
    try {
      const schedule = await storage.createEquipmentPmSchedule(req.body);
      res.json(schedule);
    } catch (error: any) {
      console.error("Error creating PM schedule:", error);
      res.status(500).json({ error: "Failed to create PM schedule" });
    }
  });

  app.put("/api/pm/schedules/:id", async (req: Request, res: Response) => {
    try {
      const schedule = await storage.updateEquipmentPmSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error: any) {
      console.error("Error updating PM schedule:", error);
      res.status(500).json({ error: "Failed to update PM schedule" });
    }
  });

  app.delete("/api/pm/schedules/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteEquipmentPmSchedule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting PM schedule:", error);
      res.status(500).json({ error: "Failed to delete PM schedule" });
    }
  });

  // PM Service Records
  app.get("/api/pm/records", async (req: Request, res: Response) => {
    try {
      const { scheduleId, equipmentId, propertyId, limit } = req.query;
      let records: any[] = [];
      if (scheduleId) {
        records = await storage.getPmServiceRecords(scheduleId as string, limit ? parseInt(limit as string) : undefined);
      } else if (equipmentId) {
        records = await storage.getPmServiceRecordsByEquipment(equipmentId as string);
      } else if (propertyId) {
        records = await storage.getPmServiceRecordsByProperty(propertyId as string);
      }
      res.json(records);
    } catch (error: any) {
      console.error("Error getting PM records:", error);
      res.status(500).json({ error: "Failed to get PM records" });
    }
  });

  app.post("/api/pm/records", async (req: Request, res: Response) => {
    try {
      const record = await storage.createPmServiceRecord(req.body);
      
      const schedule = await storage.getEquipmentPmSchedule(req.body.equipmentPmScheduleId);
      if (schedule) {
        const serviceDate = new Date(req.body.serviceDate);
        const intervalMonths = schedule.customIntervalMonths || 12;
        const nextDue = new Date(serviceDate);
        nextDue.setMonth(nextDue.getMonth() + intervalMonths);
        
        await storage.updateEquipmentPmSchedule(schedule.id, {
          lastServiceDate: req.body.serviceDate,
          nextDueDate: nextDue.toISOString().split('T')[0],
        });
      }
      
      res.json(record);
    } catch (error: any) {
      console.error("Error creating PM record:", error);
      res.status(500).json({ error: "Failed to create PM record" });
    }
  });

  // Seed PM defaults
  app.post("/api/pm/seed", async (req: Request, res: Response) => {
    try {
      const result = await storage.seedPmDefaults();
      res.json(result);
    } catch (error: any) {
      console.error("Error seeding PM defaults:", error);
      res.status(500).json({ error: "Failed to seed PM defaults" });
    }
  });
}
