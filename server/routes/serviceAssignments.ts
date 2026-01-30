import { Express } from "express";
import { db } from "../db";
import { serviceAssignments, insertServiceAssignmentSchema, customers } from "@shared/schema";
import { eq, and, gte, lte, desc, or, ne } from "drizzle-orm";

export function registerServiceAssignmentRoutes(app: Express) {
  app.get("/api/service-assignments", async (req, res) => {
    try {
      const { startDate, endDate, technicianId, status } = req.query;
      
      let conditions = [];
      
      if (startDate && endDate) {
        conditions.push(gte(serviceAssignments.scheduledDate, startDate as string));
        conditions.push(lte(serviceAssignments.scheduledDate, endDate as string));
      }
      
      if (technicianId) {
        conditions.push(eq(serviceAssignments.technicianId, technicianId as string));
      }
      
      if (status) {
        conditions.push(eq(serviceAssignments.status, status as string));
      }
      
      const assignments = await db
        .select()
        .from(serviceAssignments)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(serviceAssignments.createdAt));
      
      res.json({ assignments });
    } catch (error) {
      console.error("Error fetching service assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.get("/api/service-assignments/count", async (req, res) => {
    try {
      const pendingOrInProgress = await db
        .select()
        .from(serviceAssignments)
        .where(or(
          eq(serviceAssignments.status, "pending"),
          eq(serviceAssignments.status, "in_progress")
        ));
      
      res.json({ count: pendingOrInProgress.length });
    } catch (error) {
      console.error("Error counting service assignments:", error);
      res.status(500).json({ error: "Failed to count assignments" });
    }
  });

  app.get("/api/service-assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [assignment] = await db
        .select()
        .from(serviceAssignments)
        .where(eq(serviceAssignments.id, id));
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({ assignment });
    } catch (error) {
      console.error("Error fetching service assignment:", error);
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  app.post("/api/service-assignments", async (req, res) => {
    try {
      const data = insertServiceAssignmentSchema.parse(req.body);
      
      // Lookup property name if propertyId is provided
      let propertyName = data.propertyName;
      if (data.propertyId && !propertyName) {
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, data.propertyId));
        if (customer) {
          propertyName = (customer as any).companyName || customer.name || "Unknown Property";
        }
      }
      
      const [assignment] = await db
        .insert(serviceAssignments)
        .values({
          ...data,
          propertyName,
        })
        .returning();
      
      res.status(201).json({ assignment });
    } catch (error) {
      console.error("Error creating service assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.patch("/api/service-assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // If status is being set to completed, set completedAt
      if (updates.status === "completed") {
        updates.completedAt = new Date();
      }
      
      updates.updatedAt = new Date();
      
      const [assignment] = await db
        .update(serviceAssignments)
        .set(updates)
        .where(eq(serviceAssignments.id, id))
        .returning();
      
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({ assignment });
    } catch (error) {
      console.error("Error updating service assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  app.delete("/api/service-assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deleted] = await db
        .delete(serviceAssignments)
        .where(eq(serviceAssignments.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });
}
