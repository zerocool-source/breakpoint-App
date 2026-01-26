import { Express, Request, Response } from "express";
import { db } from "../db";
import { 
  techSchedules, scheduleProperties, techCoverages, techTimeOff, customers,
  insertTechScheduleSchema, insertTechCoverageSchema, insertTechTimeOffSchema
} from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

export function registerCalendarRoutes(app: Express) {
  app.get("/api/tech-schedules", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      let schedules;
      if (startDate && endDate) {
        schedules = await db
          .select()
          .from(techSchedules)
          .where(
            and(
              gte(techSchedules.date, new Date(startDate as string)),
              lte(techSchedules.date, new Date(endDate as string))
            )
          );
      } else {
        schedules = await db.select().from(techSchedules);
      }
      
      const schedulesWithProperties = await Promise.all(
        schedules.map(async (schedule: typeof techSchedules.$inferSelect) => {
          const properties = await db
            .select()
            .from(scheduleProperties)
            .where(eq(scheduleProperties.scheduleId, schedule.id));
          return { ...schedule, properties };
        })
      );
      
      res.json({ schedules: schedulesWithProperties });
    } catch (error) {
      console.error("Error fetching tech schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/tech-schedules", async (req: Request, res: Response) => {
    try {
      const { technicianId, dates, startTime, endTime, stopCount, notes, propertyIds } = req.body;
      
      if (!technicianId || !dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ error: "technicianId and dates array are required" });
      }
      
      const createdSchedules = [];
      
      for (const dateStr of dates) {
        const [schedule] = await db
          .insert(techSchedules)
          .values({
            technicianId,
            date: new Date(dateStr),
            startTime: startTime || "08:00",
            endTime: endTime || "16:00",
            stopCount: stopCount || 0,
            notes,
          })
          .returning();
        
        if (propertyIds && propertyIds.length > 0) {
          for (let i = 0; i < propertyIds.length; i++) {
            const customer = await db.select().from(customers).where(eq(customers.id, propertyIds[i])).limit(1);
            const customerData = customer[0];
            
            await db.insert(scheduleProperties).values({
              scheduleId: schedule.id,
              propertyId: propertyIds[i],
              propertyName: customerData?.name || null,
              address: customerData?.address || null,
              sortOrder: i,
              status: "pending",
            });
          }
        }
        
        createdSchedules.push(schedule);
      }
      
      res.json({ schedules: createdSchedules });
    } catch (error) {
      console.error("Error creating tech schedule:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.get("/api/tech-coverages", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      let coverages;
      if (startDate && endDate) {
        coverages = await db
          .select()
          .from(techCoverages)
          .where(
            and(
              lte(techCoverages.startDate, new Date(endDate as string)),
              gte(techCoverages.endDate, new Date(startDate as string))
            )
          );
      } else {
        coverages = await db.select().from(techCoverages);
      }
      
      res.json({ coverages });
    } catch (error) {
      console.error("Error fetching tech coverages:", error);
      res.status(500).json({ error: "Failed to fetch coverages" });
    }
  });

  app.post("/api/tech-coverages", async (req: Request, res: Response) => {
    try {
      const { originalTechId, coveringTechId, startDate, endDate, propertyId, propertyName, reason } = req.body;
      
      if (!originalTechId || !coveringTechId || !startDate || !endDate) {
        return res.status(400).json({ error: "originalTechId, coveringTechId, startDate, and endDate are required" });
      }
      
      let resolvedPropertyName = propertyName;
      if (propertyId && !propertyName) {
        const customer = await db.select().from(customers).where(eq(customers.id, propertyId)).limit(1);
        resolvedPropertyName = customer[0]?.name || null;
      }
      
      const [coverage] = await db
        .insert(techCoverages)
        .values({
          originalTechId,
          coveringTechId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          propertyId,
          propertyName: resolvedPropertyName,
          reason,
          status: "active",
        })
        .returning();
      
      res.json({ coverage });
    } catch (error) {
      console.error("Error creating tech coverage:", error);
      res.status(500).json({ error: "Failed to create coverage" });
    }
  });

  app.patch("/api/tech-coverages/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const [updated] = await db
        .update(techCoverages)
        .set({ status })
        .where(eq(techCoverages.id, id))
        .returning();
      
      res.json({ coverage: updated });
    } catch (error) {
      console.error("Error updating tech coverage:", error);
      res.status(500).json({ error: "Failed to update coverage" });
    }
  });

  app.get("/api/tech-time-off", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      let timeOffs;
      if (startDate && endDate) {
        timeOffs = await db
          .select()
          .from(techTimeOff)
          .where(
            and(
              lte(techTimeOff.startDate, new Date(endDate as string)),
              gte(techTimeOff.endDate, new Date(startDate as string))
            )
          );
      } else {
        timeOffs = await db.select().from(techTimeOff);
      }
      
      res.json({ timeOffs });
    } catch (error) {
      console.error("Error fetching tech time off:", error);
      res.status(500).json({ error: "Failed to fetch time off" });
    }
  });

  app.post("/api/tech-time-off", async (req: Request, res: Response) => {
    try {
      const { technicianId, startDate, endDate, reason, notes, coveredByTechId } = req.body;
      
      if (!technicianId || !startDate || !endDate) {
        return res.status(400).json({ error: "technicianId, startDate, and endDate are required" });
      }
      
      const [timeOff] = await db
        .insert(techTimeOff)
        .values({
          technicianId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          notes,
          coveredByTechId,
        })
        .returning();
      
      res.json({ timeOff });
    } catch (error) {
      console.error("Error creating tech time off:", error);
      res.status(500).json({ error: "Failed to create time off" });
    }
  });

  app.delete("/api/tech-time-off/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await db.delete(techTimeOff).where(eq(techTimeOff.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tech time off:", error);
      res.status(500).json({ error: "Failed to delete time off" });
    }
  });
}
