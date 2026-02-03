import { Request, Response } from "express";
import { storage } from "../storage";
import { parseOfficeNotesForRepairs, extractPricesFromNotes, type ParsedRepair } from "../repair-parser";
import { insertPropertySchema } from "@shared/schema";

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
      const parsed = insertPropertySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const property = await storage.createProperty(parsed.data);
      res.status(201).json(property);
    } catch (error: any) {
      console.error("Error creating property:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  // Update property
  app.put("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const parsed = insertPropertySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const property = await storage.updateProperty(req.params.id, parsed.data);
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

  // Property Contacts
  app.get("/api/properties/:propertyId/contacts", async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getPropertyContacts(req.params.propertyId);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error fetching property contacts:", error);
      res.status(500).json({ error: "Failed to fetch property contacts" });
    }
  });

  app.post("/api/properties/:propertyId/contacts", async (req: Request, res: Response) => {
    try {
      const contact = await storage.createPropertyContact({
        ...req.body,
        propertyId: req.params.propertyId,
      });
      res.status(201).json(contact);
    } catch (error: any) {
      console.error("Error creating property contact:", error);
      res.status(500).json({ error: "Failed to create property contact" });
    }
  });

  app.delete("/api/properties/:propertyId/contacts/:contactId", async (req: Request, res: Response) => {
    try {
      await storage.deletePropertyContact(req.params.contactId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting property contact:", error);
      res.status(500).json({ error: "Failed to delete property contact" });
    }
  });

  // Property Billing Contacts
  app.get("/api/properties/:propertyId/billing", async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getPropertyBillingContacts(req.params.propertyId);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error fetching billing contacts:", error);
      res.status(500).json({ error: "Failed to fetch billing contacts" });
    }
  });

  app.post("/api/properties/:propertyId/billing", async (req: Request, res: Response) => {
    try {
      const contact = await storage.createPropertyBillingContact({
        ...req.body,
        propertyId: req.params.propertyId,
      });
      res.status(201).json(contact);
    } catch (error: any) {
      console.error("Error creating billing contact:", error);
      res.status(500).json({ error: "Failed to create billing contact" });
    }
  });

  app.delete("/api/properties/:propertyId/billing/:contactId", async (req: Request, res: Response) => {
    try {
      await storage.deletePropertyBillingContact(req.params.contactId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting billing contact:", error);
      res.status(500).json({ error: "Failed to delete billing contact" });
    }
  });

  // Property Access Notes
  app.get("/api/properties/:propertyId/access-notes", async (req: Request, res: Response) => {
    try {
      const notes = await storage.getPropertyAccessNotes(req.params.propertyId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching access notes:", error);
      res.status(500).json({ error: "Failed to fetch access notes" });
    }
  });

  app.post("/api/properties/:propertyId/access-notes", async (req: Request, res: Response) => {
    try {
      const note = await storage.createPropertyAccessNote({
        ...req.body,
        propertyId: req.params.propertyId,
      });
      res.status(201).json(note);
    } catch (error: any) {
      console.error("Error creating access note:", error);
      res.status(500).json({ error: "Failed to create access note" });
    }
  });

  app.delete("/api/properties/:propertyId/access-notes/:noteId", async (req: Request, res: Response) => {
    try {
      await storage.deletePropertyAccessNote(req.params.noteId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting access note:", error);
      res.status(500).json({ error: "Failed to delete access note" });
    }
  });

  // Property repairs endpoint - Pool Brain API disabled, use tech_ops_entries instead
  app.get("/api/properties/repairs", async (_req: Request, res: Response) => {
    res.json({
      properties: [],
      summary: {
        totalProperties: 0,
        totalRepairs: 0,
        totalSpend: 0,
        averageSpendPerProperty: 0,
        topSpender: null,
        monthlyTotals: {}
      },
      message: "Pool Brain API disabled - use internal tech_ops_entries data"
    });
  });
}
