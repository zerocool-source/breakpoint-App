import type { Request, Response } from "express";
import { storage } from "../storage";

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

  // ==================== POOL BRAIN CUSTOMERS WITH EQUIPMENT (DISABLED) ====================

  // Pool Brain API disabled - returns empty data
  app.get("/api/poolbrain/customers-equipment", async (_req: Request, res: Response) => {
    res.json({ 
      customers: [],
      message: "Pool Brain API disabled - use internal data"
    });
  });

  // ==================== CUSTOMER DETAIL ====================

  // Get customer detail from local database (Pool Brain API disabled)
  app.get("/api/customers/:customerId/detail", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      
      // Get customer from local storage
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      // Get pools for this customer from local storage
      const pools = await storage.getPoolsByCustomer(customerId);
      const addresses = await storage.getCustomerAddresses(customerId);
      
      res.json({ 
        pools: pools || [],
        addresses: addresses || [],
        notes: customer.notes || ""
      });
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

  // ==================== CUSTOMER ADDRESSES ====================

  // Get addresses for a customer (optionally filtered by type)
  app.get("/api/customers/:customerId/addresses", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { type } = req.query; // "primary", "service", "billing", or "primary,service" comma-separated
      
      const allAddresses = await storage.getCustomerAddresses(customerId);
      
      // Filter by address type if specified
      let filteredAddresses = allAddresses;
      if (type && typeof type === "string") {
        const allowedTypes = type.toLowerCase().split(",").map(t => t.trim());
        filteredAddresses = allAddresses.filter(addr => 
          allowedTypes.includes((addr.addressType || "primary").toLowerCase())
        );
      }
      
      res.json({ addresses: filteredAddresses });
    } catch (error: any) {
      console.error("Error fetching customer addresses:", error);
      res.status(500).json({ error: "Failed to fetch addresses" });
    }
  });

  // ==================== CUSTOMER IMPORT ====================

  // Import customers - Pool Brain API disabled
  app.post("/api/customers/import", async (_req: Request, res: Response) => {
    res.json({
      success: false,
      message: "Pool Brain API disabled - customer import not available. Add customers manually.",
      count: 0,
    });
  });

  // ==================== CUSTOMER TAGS ====================

  // Seed pre-built tags (run once on app startup or manually)
  app.post("/api/customer-tags/seed", async (req: Request, res: Response) => {
    try {
      const result = await storage.seedPrebuiltTags();
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error seeding tags:", error);
      res.status(500).json({ error: "Failed to seed tags" });
    }
  });

  // Get all available tags
  app.get("/api/customer-tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getCustomerTags();
      res.json({ tags });
    } catch (error: any) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Create custom tag
  app.post("/api/customer-tags", async (req: Request, res: Response) => {
    try {
      const { name, color, isWarningTag } = req.body;
      const tag = await storage.createCustomerTag({
        name,
        color: color || "#6B7280",
        isPrebuilt: false,
        isWarningTag: isWarningTag || false,
      });
      res.json({ success: true, tag });
    } catch (error: any) {
      console.error("Error creating tag:", error);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  // Delete custom tag
  app.delete("/api/customer-tags/:tagId", async (req: Request, res: Response) => {
    try {
      const { tagId } = req.params;
      await storage.deleteCustomerTag(tagId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // Get tags assigned to a customer
  app.get("/api/customers/:customerId/tags", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const tags = await storage.getCustomerTagsWithAssignments(customerId);
      res.json({ tags });
    } catch (error: any) {
      console.error("Error fetching customer tags:", error);
      res.status(500).json({ error: "Failed to fetch customer tags" });
    }
  });

  // Assign tag to customer
  app.post("/api/customers/:customerId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const { customerId, tagId } = req.params;
      const assignment = await storage.assignTagToCustomer(customerId, tagId);
      res.json({ success: true, assignment });
    } catch (error: any) {
      console.error("Error assigning tag:", error);
      res.status(500).json({ error: "Failed to assign tag" });
    }
  });

  // Remove tag from customer
  app.delete("/api/customers/:customerId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const { customerId, tagId } = req.params;
      await storage.removeTagFromCustomer(customerId, tagId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing tag:", error);
      res.status(500).json({ error: "Failed to remove tag" });
    }
  });

  // ==================== CUSTOMER BUDGET ====================

  // Update customer budget
  app.patch("/api/customers/:customerId/budget", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { chemicalsBudget, chemicalsBudgetPeriod, repairsBudget, repairsBudgetPeriod } = req.body;
      const customer = await storage.updateCustomer(customerId, {
        chemicalsBudget,
        chemicalsBudgetPeriod,
        repairsBudget,
        repairsBudgetPeriod,
      });
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ success: true, customer });
    } catch (error: any) {
      console.error("Error updating customer budget:", error);
      res.status(500).json({ error: "Failed to update budget" });
    }
  });
}
