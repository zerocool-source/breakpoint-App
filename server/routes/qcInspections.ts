import type { Express } from "express";
import { db } from "../db";
import { qcInspections, customers, pools } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, ilike } from "drizzle-orm";

export function registerQcInspectionRoutes(app: Express) {
  app.get("/api/qc-inspections", async (req, res) => {
    try {
      const { supervisorId, status, startDate, endDate, limit } = req.query;
      
      const conditions = [];
      
      if (supervisorId) {
        conditions.push(eq(qcInspections.supervisorId, supervisorId as string));
      }
      if (status) {
        conditions.push(eq(qcInspections.status, status as string));
      }
      if (startDate) {
        conditions.push(gte(qcInspections.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(qcInspections.createdAt, new Date(endDate as string)));
      }
      
      const results = await db
        .select()
        .from(qcInspections)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(qcInspections.createdAt))
        .limit(limit ? parseInt(limit as string) : 100);
      
      res.json({ inspections: results });
    } catch (error: any) {
      console.error("Error fetching QC inspections:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/qc-inspections/metrics", async (req, res) => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        totalAssigned,
        totalCompleted,
        assignedTwoWeeks,
        completedTwoWeeks,
        assignedMonth,
        completedMonth,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(qcInspections),
        db.select({ count: sql<number>`count(*)::int` }).from(qcInspections).where(eq(qcInspections.status, "completed")),
        db.select({ count: sql<number>`count(*)::int` }).from(qcInspections).where(gte(qcInspections.createdAt, twoWeeksAgo)),
        db.select({ count: sql<number>`count(*)::int` }).from(qcInspections).where(and(eq(qcInspections.status, "completed"), gte(qcInspections.completedAt, twoWeeksAgo))),
        db.select({ count: sql<number>`count(*)::int` }).from(qcInspections).where(gte(qcInspections.createdAt, oneMonthAgo)),
        db.select({ count: sql<number>`count(*)::int` }).from(qcInspections).where(and(eq(qcInspections.status, "completed"), gte(qcInspections.completedAt, oneMonthAgo))),
      ]);

      const bySupervisor = await db
        .select({
          supervisorId: qcInspections.supervisorId,
          supervisorName: qcInspections.supervisorName,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${qcInspections.status} = 'completed')::int`,
          pending: sql<number>`count(*) filter (where ${qcInspections.status} != 'completed')::int`,
        })
        .from(qcInspections)
        .groupBy(qcInspections.supervisorId, qcInspections.supervisorName);
      
      res.json({
        totalAssigned: totalAssigned[0]?.count || 0,
        totalCompleted: totalCompleted[0]?.count || 0,
        twoWeeks: {
          assigned: assignedTwoWeeks[0]?.count || 0,
          completed: completedTwoWeeks[0]?.count || 0,
        },
        month: {
          assigned: assignedMonth[0]?.count || 0,
          completed: completedMonth[0]?.count || 0,
        },
        bySupervisor,
      });
    } catch (error: any) {
      console.error("Error fetching QC inspection metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/qc-inspections/search-properties", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string" || q.length < 2) {
        return res.json({ properties: [] });
      }
      
      const searchTerm = `%${q}%`;
      
      const customerResults = await db
        .select({
          id: customers.id,
          name: customers.name,
          address: customers.address,
          city: customers.city,
          state: customers.state,
          type: sql<string>`'customer'`,
        })
        .from(customers)
        .where(or(
          ilike(customers.name, searchTerm),
          ilike(customers.address, searchTerm)
        ))
        .limit(10);
      
      const poolResults = await db
        .select({
          id: pools.id,
          name: pools.name,
          address: pools.address,
          city: pools.city,
          state: pools.state,
          type: sql<string>`'pool'`,
        })
        .from(pools)
        .where(or(
          ilike(pools.name, searchTerm),
          ilike(pools.address, searchTerm)
        ))
        .limit(10);
      
      const properties = [...customerResults, ...poolResults].map(p => ({
        id: p.id,
        name: p.name,
        address: [p.address, p.city, p.state].filter(Boolean).join(", "),
        type: p.type,
      }));
      
      res.json({ properties });
    } catch (error: any) {
      console.error("Error searching properties:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/qc-inspections", async (req, res) => {
    try {
      const { 
        supervisorId, 
        supervisorName,
        propertyId, 
        propertyName, 
        propertyAddress,
        title,
        notes, 
        photos,
        dueDate,
        assignedById,
        assignedByName,
      } = req.body;
      
      if (!supervisorId || !propertyName) {
        return res.status(400).json({ error: "Supervisor and property name are required" });
      }
      
      const [inspection] = await db
        .insert(qcInspections)
        .values({
          supervisorId,
          supervisorName,
          propertyId,
          propertyName,
          propertyAddress,
          title,
          notes,
          photos: photos || [],
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedById,
          assignedByName,
          status: "assigned",
        })
        .returning();
      
      res.json({ inspection });
    } catch (error: any) {
      console.error("Error creating QC inspection:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/qc-inspections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.status === "completed" && !updates.completedAt) {
        updates.completedAt = new Date();
      }
      updates.updatedAt = new Date();
      
      const [inspection] = await db
        .update(qcInspections)
        .set(updates)
        .where(eq(qcInspections.id, id))
        .returning();
      
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      res.json({ inspection });
    } catch (error: any) {
      console.error("Error updating QC inspection:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/qc-inspections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      await db.delete(qcInspections).where(eq(qcInspections.id, id));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting QC inspection:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
