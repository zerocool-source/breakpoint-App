import { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";
import { parseOfficeNotesForRepairs, extractPricesFromNotes, type ParsedRepair } from "../repair-parser";

export function registerPropertyRoutes(app: any) {
  // Get all properties (local database)
  app.get("/api/properties", async (req: Request, res: Response) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // Get property by ID
  app.get("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Create property
  app.post("/api/properties", async (req: Request, res: Response) => {
    try {
      const property = await storage.createProperty(req.body);
      res.status(201).json(property);
    } catch (error: any) {
      console.error("Error creating property:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  // Update property
  app.put("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      console.error("Error updating property:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  // Delete property
  app.delete("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  app.get("/api/properties/repairs", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({ apiKey, companyId: companyId || undefined });

      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 365);
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + 30);
      const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

      const fetchAllBasicJobs = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobList({ fromDate: formatDateStr(fromDate), toDate: formatDateStr(toDate), offset, limit });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allJobs };
      };

      const fetchAllJobDetails = async () => {
        const allJobs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const jobData = await client.getOneTimeJobListDetails({ fromDate: formatDateStr(fromDate), toDate: formatDateStr(toDate), offset, limit });
            if (jobData.data && Array.isArray(jobData.data)) {
              allJobs.push(...jobData.data);
            }
            hasMore = jobData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allJobs };
      };

      const fetchAllCustomers = async () => {
        const allCustomers: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const custData = await client.getCustomerDetail({ offset, limit });
            if (custData.data && Array.isArray(custData.data)) {
              allCustomers.push(...custData.data);
            }
            hasMore = custData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allCustomers };
      };

      const fetchAllTechnicians = async () => {
        const allTechs: any[] = [];
        let offset = 0;
        let hasMore = true;
        const limit = 500;
        while (hasMore) {
          try {
            const techData = await client.getTechnicianDetail({ offset, limit });
            if (techData.data && Array.isArray(techData.data)) {
              allTechs.push(...techData.data);
            }
            hasMore = techData.hasMore === true;
            offset += limit;
          } catch (e) { break; }
        }
        return { data: allTechs };
      };

      const [basicJobsData, jobDetailsData, customersData, techniciansData] = await Promise.all([
        fetchAllBasicJobs(),
        fetchAllJobDetails(),
        fetchAllCustomers(),
        fetchAllTechnicians()
      ]);

      const customerMap: Record<string, any> = {};
      if (customersData.data) {
        customersData.data.forEach((c: any) => {
          const customerId = c.RecordID;
          if (customerId) customerMap[customerId] = c;
        });
      }

      const techMap: Record<string, string> = {};
      if (techniciansData.data) {
        techniciansData.data.forEach((t: any) => {
          techMap[t.RecordID] = t.Name || `${t.FirstName || ''} ${t.LastName || ''}`.trim() || "Unknown";
        });
      }

      const jobDetailsMap: Record<string, any> = {};
      if (jobDetailsData.data) {
        jobDetailsData.data.forEach((jd: any) => {
          const jobId = jd.RecordID || jd.JobId;
          if (jobId) jobDetailsMap[jobId] = jd;
        });
      }

      const propertyMap: Record<string, {
        propertyId: string;
        propertyName: string;
        customerName: string;
        address: string;
        poolNames: Set<string>;
        technicians: Set<string>;
        repairs: any[];
        totalSpend: number;
        completedRepairs: number;
        pendingRepairs: number;
        lastServiceDate: string | null;
        monthlySpend: Record<string, number>;
      }> = {};

      const basicJobs = basicJobsData.data || [];
      basicJobs.forEach((job: any) => {
        const jobId = job.RecordID || job.JobId;
        const jobDetail = jobDetailsMap[jobId] || {};
        
        const customerId = job.CustomerId || job.CustomerID || job.customerId || jobDetail.CustomerId;
        const customer = customerId ? customerMap[customerId] : null;
        const propertyId = customerId || job.CustomerName || "unknown";
        const customerName = customer?.CustomerName || customer?.CompanyName || job.CustomerName || "Unknown Customer";
        
        let address = "";
        if (customer?.CustomerAddress && Array.isArray(customer.CustomerAddress) && customer.CustomerAddress.length > 0) {
          const addr = customer.CustomerAddress[0];
          const addrLine = addr.PrimaryStreet || addr.BillingStreet || '';
          const city = addr.PrimaryCity || addr.BillingCity || '';
          const state = addr.PrimaryState || addr.BillingState || '';
          const zip = addr.PrimaryZip || addr.BillingZip || '';
          address = `${addrLine}, ${city}, ${state} ${zip}`.trim().replace(/^,\s*/, '');
        }

        if (!propertyMap[propertyId]) {
          propertyMap[propertyId] = {
            propertyId: String(propertyId),
            propertyName: customerName,
            customerName: customerName,
            address: address,
            poolNames: new Set(),
            technicians: new Set(),
            repairs: [],
            totalSpend: 0,
            completedRepairs: 0,
            pendingRepairs: 0,
            lastServiceDate: null,
            monthlySpend: {}
          };
        }

        const prop = propertyMap[propertyId];
        
        const poolName = job.BodyOfWater || jobDetail.BodyOfWater || "";
        if (poolName) prop.poolNames.add(poolName);

        const techId = job.TechId || job.TechnicianId || jobDetail.TechId;
        const techName = techId ? techMap[techId] : null;
        if (techName && techName !== "Unknown") prop.technicians.add(techName);

        let price = 0;
        const itemDetails = jobDetail.OneOfJobItemDetails || job.OneOfJobItemDetails || [];
        if (Array.isArray(itemDetails)) {
          itemDetails.forEach((item: any) => {
            const qty = item.Qty || item.qty || 1;
            const unitPrice = item.UnitCost || item.unitCost || item.Price || item.price || 0;
            price += qty * unitPrice;
          });
        }
        if (!price) price = parseFloat(job.TotalAmount || jobDetail.TotalAmount || job.Price || jobDetail.Price || job.TotalPrice || 0) || 0;

        const status = job.JobStatus || job.Status || jobDetail.Status || "Pending";
        const isCompleted = status === "Completed" || status === "Complete" || status === "Invoiced" || job.Completed === true;
        const scheduledDate = job.JobDate || job.ScheduledDate || jobDetail.ScheduledDate || job.CreatedDate || null;

        prop.repairs.push({
          jobId: String(jobId),
          title: job.Title || job.JobTitle || jobDetail.Title || "Service Job",
          price: price,
          isCompleted: isCompleted,
          scheduledDate: scheduledDate,
          technician: techName
        });

        prop.totalSpend += price;
        if (isCompleted) {
          prop.completedRepairs++;
        } else {
          prop.pendingRepairs++;
        }

        if (scheduledDate) {
          const monthKey = new Date(scheduledDate).toISOString().substring(0, 7);
          prop.monthlySpend[monthKey] = (prop.monthlySpend[monthKey] || 0) + price;
          
          if (!prop.lastServiceDate || new Date(scheduledDate) > new Date(prop.lastServiceDate)) {
            prop.lastServiceDate = scheduledDate;
          }
        }
      });

      const properties = Object.values(propertyMap)
        .filter(p => p.propertyId !== "unknown")
        .map(prop => ({
          propertyId: prop.propertyId,
          propertyName: prop.propertyName,
          customerName: prop.customerName,
          address: prop.address,
          poolNames: Array.from(prop.poolNames),
          totalRepairs: prop.repairs.length,
          completedRepairs: prop.completedRepairs,
          pendingRepairs: prop.pendingRepairs,
          totalSpend: Math.round(prop.totalSpend * 100) / 100,
          averageRepairCost: prop.repairs.length > 0 ? Math.round((prop.totalSpend / prop.repairs.length) * 100) / 100 : 0,
          lastServiceDate: prop.lastServiceDate,
          technicians: Array.from(prop.technicians),
          monthlySpend: prop.monthlySpend,
          repairs: prop.repairs.sort((a, b) => {
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
          })
        })).sort((a, b) => b.totalSpend - a.totalSpend);

      const totalSpend = properties.reduce((sum, p) => sum + p.totalSpend, 0);
      const totalRepairs = properties.reduce((sum, p) => sum + p.totalRepairs, 0);
      const topSpender = properties[0] || null;

      const monthlyTotals: Record<string, number> = {};
      properties.forEach(p => {
        Object.entries(p.monthlySpend).forEach(([month, spend]) => {
          monthlyTotals[month] = (monthlyTotals[month] || 0) + spend;
        });
      });

      res.json({
        properties,
        summary: {
          totalProperties: properties.length,
          totalRepairs,
          totalSpend: Math.round(totalSpend * 100) / 100,
          averageSpendPerProperty: properties.length > 0 ? Math.round((totalSpend / properties.length) * 100) / 100 : 0,
          topSpender: topSpender ? { name: topSpender.propertyName, spend: topSpender.totalSpend } : null,
          monthlyTotals
        }
      });
    } catch (error: any) {
      console.error("Error fetching property repairs:", error);
      res.status(500).json({ error: "Failed to fetch property repairs" });
    }
  });
}
