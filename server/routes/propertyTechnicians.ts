import { db } from "../db";
import { propertyTechnicians, routeOverrides, technicians, routeStops, routes, customers } from "@shared/schema";
import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { z } from "zod";

const autoGenerateSchema = z.object({
  technicianId: z.string().min(1, "Technician ID is required"),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
});

const batchOverrideSchema = z.object({
  overrides: z.array(z.object({
    date: z.string(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    coverageType: z.enum(["single_day", "extended_cover", "split_route"]).optional().default("single_day"),
    propertyId: z.string(),
    propertyName: z.string(),
    originalTechnicianId: z.string().nullable(),
    originalTechnicianName: z.string().nullable(),
    coveringTechnicianId: z.string(),
    coveringTechnicianName: z.string(),
    overrideType: z.string(),
    reason: z.string().optional(),
    notes: z.string().optional(),
    createdByName: z.string().optional(),
  })).min(1, "At least one override is required"),
});

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

  app.get("/api/technician-properties/:technicianId", async (req: any, res: any) => {
    try {
      const { technicianId } = req.params;
      const assignments = await db
        .select({
          id: propertyTechnicians.id,
          technicianId: propertyTechnicians.technicianId,
          propertyId: propertyTechnicians.propertyId,
          technicianName: propertyTechnicians.technicianName,
          propertyName: customers.name,
          customerName: customers.name,
          address: customers.address,
          assignedAt: propertyTechnicians.assignedAt,
        })
        .from(propertyTechnicians)
        .leftJoin(customers, eq(propertyTechnicians.propertyId, customers.id))
        .where(eq(propertyTechnicians.technicianId, technicianId))
        .orderBy(desc(propertyTechnicians.assignedAt));
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching technician properties:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/technician-properties", async (req: any, res: any) => {
    try {
      const { technicianId, propertyId, propertyName, customerName, address, assignedByName } = req.body;
      
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
        return res.status(400).json({ error: "Property already assigned to this technician" });
      }

      const [assignment] = await db
        .insert(propertyTechnicians)
        .values({
          propertyId,
          technicianId,
          technicianName,
          assignedByName,
        })
        .returning();

      res.json(assignment);
    } catch (error: any) {
      console.error("Error assigning property to technician:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/technician-properties/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await db.delete(propertyTechnicians).where(eq(propertyTechnicians.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing property from technician:", error);
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

  app.post("/api/routes/:routeId/generate-stops", async (req: any, res: any) => {
    try {
      const { routeId } = req.params;
      const { technicianId, properties } = req.body;

      if (!properties || !Array.isArray(properties) || properties.length === 0) {
        return res.status(400).json({ error: "Properties array is required" });
      }

      const route = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
      if (route.length === 0) {
        return res.status(404).json({ error: "Route not found" });
      }

      const existingStops = await db
        .select()
        .from(routeStops)
        .where(eq(routeStops.routeId, routeId));

      const existingPropertyIds = new Set(existingStops.map(s => s.propertyId));

      const newStops = [];
      let sortOrder = existingStops.length;

      for (const property of properties) {
        if (!existingPropertyIds.has(property.propertyId)) {
          const [stop] = await db
            .insert(routeStops)
            .values({
              routeId,
              propertyId: property.propertyId,
              propertyName: property.propertyName || property.poolName || "Unknown",
              customerId: property.customerId,
              customerName: property.customerName,
              poolId: property.poolId,
              address: property.address,
              city: property.city,
              state: property.state,
              zip: property.zip,
              poolName: property.poolName,
              sortOrder: sortOrder++,
              estimatedTime: property.estimatedTime || 30,
              notes: property.notes,
              frequency: property.frequency || "weekly",
            })
            .returning();
          newStops.push(stop);
        }
      }

      res.json({
        message: `Generated ${newStops.length} new route stops`,
        stops: newStops,
        skipped: properties.length - newStops.length
      });
    } catch (error: any) {
      console.error("Error generating route stops:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/routes/auto-generate-from-assignments", async (req: any, res: any) => {
    try {
      const parseResult = autoGenerateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { technicianId, dayOfWeek } = parseResult.data;

      const assignments = await db
        .select({
          id: propertyTechnicians.id,
          propertyId: propertyTechnicians.propertyId,
          technicianId: propertyTechnicians.technicianId,
          customerId: customers.id,
          customerName: customers.name,
          propertyName: customers.name,
          address: customers.address,
          city: customers.city,
          state: customers.state,
          zip: customers.zip,
        })
        .from(propertyTechnicians)
        .leftJoin(customers, eq(propertyTechnicians.propertyId, customers.id))
        .where(eq(propertyTechnicians.technicianId, technicianId));

      if (assignments.length === 0) {
        return res.json({ message: "No property assignments found for this technician", stops: [] });
      }

      let targetRoute = null;
      
      if (dayOfWeek !== undefined) {
        const existingRoutes = await db
          .select()
          .from(routes)
          .where(and(
            eq(routes.technicianId, technicianId),
            eq(routes.dayOfWeek, dayOfWeek)
          ))
          .limit(1);
        
        targetRoute = existingRoutes[0];
      } else {
        const techRoutes = await db
          .select()
          .from(routes)
          .where(eq(routes.technicianId, technicianId))
          .limit(1);
        
        targetRoute = techRoutes[0];
      }

      if (!targetRoute) {
        return res.status(404).json({ 
          error: "No route found for this technician. Please create a route first." 
        });
      }

      const existingStops = await db
        .select()
        .from(routeStops)
        .where(eq(routeStops.routeId, targetRoute.id));

      const existingPropertyIds = new Set(existingStops.map(s => s.propertyId));

      const newStops = [];
      let sortOrder = existingStops.length;

      for (const assignment of assignments) {
        if (!existingPropertyIds.has(assignment.propertyId)) {
          const [stop] = await db
            .insert(routeStops)
            .values({
              routeId: targetRoute.id,
              propertyId: assignment.propertyId,
              propertyName: assignment.propertyName || "Unknown Property",
              customerId: assignment.customerId,
              customerName: assignment.customerName,
              address: assignment.address,
              city: assignment.city,
              state: assignment.state,
              zip: assignment.zip,
              sortOrder: sortOrder++,
              estimatedTime: 30,
              frequency: "weekly",
            })
            .returning();
          newStops.push(stop);
        }
      }

      res.json({
        message: `Auto-generated ${newStops.length} route stops from ${assignments.length} property assignments`,
        routeId: targetRoute.id,
        routeName: targetRoute.name,
        stops: newStops,
        skipped: assignments.length - newStops.length
      });
    } catch (error: any) {
      console.error("Error auto-generating route stops:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/route-overrides/batch", async (req: any, res: any) => {
    try {
      const parseResult = batchOverrideSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { overrides } = parseResult.data;

      const createdOverrides = await db.transaction(async (tx: any) => {
        const results = [];
        for (const override of overrides) {
          const [created] = await tx
            .insert(routeOverrides)
            .values({
              date: new Date(override.date),
              startDate: override.startDate ? new Date(override.startDate) : null,
              endDate: override.endDate ? new Date(override.endDate) : null,
              coverageType: override.coverageType || "single_day",
              propertyId: override.propertyId,
              propertyName: override.propertyName,
              originalTechnicianId: override.originalTechnicianId,
              originalTechnicianName: override.originalTechnicianName,
              coveringTechnicianId: override.coveringTechnicianId,
              coveringTechnicianName: override.coveringTechnicianName,
              overrideType: override.overrideType,
              reason: override.reason,
              notes: override.notes,
              active: true,
              createdByName: override.createdByName || "Office Staff",
            })
            .returning();
          results.push(created);
        }
        return results;
      });

      res.json({
        message: `Created ${createdOverrides.length} route overrides`,
        overrides: createdOverrides
      });
    } catch (error: any) {
      console.error("Error creating batch route overrides:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
