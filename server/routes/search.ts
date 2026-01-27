import type { Express } from "express";
import { db } from "../db";
import { customers, technicians, techOpsEntries } from "@shared/schema";
import { sql, ilike, or, and, eq } from "drizzle-orm";

interface SearchResult {
  id: string;
  type: "property" | "customer" | "technician" | "estimate" | "invoice" | "service_repair" | "emergency";
  title: string;
  subtitle?: string;
  meta?: string;
}

export function registerSearchRoutes(app: Express) {
  app.get("/api/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      
      if (!query || query.length < 2) {
        return res.json({ results: [] });
      }

      const searchPattern = `%${query}%`;
      const results: SearchResult[] = [];

      // Search customers/properties
      const customerResults = await db
        .select({
          id: customers.id,
          name: customers.name,
          address: customers.address,
          city: customers.city,
        })
        .from(customers)
        .where(
          or(
            ilike(customers.name, searchPattern),
            ilike(customers.address, searchPattern)
          )
        )
        .limit(5);

      customerResults.forEach((c: { id: string; name: string; address: string | null; city: string | null }) => {
        results.push({
          id: c.id,
          type: "property",
          title: c.name,
          subtitle: c.address || undefined,
          meta: c.city || undefined,
        });
      });

      // Search technicians
      const techResults = await db
        .select({
          id: technicians.id,
          firstName: technicians.firstName,
          lastName: technicians.lastName,
          role: technicians.role,
          phone: technicians.phone,
        })
        .from(technicians)
        .where(
          and(
            eq(technicians.active, true),
            or(
              ilike(technicians.firstName, searchPattern),
              ilike(technicians.lastName, searchPattern),
              ilike(sql`${technicians.firstName} || ' ' || ${technicians.lastName}`, searchPattern)
            )
          )
        )
        .limit(5);

      techResults.forEach((t: { id: string; firstName: string; lastName: string; role: string | null; phone: string | null }) => {
        results.push({
          id: t.id,
          type: "technician",
          title: `${t.firstName} ${t.lastName}`,
          subtitle: t.role || undefined,
          meta: t.phone || undefined,
        });
      });

      // Search estimates by number
      const estimateResults = await db.execute(sql`
        SELECT id, estimate_number, property_name, status, total_amount
        FROM estimates
        WHERE estimate_number ILIKE ${searchPattern}
           OR property_name ILIKE ${searchPattern}
        LIMIT 5
      `);

      (estimateResults.rows || []).forEach((e: any) => {
        results.push({
          id: e.id,
          type: "estimate",
          title: `Estimate ${e.estimate_number || e.id.substring(0, 8)}`,
          subtitle: e.property_name || undefined,
          meta: e.status?.replace(/_/g, " ") || undefined,
        });
      });

      // Search invoices by number
      const invoiceResults = await db.execute(sql`
        SELECT id, invoice_number, property_name, status, total_amount
        FROM invoices
        WHERE invoice_number ILIKE ${searchPattern}
           OR property_name ILIKE ${searchPattern}
        LIMIT 5
      `);

      (invoiceResults.rows || []).forEach((i: any) => {
        results.push({
          id: i.id,
          type: "invoice",
          title: `Invoice ${i.invoice_number || i.id.substring(0, 8)}`,
          subtitle: i.property_name || undefined,
          meta: i.status?.replace(/_/g, " ") || undefined,
        });
      });

      // Search service repairs
      const srResults = await db
        .select({
          id: techOpsEntries.id,
          propertyName: techOpsEntries.propertyName,
          technicianName: techOpsEntries.technicianName,
          status: techOpsEntries.status,
        })
        .from(techOpsEntries)
        .where(
          and(
            eq(techOpsEntries.entryType, "service_repair"),
            or(
              ilike(techOpsEntries.propertyName, searchPattern),
              ilike(techOpsEntries.technicianName, searchPattern),
              ilike(techOpsEntries.id, searchPattern)
            )
          )
        )
        .limit(5);

      srResults.forEach((sr: { id: string; propertyName: string | null; technicianName: string | null; status: string | null }) => {
        results.push({
          id: sr.id,
          type: "service_repair",
          title: `SR-${sr.id.substring(0, 8).toUpperCase()}`,
          subtitle: sr.propertyName || undefined,
          meta: sr.status || undefined,
        });
      });

      // Search emergencies
      const emergencyResults = await db.execute(sql`
        SELECT id, property_name, priority, status, description
        FROM emergencies
        WHERE property_name ILIKE ${searchPattern}
           OR description ILIKE ${searchPattern}
        ORDER BY created_at DESC
        LIMIT 5
      `);

      (emergencyResults.rows || []).forEach((e: any) => {
        results.push({
          id: e.id,
          type: "emergency",
          title: `Emergency - ${e.property_name || "Unknown"}`,
          subtitle: e.description?.substring(0, 50) || undefined,
          meta: e.priority || undefined,
        });
      });

      res.json({ results });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
}
