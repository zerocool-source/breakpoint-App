import { Request, Response } from "express";
import { storage } from "../storage";

export function registerEstimateRoutes(app: any) {
  // Customer Billing Contacts (aggregate across all properties)
  app.get("/api/customers/:customerId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const contacts = await storage.getBillingContactsByCustomer(customerId);
      res.json({ contacts });
    } catch (error: any) {
      console.error("Error fetching customer billing contacts:", error);
      res.status(500).json({ error: "Failed to fetch billing contacts" });
    }
  });

  app.post("/api/customers/:customerId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      // Get the first property for this customer to associate the billing contact
      const customerProperties = await storage.getPropertiesByCustomer(customerId);
      if (customerProperties.length === 0) {
        return res.status(400).json({ error: "Customer has no properties. Please create a property first." });
      }
      const propertyId = req.body.propertyId || customerProperties[0].id;
      const contact = await storage.createPropertyBillingContact({ ...req.body, propertyId });
      res.json({ contact });
    } catch (error: any) {
      console.error("Error creating billing contact:", error);
      res.status(500).json({ error: "Failed to create billing contact" });
    }
  });

  app.delete("/api/customers/:customerId/billing-contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deletePropertyBillingContact(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting billing contact:", error);
      res.status(500).json({ error: "Failed to delete billing contact" });
    }
  });

  // Property Billing Contacts
  app.get("/api/properties/:propertyId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const contacts = await storage.getPropertyBillingContacts(propertyId);
      res.json({ contacts });
    } catch (error: any) {
      console.error("Error fetching billing contacts:", error);
      res.status(500).json({ error: "Failed to fetch billing contacts" });
    }
  });

  app.post("/api/properties/:propertyId/billing-contacts", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const contact = await storage.createPropertyBillingContact({ ...req.body, propertyId });
      res.json({ contact });
    } catch (error: any) {
      console.error("Error creating billing contact:", error);
      res.status(500).json({ error: "Failed to create billing contact" });
    }
  });

  app.put("/api/billing-contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const contact = await storage.updatePropertyBillingContact(id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Billing contact not found" });
      }
      res.json({ contact });
    } catch (error: any) {
      console.error("Error updating billing contact:", error);
      res.status(500).json({ error: "Failed to update billing contact" });
    }
  });

  app.delete("/api/billing-contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deletePropertyBillingContact(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting billing contact:", error);
      res.status(500).json({ error: "Failed to delete billing contact" });
    }
  });

  app.get("/api/properties/:propertyId/billing-email/:workType", async (req: Request, res: Response) => {
    try {
      const { propertyId, workType } = req.params;
      const email = await storage.getBillingEmailForWorkType(propertyId, workType);
      res.json({ email });
    } catch (error: any) {
      console.error("Error getting billing email:", error);
      res.status(500).json({ error: "Failed to get billing email" });
    }
  });

  // Pool WO Settings
  app.patch("/api/pools/:poolId/wo-settings", async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const { woRequired, woNotes } = req.body;
      await storage.updatePoolWoSettings(poolId, woRequired, woNotes);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating WO settings:", error);
      res.status(500).json({ error: "Failed to update WO settings" });
    }
  });

  // Estimates
  app.get("/api/estimates", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const estimates = await storage.getEstimates(status as string | undefined);
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching estimates:", error);
      res.status(500).json({ error: "Failed to fetch estimates" });
    }
  });

  app.get("/api/estimates/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.getEstimate(id);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error fetching estimate:", error);
      res.status(500).json({ error: "Failed to fetch estimate" });
    }
  });

  app.get("/api/estimates/property/:propertyId", async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const estimates = await storage.getEstimatesByProperty(propertyId);
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching property estimates:", error);
      res.status(500).json({ error: "Failed to fetch property estimates" });
    }
  });

  app.post("/api/estimates", async (req: Request, res: Response) => {
    try {
      const estimate = await storage.createEstimate(req.body);
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error creating estimate:", error);
      res.status(500).json({ error: "Failed to create estimate" });
    }
  });

  app.put("/api/estimates/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, req.body);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error updating estimate:", error);
      res.status(500).json({ error: "Failed to update estimate" });
    }
  });

  app.patch("/api/estimates/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, ...extras } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const estimate = await storage.updateEstimateStatus(id, status, extras);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error updating estimate status:", error);
      res.status(500).json({ error: "Failed to update estimate status" });
    }
  });

  app.delete("/api/estimates/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteEstimate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting estimate:", error);
      res.status(500).json({ error: "Failed to delete estimate" });
    }
  });
}
