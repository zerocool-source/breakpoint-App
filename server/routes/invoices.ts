import { Request, Response, Express } from "express";
import { db } from "../db";
import { invoices } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export function registerInvoiceRoutes(app: Express) {
  app.get("/api/invoices", async (_req: Request, res: Response) => {
    try {
      const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
      res.json({ invoices: allInvoices });
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices", message: error.message });
    }
  });

  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json({ invoice });
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice", message: error.message });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      const invoiceData = req.body;
      
      // Generate invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        const year = new Date().getFullYear().toString().slice(-2);
        const countResult = await db
          .select({ count: sql<number>`COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1` })
          .from(invoices)
          .where(sql`invoice_number LIKE ${'INV-' + year + '-%'}`);
        const nextNum = (countResult[0]?.count || 1).toString().padStart(5, '0');
        invoiceData.invoiceNumber = `INV-${year}-${nextNum}`;
      }
      
      // Convert date strings to Date objects
      if (invoiceData.dueDate && typeof invoiceData.dueDate === 'string') {
        invoiceData.dueDate = new Date(invoiceData.dueDate);
      }
      if (invoiceData.paidDate && typeof invoiceData.paidDate === 'string') {
        invoiceData.paidDate = new Date(invoiceData.paidDate);
      }
      if (invoiceData.sentAt && typeof invoiceData.sentAt === 'string') {
        invoiceData.sentAt = new Date(invoiceData.sentAt);
      }
      
      const [newInvoice] = await db.insert(invoices).values(invoiceData).returning();
      res.json({ success: true, invoice: newInvoice });
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice", message: error.message });
    }
  });

  app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [updated] = await db
        .update(invoices)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(invoices.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json({ success: true, invoice: updated });
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice", message: error.message });
    }
  });

  app.patch("/api/invoices/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const updateData: any = { status, updatedAt: new Date() };
      
      if (status === "paid") {
        updateData.paidDate = new Date();
      } else if (status === "sent") {
        updateData.sentAt = new Date();
      }
      
      const [updated] = await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json({ success: true, invoice: updated });
    } catch (error: any) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ error: "Failed to update invoice status", message: error.message });
    }
  });

  app.get("/api/invoices/next-number", async (_req: Request, res: Response) => {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      const countResult = await db
        .select({ count: sql<number>`COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1` })
        .from(invoices)
        .where(sql`invoice_number LIKE ${'INV-' + year + '-%'}`);
      const nextNum = (countResult[0]?.count || 1).toString().padStart(5, '0');
      res.json({ nextNumber: `INV-${year}-${nextNum}` });
    } catch (error: any) {
      console.error("Error generating invoice number:", error);
      res.status(500).json({ error: "Failed to generate invoice number" });
    }
  });
}
