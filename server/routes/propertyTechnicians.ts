import { db } from "../db";
import { propertyTechnicians, routeOverrides, technicians } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export function registerPropertyTechnicianRoutes(app: any) {
  app.get("/api/property-technicians/:propertyId", async (req: any, res: any) => {
    try {
      const { propertyId } = req.params;
      const assignments = await db
        .select()
        .from(propertyTechnicians)
        .where(eq(propertyTechnicians.propertyId, propertyId))
        .orderBy(desc(propertyTechnicians.assignedAt));
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching property technicians:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/property-technicians", async (req: any, res: any) => {
    try {
      const { propertyId, technicianId, assignedById, assignedByName } = req.body;
      
      const tech = await db
        .select()
        .from(technicians)
        .where(eq(technicians.id, technicianId))
        .limit(1);
      
      const technicianName = tech[0] ? `${tech[0].firstName} ${tech[0].lastName}` : null;

      const existing = await db
        .select()
        .from(propertyTechnicians)
        .where(and(
          eq(propertyTechnicians.propertyId, propertyId),
          eq(propertyTechnicians.technicianId, technicianId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Technician already assigned to this property" });
      }

      const [assignment] = await db
        .insert(propertyTechnicians)
        .values({
          propertyId,
          technicianId,
          technicianName,
          assignedById,
          assignedByName,
        })
        .returning();

      res.json(assignment);
    } catch (error: any) {
      console.error("Error assigning technician to property:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/property-technicians/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await db.delete(propertyTechnicians).where(eq(propertyTechnicians.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing technician from property:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/route-overrides", async (req: any, res: any) => {
    try {
      const { startDate, endDate, technicianId, propertyId, reason } = req.query;
      
      let query = db.select().from(routeOverrides);
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(routeOverrides.date, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(routeOverrides.date, new Date(endDate)));
      }
      if (technicianId) {
        conditions.push(
          sql`(${routeOverrides.originalTechnicianId} = ${technicianId} OR ${routeOverrides.coveringTechnicianId} = ${technicianId})`
        );
      }
      if (propertyId) {
        conditions.push(eq(routeOverrides.propertyId, propertyId));
      }
      if (reason) {
        conditions.push(eq(routeOverrides.reason, reason));
      }

      const overrides = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(routeOverrides.date))
        : await query.orderBy(desc(routeOverrides.date));

      res.json(overrides);
    } catch (error: any) {
      console.error("Error fetching route overrides:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/route-overrides/by-date/:date", async (req: any, res: any) => {
    try {
      const { date } = req.params;
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const overrides = await db
        .select()
        .from(routeOverrides)
        .where(and(
          gte(routeOverrides.date, targetDate),
          lte(routeOverrides.date, nextDay)
        ))
        .orderBy(desc(routeOverrides.createdAt));

      res.json(overrides);
    } catch (error: any) {
      console.error("Error fetching route overrides by date:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/route-overrides", async (req: any, res: any) => {
    try {
      const {
        date,
        propertyId,
        propertyName,
        originalTechnicianId,
        originalTechnicianName,
        coveringTechnicianId,
        coveringTechnicianName,
        overrideType,
        reason,
        notes,
        createdByUserId,
        createdByName,
      } = req.body;

      const [override] = await db
        .insert(routeOverrides)
        .values({
          date: new Date(date),
          propertyId,
          propertyName,
          originalTechnicianId,
          originalTechnicianName,
          coveringTechnicianId,
          coveringTechnicianName,
          overrideType,
          reason,
          notes,
          createdByUserId,
          createdByName,
        })
        .returning();

      res.json(override);
    } catch (error: any) {
      console.error("Error creating route override:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/route-overrides/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await db.delete(routeOverrides).where(eq(routeOverrides.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting route override:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/route-history", async (req: any, res: any) => {
    try {
      const { startDate, endDate, technicianId, propertyId, reason, page = 1, limit = 50 } = req.query;
      
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(routeOverrides.date, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(routeOverrides.date, new Date(endDate)));
      }
      if (technicianId) {
        conditions.push(
          sql`(${routeOverrides.originalTechnicianId} = ${technicianId} OR ${routeOverrides.coveringTechnicianId} = ${technicianId})`
        );
      }
      if (propertyId) {
        conditions.push(eq(routeOverrides.propertyId, propertyId));
      }
      if (reason) {
        conditions.push(eq(routeOverrides.reason, reason));
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db.select().from(routeOverrides);
      
      const history = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(routeOverrides.date)).limit(parseInt(limit)).offset(offset)
        : await query.orderBy(desc(routeOverrides.date)).limit(parseInt(limit)).offset(offset);

      const countQuery = conditions.length > 0
        ? await db.select({ count: sql<number>`count(*)` }).from(routeOverrides).where(and(...conditions))
        : await db.select({ count: sql<number>`count(*)` }).from(routeOverrides);

      const totalCount = countQuery[0]?.count || 0;

      res.json({
        data: history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(Number(totalCount) / parseInt(limit))
        }
      });
    } catch (error: any) {
      console.error("Error fetching route history:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
