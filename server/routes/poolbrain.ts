import type { Express, Request, Response } from "express";
import { poolBrainClient } from "../poolbrain";
import { db } from "../db";
import { customers, technicians } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerPoolBrainRoutes(app: Express) {
  
  app.get("/api/poolbrain/test", async (req: Request, res: Response) => {
    try {
      const result = await poolBrainClient.testConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Pool Brain connection test error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/poolbrain/products", async (req: Request, res: Response) => {
    try {
      const products = await poolBrainClient.getProducts();
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching Pool Brain products:", error);
      res.status(500).json({ error: "Failed to fetch products", message: error.message });
    }
  });

  app.post("/api/poolbrain/sync/customers", async (req: Request, res: Response) => {
    try {
      console.log("[PoolBrain Sync] Starting customer sync...");
      let offset = 0;
      const limit = 500;
      let totalSynced = 0;
      let totalUpdated = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await poolBrainClient.getCustomers(offset, limit);
        const pbCustomers = response?.data || response || [];
        
        if (!Array.isArray(pbCustomers) || pbCustomers.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`[PoolBrain Sync] Processing ${pbCustomers.length} customers from offset ${offset}`);

        for (const pbCustomer of pbCustomers) {
          const externalId = String(pbCustomer.RecordID || pbCustomer.CustomerID || pbCustomer.id);
          
          const existing = await db
            .select()
            .from(customers)
            .where(eq(customers.externalId, externalId))
            .limit(1);

          const addresses = pbCustomer.Addresses ? Object.values(pbCustomer.Addresses) : [];
          const firstAddress = addresses[0] as any || {};
          
          const statusMap: Record<string, string> = {
            "Active (routed)": "active_routed",
            "Active (no route)": "active_no_route", 
            "Inactive": "inactive",
            "Lead": "lead"
          };

          const customerData = {
            externalId,
            name: pbCustomer.CustomerName || pbCustomer.Name || "Unknown",
            email: pbCustomer.Email || null,
            phone: pbCustomer.Phone || null,
            address: firstAddress.PrimaryAddress || firstAddress.BillingAddress || null,
            city: firstAddress.PrimaryCity || firstAddress.BillingCity || null,
            state: firstAddress.PrimaryState || firstAddress.BillingState || null,
            zip: firstAddress.PrimaryZip || firstAddress.BillingZip || null,
            status: statusMap[pbCustomer.customerStatus] || "active",
            poolCount: addresses.reduce((count: number, addr: any) => count + (addr.WaterBodies?.length || 0), 0),
            notes: pbCustomer.Notes || null,
            updatedAt: new Date(),
          };

          if (existing.length > 0) {
            await db
              .update(customers)
              .set(customerData)
              .where(eq(customers.externalId, externalId));
            totalUpdated++;
          } else {
            await db.insert(customers).values(customerData);
            totalSynced++;
          }
        }

        offset += limit;
        if (pbCustomers.length < limit) {
          hasMore = false;
        }
      }

      console.log(`[PoolBrain Sync] Customer sync complete: ${totalSynced} created, ${totalUpdated} updated`);
      res.json({ 
        success: true, 
        message: `Customer sync complete`,
        created: totalSynced,
        updated: totalUpdated,
        total: totalSynced + totalUpdated
      });
    } catch (error: any) {
      console.error("Error syncing Pool Brain customers:", error);
      res.status(500).json({ error: "Failed to sync customers", message: error.message });
    }
  });

  app.post("/api/poolbrain/sync/technicians", async (req: Request, res: Response) => {
    try {
      console.log("[PoolBrain Sync] Starting technician sync...");
      let offset = 0;
      const limit = 500;
      let totalSynced = 0;
      let totalUpdated = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await poolBrainClient.getTechnicians(offset, limit);
        const pbTechnicians = response?.data || response || [];
        
        if (!Array.isArray(pbTechnicians) || pbTechnicians.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`[PoolBrain Sync] Processing ${pbTechnicians.length} technicians from offset ${offset}`);

        for (const pbTech of pbTechnicians) {
          const externalId = String(pbTech.RecordID || pbTech.TechnicianID || pbTech.id);
          
          const existing = await db
            .select()
            .from(technicians)
            .where(eq(technicians.externalId, externalId))
            .limit(1);

          const nameParts = (pbTech.Name || pbTech.name || "Unknown").split(" ");
          const firstName = nameParts[0] || "Unknown";
          const lastName = nameParts.slice(1).join(" ") || "";

          const techData = {
            externalId,
            firstName: pbTech.FirstName || pbTech.firstName || firstName,
            lastName: pbTech.LastName || pbTech.lastName || lastName,
            email: pbTech.Email || pbTech.email || null,
            phone: pbTech.Phone || pbTech.phone || null,
            role: pbTech.Role || pbTech.role || "service",
            active: pbTech.Status === 1 || pbTech.active === true || pbTech.Active === 1,
            updatedAt: new Date(),
          };

          if (existing.length > 0) {
            await db
              .update(technicians)
              .set(techData)
              .where(eq(technicians.externalId, externalId));
            totalUpdated++;
          } else {
            await db.insert(technicians).values(techData);
            totalSynced++;
          }
        }

        offset += limit;
        if (pbTechnicians.length < limit) {
          hasMore = false;
        }
      }

      console.log(`[PoolBrain Sync] Technician sync complete: ${totalSynced} created, ${totalUpdated} updated`);
      res.json({ 
        success: true, 
        message: `Technician sync complete`,
        created: totalSynced,
        updated: totalUpdated,
        total: totalSynced + totalUpdated
      });
    } catch (error: any) {
      console.error("Error syncing Pool Brain technicians:", error);
      res.status(500).json({ error: "Failed to sync technicians", message: error.message });
    }
  });

  app.post("/api/poolbrain/sync/all", async (req: Request, res: Response) => {
    try {
      console.log("[PoolBrain Sync] Starting full sync...");
      
      const customerResult = await fetch(`http://localhost:5000/api/poolbrain/sync/customers`, { method: 'POST' });
      const customerData = await customerResult.json();
      
      const techResult = await fetch(`http://localhost:5000/api/poolbrain/sync/technicians`, { method: 'POST' });
      const techData = await techResult.json();

      res.json({
        success: true,
        message: "Full sync complete",
        customers: customerData,
        technicians: techData
      });
    } catch (error: any) {
      console.error("Error during full Pool Brain sync:", error);
      res.status(500).json({ error: "Failed to complete full sync", message: error.message });
    }
  });
}
