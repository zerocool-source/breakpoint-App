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

  // Send invoice to QuickBooks
  app.post("/api/invoices/:id/send-to-quickbooks", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customerEmail, sendEmail = true } = req.body;
      
      // 1. Get the invoice from our database
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      if (invoice.quickbooksInvoiceId) {
        return res.status(400).json({ error: "Invoice already sent to QuickBooks" });
      }
      
      // 2. Forward the request to QuickBooks route (reuse existing logic)
      const qbResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/quickbooks/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: invoice.customerName,
          customerEmail: customerEmail || invoice.emailedTo,
          lineItems: invoice.lineItems || [],
          memo: invoice.notes,
          sendEmail: sendEmail,
          estimateId: invoice.estimateId,
        })
      });
      
      if (!qbResponse.ok) {
        const errorData = await qbResponse.json();
        return res.status(qbResponse.status).json(errorData);
      }
      
      const qbResult = await qbResponse.json();
      
      // 3. Update our invoice with QuickBooks info
      const [updated] = await db
        .update(invoices)
        .set({
          quickbooksInvoiceId: qbResult.qbInvoiceId,
          quickbooksDocNumber: qbResult.qbDocNumber,
          quickbooksSyncedAt: new Date(),
          quickbooksSyncStatus: 'synced',
          status: 'sent',
          sentAt: new Date(),
          emailedTo: customerEmail || invoice.emailedTo,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id))
        .returning();
      
      res.json({ 
        success: true, 
        invoice: updated,
        qbNumber: qbResult.qbDocNumber,
        qbInvoiceId: qbResult.qbInvoiceId,
      });
    } catch (error: any) {
      console.error("Error sending invoice to QuickBooks:", error);
      res.status(500).json({ error: "Failed to send invoice to QuickBooks", message: error.message });
    }
  });
}
