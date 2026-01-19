import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertChemicalVendorSchema, insertInvoiceTemplateSchema } from "@shared/schema";

export function registerVendorRoutes(app: Express) {
  // Chemical Vendors CRUD
  app.get("/api/vendors", async (req: Request, res: Response) => {
    try {
      const vendors = await storage.getChemicalVendors();
      res.json(vendors);
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const vendor = await storage.getChemicalVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", async (req: Request, res: Response) => {
    try {
      const parsed = insertChemicalVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid vendor data", details: parsed.error.errors });
      }
      const vendor = await storage.createChemicalVendor(parsed.data);
      res.status(201).json(vendor);
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.put("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const vendor = await storage.updateChemicalVendor(req.params.id, req.body);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteChemicalVendor(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // Invoice Templates CRUD
  app.get("/api/invoice-templates", async (req: Request, res: Response) => {
    try {
      const templates = await storage.getInvoiceTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching invoice templates:", error);
      res.status(500).json({ error: "Failed to fetch invoice templates" });
    }
  });

  app.get("/api/invoice-templates/default", async (req: Request, res: Response) => {
    try {
      const template = await storage.getDefaultInvoiceTemplate();
      res.json(template || null);
    } catch (error: any) {
      console.error("Error fetching default template:", error);
      res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  app.get("/api/invoice-templates/:id", async (req: Request, res: Response) => {
    try {
      const template = await storage.getInvoiceTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/invoice-templates", async (req: Request, res: Response) => {
    try {
      const parsed = insertInvoiceTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid template data", details: parsed.error.errors });
      }
      const template = await storage.createInvoiceTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.put("/api/invoice-templates/:id", async (req: Request, res: Response) => {
    try {
      const template = await storage.updateInvoiceTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/invoice-templates/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteInvoiceTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Update tech ops entry with vendor assignment and send invoice
  app.post("/api/tech-ops/:id/assign-vendor", async (req: Request, res: Response) => {
    try {
      const { vendorId, vendorName } = req.body;
      const entry = await storage.updateTechOpsEntry(req.params.id, {
        vendorId,
        vendorName,
      });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error assigning vendor:", error);
      res.status(500).json({ error: "Failed to assign vendor" });
    }
  });

  app.post("/api/tech-ops/:id/send-invoice", async (req: Request, res: Response) => {
    try {
      const { vendorId, vendorName, templateId } = req.body;
      const entry = await storage.updateTechOpsEntry(req.params.id, {
        vendorId,
        vendorName,
        invoiceSentToVendorId: vendorId,
        invoiceTemplateId: templateId,
        orderStatus: "sent_to_vendor",
        invoiceSentAt: new Date(),
      } as any);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ error: "Failed to send invoice" });
    }
  });

  app.post("/api/tech-ops/:id/update-order-status", async (req: Request, res: Response) => {
    try {
      const { orderStatus } = req.body;
      const validStatuses = ["pending", "sent_to_vendor", "confirmed", "delivered"];
      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).json({ error: "Invalid order status" });
      }
      const entry = await storage.updateTechOpsEntry(req.params.id, {
        orderStatus,
      });
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });
}
