import type { Request, Response } from "express";
import { storage } from "../storage";
import { PoolBrainClient } from "../poolbrain-client";

export function registerCustomerRoutes(app: any) {
  // ==================== CUSTOMERS ====================

  // Get stored customers from local database
  app.get("/api/customers/stored", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      res.json({ customers });
    } catch (error: any) {
      console.error("Error fetching stored customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Get customers list for job creation dropdown (from Pool Brain API directly)
  app.get("/api/customers", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      res.json({ customers });
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers", message: error.message });
    }
  });

  // Create new customer
  app.post("/api/customers", async (req: Request, res: Response) => {
    try {
      const customerData = req.body;
      const customer = await storage.createCustomer(customerData);
      res.json({ success: true, customer });
    } catch (error: any) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer", message: error.message });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const customer = await storage.updateCustomer(id, updates);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ success: true, customer });
    } catch (error: any) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer", message: error.message });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCustomer(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer", message: error.message });
    }
  });

  // ==================== CUSTOMER PROPERTIES ====================

  // Get customer properties (addresses)
  app.get("/api/customers/:customerId/properties", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const addresses = await storage.getCustomerAddresses(customerId);
      const properties = addresses.map(addr => ({
        id: addr.id,
        customerId: addr.customerId,
        label: addr.addressType || "Primary",
        street: addr.addressLine1 || "",
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        routeScheduleId: null,
        serviceLevel: null,
      }));
      res.json({ properties });
    } catch (error: any) {
      console.error("Error fetching customer properties:", error);
      res.status(500).json({ error: "Failed to fetch properties", message: error.message });
    }
  });

  // Add customer property
  app.post("/api/customers/:customerId/properties", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { label, street, city, state, zip, serviceLevel } = req.body;
      const address = await storage.createCustomerAddress({
        customerId,
        addressType: label || "Primary",
        addressLine1: street,
        city,
        state,
        zip,
      });
      res.json({ success: true, property: address });
    } catch (error: any) {
      console.error("Error creating customer property:", error);
      res.status(500).json({ error: "Failed to create property", message: error.message });
    }
  });

  // Delete customer property
  app.delete("/api/customers/:customerId/properties/:propertyId", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      await storage.deleteCustomerAddress(propertyId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting customer property:", error);
      res.status(500).json({ error: "Failed to delete property", message: error.message });
    }
  });

  // ==================== CUSTOMER CONTACTS ====================

  // Get customer contacts
  app.get("/api/customers/:customerId/contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const contacts = await storage.getCustomerContacts(customerId);
      res.json({ contacts: contacts.map((c: any) => ({
        id: c.id,
        customerId: c.customerId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        type: c.contactType || "Primary",
      })) });
    } catch (error: any) {
      console.error("Error fetching customer contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts", message: error.message });
    }
  });

  // Add customer contact
  app.post("/api/customers/:customerId/contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { name, email, phone, type } = req.body;
      const contact = await storage.createCustomerContact({
        customerId,
        name,
        email,
        phone,
        contactType: type || "Primary",
      });
      res.json({ success: true, contact });
    } catch (error: any) {
      console.error("Error creating customer contact:", error);
      res.status(500).json({ error: "Failed to create contact", message: error.message });
    }
  });

  // Delete customer contact
  app.delete("/api/customers/:customerId/contacts/:contactId", async (req: Request, res: Response) => {
    try {
      const { contactId } = req.params;
      await storage.deleteCustomerContact(contactId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting customer contact:", error);
      res.status(500).json({ error: "Failed to delete contact", message: error.message });
    }
  });

  // ==================== EQUIPMENT ====================

  // Get equipment for a customer
  app.get("/api/customers/:customerId/equipment", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const equipmentList = await storage.getEquipmentByCustomer(customerId);
      res.json({ equipment: equipmentList });
    } catch (error: any) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ error: "Failed to fetch equipment", message: error.message });
    }
  });

  // Create equipment
  app.post("/api/customers/:customerId/equipment", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { propertyId, poolId, category, equipmentType, brand, model, serialNumber, installDate, warrantyExpiry, notes } = req.body;
      const equip = await storage.createEquipment({
        customerId,
        propertyId: propertyId || null,
        poolId: poolId || null,
        category,
        equipmentType,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        installDate: installDate ? new Date(installDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        notes: notes || null,
      });
      res.json({ success: true, equipment: equip });
    } catch (error: any) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ error: "Failed to create equipment", message: error.message });
    }
  });

  // Update equipment
  app.put("/api/equipment/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.installDate) updates.installDate = new Date(updates.installDate);
      if (updates.warrantyExpiry) updates.warrantyExpiry = new Date(updates.warrantyExpiry);
      const equip = await storage.updateEquipment(id, updates);
      res.json({ success: true, equipment: equip });
    } catch (error: any) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ error: "Failed to update equipment", message: error.message });
    }
  });

  // Delete equipment
  app.delete("/api/equipment/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteEquipment(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting equipment:", error);
      res.status(500).json({ error: "Failed to delete equipment", message: error.message });
    }
  });

  // ==================== POOL BRAIN CUSTOMERS WITH EQUIPMENT ====================

  // Get all customers with equipment from Pool Brain API
  app.get("/api/poolbrain/customers-equipment", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Fetch customers, pool details with equipment, and notes
      const [customersData, poolsData, notesData] = await Promise.all([
        client.getCustomerDetail({ limit: 2000 }).catch(() => ({ data: [] })),
        client.getCustomerPoolDetails({ limit: 2000 }).catch(() => ({ data: [] })),
        client.getCustomerNotes({ limit: 5000 }).catch(() => ({ data: [] })),
      ]);

      // Build notes map by water body ID
      const notesByWaterBody: Record<string, string[]> = {};
      if (notesData.data && Array.isArray(notesData.data)) {
        notesData.data.forEach((note: any) => {
          const waterBodyId = note.WaterBodyID || note.waterBodyId || note.PoolID;
          const noteText = note.Note || note.Notes || note.notes || note.Text || note.text || note.Description || note.description || '';
          if (waterBodyId && noteText && noteText.trim()) {
            if (!notesByWaterBody[waterBodyId]) {
              notesByWaterBody[waterBodyId] = [];
            }
            notesByWaterBody[waterBodyId].push(noteText.trim());
          }
        });
      }

      // Build customer map
      const customerMap: Record<string, any> = {};
      if (customersData.data && Array.isArray(customersData.data)) {
        customersData.data.forEach((c: any) => {
          const id = String(c.RecordID || c.CustomerID);
          if (id) {
            customerMap[id] = {
              id,
              name: c.Name || c.CustomerName || `${c.FirstName || ''} ${c.LastName || ''}`.trim() || 'Unknown',
              address: c.Address || c.Street || null,
              city: c.City || null,
              state: c.State || null,
              zip: c.Zip || c.ZipCode || null,
              email: c.Email || null,
              phone: c.Phone || c.PhoneNumber || null,
              pools: [],
            };
          }
        });
      }

      // Map pools with equipment to customers
      const pools = poolsData.data || [];
      for (const pool of pools) {
        const customerId = String(pool.CustomerID || pool.customerId);
        if (!customerMap[customerId]) {
          customerMap[customerId] = {
            id: customerId,
            name: pool.CustomerName || 'Unknown Customer',
            address: null,
            pools: [],
          };
        }

        // Extract equipment info from pool data
        const equipment: { category: string; type: string; notes: string | null }[] = [];
        
        // Helper to extract equipment type name (not notes)
        const extractEquipmentType = (typeField: any, equipObj: any): string | null => {
          if (typeField && typeof typeField === 'string' && typeField.trim()) {
            return typeField.trim();
          }
          if (equipObj && typeof equipObj === 'object') {
            if (equipObj.typeName) return equipObj.typeName;
            if (equipObj.name) return equipObj.name;
            if (equipObj.type && typeof equipObj.type === 'string') return equipObj.type;
            if (equipObj.isPresent === 1 || equipObj.eqId) return 'Installed';
          }
          return null;
        };
        
        // Helper to extract notes from equipment object
        const extractEquipmentNotes = (equipObj: any): string | null => {
          if (!equipObj || typeof equipObj !== 'object') return null;
          const notes = equipObj.notes || equipObj.Note || equipObj.Notes || equipObj.description;
          if (notes && typeof notes === 'string' && notes.trim()) {
            return notes.trim();
          }
          return null;
        };
        
        // Filter
        const filterType = extractEquipmentType(pool.FilterType, pool.Filter);
        if (filterType || pool.Filter) {
          equipment.push({
            category: 'filter',
            type: filterType || 'Installed',
            notes: extractEquipmentNotes(pool.Filter) || (typeof pool.FilterNotes === 'string' ? pool.FilterNotes : null),
          });
        }
        
        // Pump
        const pumpType = extractEquipmentType(pool.PumpType, pool.Pump);
        if (pumpType || pool.Pump) {
          equipment.push({
            category: 'pump',
            type: pumpType || 'Installed',
            notes: extractEquipmentNotes(pool.Pump) || (typeof pool.PumpNotes === 'string' ? pool.PumpNotes : null),
          });
        }
        
        // Heater
        const heaterType = extractEquipmentType(pool.HeaterType, pool.Heater);
        if (heaterType || pool.Heater) {
          equipment.push({
            category: 'heater',
            type: heaterType || 'Installed',
            notes: extractEquipmentNotes(pool.Heater) || (typeof pool.HeaterNotes === 'string' ? pool.HeaterNotes : null),
          });
        }
        
        // Chlorinator
        const chlorinatorType = extractEquipmentType(pool.ChlorinatorType, pool.Chlorinator);
        if (chlorinatorType || pool.Chlorinator) {
          equipment.push({
            category: 'chlorinator',
            type: chlorinatorType || 'Installed',
            notes: extractEquipmentNotes(pool.Chlorinator) || (typeof pool.ChlorinatorNotes === 'string' ? pool.ChlorinatorNotes : null),
          });
        }
        
        // Controller/Automation
        const controllerType = extractEquipmentType(pool.ControllerType, pool.Controller) || extractEquipmentType(pool.AutomationType, pool.Automation);
        if (controllerType || pool.Controller || pool.Automation) {
          equipment.push({
            category: 'controller',
            type: controllerType || 'Installed',
            notes: extractEquipmentNotes(pool.Controller) || extractEquipmentNotes(pool.Automation) || (typeof pool.ControllerNotes === 'string' ? pool.ControllerNotes : (typeof pool.AutomationNotes === 'string' ? pool.AutomationNotes : null)),
          });
        }
        
        // Cleaner
        const cleanerType = extractEquipmentType(pool.CleanerType, pool.Cleaner);
        if (cleanerType || pool.Cleaner) {
          equipment.push({
            category: 'cleaner',
            type: cleanerType || 'Installed',
            notes: extractEquipmentNotes(pool.Cleaner) || (typeof pool.CleanerNotes === 'string' ? pool.CleanerNotes : null),
          });
        }

        // Timer
        const timerType = extractEquipmentType(pool.TimerType, pool.Timer);
        if (timerType || pool.Timer) {
          equipment.push({
            category: 'timer',
            type: timerType || 'Installed',
            notes: extractEquipmentNotes(pool.Timer) || (typeof pool.TimerNotes === 'string' ? pool.TimerNotes : null),
          });
        }

        const poolId = pool.RecordID || pool.PoolID;
        const poolNotes = notesByWaterBody[poolId] || [];
        const existingPoolNotes = pool.Notes || pool.PoolNotes || null;
        const allNotes = existingPoolNotes 
          ? [existingPoolNotes, ...poolNotes].join('\n')
          : poolNotes.join('\n') || null;

        customerMap[customerId].pools.push({
          id: poolId,
          name: pool.PoolName || pool.Name || 'Pool',
          type: pool.PoolType || pool.Type || 'Pool',
          address: pool.PoolAddress || pool.Address || null,
          waterType: pool.WaterType || null,
          serviceLevel: pool.ServiceLevel || null,
          equipment,
          notes: allNotes,
        });
      }

      // Convert to array and filter out customers without pools
      const customers = Object.values(customerMap).filter((c: any) => c.pools.length > 0);

      res.json({ customers });
    } catch (error: any) {
      console.error("Error fetching Pool Brain customers with equipment:", error);
      res.status(500).json({ error: "Failed to fetch customers with equipment", message: error.message });
    }
  });

  // ==================== CUSTOMER DETAIL ====================

  // Get customer detail with pools from Pool Brain
  app.get("/api/customers/:customerId/detail", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Fetch pools for this customer
      const poolsData = await client.getCustomerPoolDetails({ limit: 500 });
      const allPools = poolsData.data || [];
      const rawPools = allPools.filter((p: any) => String(p.CustomerID || p.customerId) === customerId);

      const poolsList = rawPools.map((p: any) => ({
        id: p.RecordID || p.PoolID,
        externalId: String(p.RecordID || p.PoolID),
        name: p.PoolName || p.Name || "Pool",
        poolType: p.PoolType || p.Type || "Pool",
        serviceLevel: p.ServiceLevel || p.ServiceType || null,
        waterType: p.WaterType || null,
        gallons: p.Gallons || p.Volume || null,
        address: p.Address || p.PoolAddress || null,
        city: p.City || null,
        state: p.State || null,
        zip: p.Zip || p.ZipCode || null,
      }));

      // Also try to get customer notes
      let addresses: any[] = [];
      let notes = "";
      try {
        const customerData = await client.getCustomerDetail({ limit: 1000 });
        const cust = (customerData.data || []).find((c: any) => String(c.RecordID || c.CustomerID) === customerId);
        if (cust) {
          notes = cust.Notes || "";
          if (cust.Address) {
            addresses.push({
              type: "primary",
              addressLine1: cust.Address,
              city: cust.City,
              state: cust.State,
              zip: cust.Zip,
            });
          }
          if (cust.BillingAddress && cust.BillingAddress !== cust.Address) {
            addresses.push({
              type: "billing",
              addressLine1: cust.BillingAddress,
              city: cust.BillingCity || cust.City,
              state: cust.BillingState || cust.State,
              zip: cust.BillingZip || cust.Zip,
            });
          }
        }
      } catch (e) {
        console.log("Could not fetch customer notes");
      }

      res.json({ pools: poolsList, addresses, notes });
    } catch (error: any) {
      console.error("Error fetching customer detail:", error);
      res.status(500).json({ error: error.message || "Failed to fetch customer detail" });
    }
  });

  // ==================== POOLS ====================

  // Get pools for a customer from local storage
  app.get("/api/customers/:customerId/pools", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const customerPools = await storage.getPoolsByCustomer(customerId);
      res.json({ pools: customerPools });
    } catch (error: any) {
      console.error("Error fetching pools:", error);
      res.status(500).json({ error: "Failed to fetch pools" });
    }
  });

  // Create pool/body of water for a customer
  app.post("/api/customers/:customerId/pools", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { name, poolType, waterType, gallons, serviceLevel, notes } = req.body;
      const pool = await storage.createPool({
        customerId,
        name: name || "Pool",
        poolType: poolType || "Pool",
        waterType: waterType || null,
        gallons: gallons ? parseInt(gallons) : null,
        serviceLevel: serviceLevel || null,
        notes: notes || null,
      });
      res.json({ success: true, pool });
    } catch (error: any) {
      console.error("Error creating pool:", error);
      res.status(500).json({ error: "Failed to create pool", message: error.message });
    }
  });

  // Update pool/body of water
  app.put("/api/pools/:poolId", async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const updates = req.body;
      if (updates.gallons) updates.gallons = parseInt(updates.gallons);
      const pool = await storage.updatePool(poolId, updates);
      res.json({ success: true, pool });
    } catch (error: any) {
      console.error("Error updating pool:", error);
      res.status(500).json({ error: "Failed to update pool", message: error.message });
    }
  });

  // Delete pool/body of water
  app.delete("/api/pools/:poolId", async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      await storage.deletePool(poolId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting pool:", error);
      res.status(500).json({ error: "Failed to delete pool", message: error.message });
    }
  });

  // ==================== CUSTOMER IMPORT ====================

  // Import customers from Pool Brain to local storage
  app.post("/api/customers/import", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const apiKey = process.env.POOLBRAIN_ACCESS_KEY || settings?.poolBrainApiKey;
      const companyId = process.env.POOLBRAIN_COMPANY_ID || settings?.poolBrainCompanyId;
      const { clearExisting } = req.body || {};

      if (!apiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      if (clearExisting) {
        await storage.clearAllCustomers();
      }

      const client = new PoolBrainClient({
        apiKey,
        companyId: companyId || undefined,
      });

      // Fetch customers and pool details
      const [customersData, poolsData] = await Promise.all([
        client.getCustomerDetail({ limit: 2000 }),
        client.getCustomerPoolDetails({ limit: 2000 }).catch(() => ({ data: [] })),
      ]);

      const rawCustomers = customersData.data || [];
      const rawPools = poolsData.data || [];

      // Count pools per customer
      const poolCountMap = new Map<string, number>();
      for (const pool of rawPools) {
        const custId = String(pool.CustomerID || pool.customerId || "");
        poolCountMap.set(custId, (poolCountMap.get(custId) || 0) + 1);
      }

      let imported = 0;
      for (const c of rawCustomers) {
        const externalId = String(c.RecordID || c.CustomerID || c.customerId);
        const name = c.CustomerName || c.CompanyName || c.Name || "Unknown";
        const poolCount = poolCountMap.get(externalId) || 0;
        
        // Determine status based on Pool Brain data
        let status = "active";
        if (c.Status) {
          const s = c.Status.toLowerCase();
          if (s.includes("inactive")) status = "inactive";
          else if (s.includes("lead")) status = "lead";
        }
        if (poolCount > 0) status = "active_routed";

        await storage.upsertCustomer(externalId, {
          name,
          email: c.Email || c.email || null,
          phone: c.Phone || c.phone || c.PhoneNumber || null,
          address: c.Address || c.address || null,
          city: c.City || c.city || null,
          state: c.State || c.state || null,
          zip: c.Zip || c.zip || c.ZipCode || null,
          status,
          poolCount,
          notes: c.Notes || c.notes || null,
        });
        imported++;
      }

      res.json({
        success: true,
        message: `Imported ${imported} customers from Pool Brain`,
        count: imported,
      });
    } catch (error: any) {
      console.error("Error importing customers:", error);
      res.status(500).json({ error: error.message || "Failed to import customers" });
    }
  });
}
