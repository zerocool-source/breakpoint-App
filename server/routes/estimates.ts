import { Request, Response } from "express";
import { storage } from "../storage";
import crypto from "crypto";

const COMPANY_INFO = {
  name: "Breakpoint Commercial Pool Systems",
  tagline: "Keeping People Safe",
  address: "6236 River Crest Drive Suite C",
  cityStateZip: "Riverside, CA 92507",
  phone: "(951) 653-3333",
  email: "info@breakpointpools.com",
  website: "www.BreakpointPools.com",
};

const COMPLIANCE_TEXT = `All work performed under this estimate will comply with applicable regulatory standards including but not limited to: California Title 22, California Title 24, NEC Article 680, NFPA 54, ANSI/NSF 50, DOE efficiency standards, ADA accessibility requirements, and VGB Act compliance.`;

const TERMS_TEXT = `This estimate is valid for 60 days from the date shown above. For projects exceeding $500, a deposit of 10% or $1,000 (whichever is greater) is required. For repairs exceeding $10,000, a 35% deposit is required. Final payment is due upon completion.`;

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function generateApprovalEmailHtml(estimate: any, approveUrl: string, declineUrl: string): string {
  const items = estimate.items || [];
  const laborItems = items.filter((item: any) => {
    const classVal = (item.class || "").toLowerCase();
    const productVal = (item.productService || "").toLowerCase();
    const skuVal = (item.sku || "").toLowerCase();
    return classVal.includes("labor") || productVal.includes("labor") || skuVal.includes("labor");
  });
  const partsItems = items.filter((item: any) => !laborItems.includes(item));

  let itemsHtml = "";
  
  if (partsItems.length > 0) {
    itemsHtml += `<tr style="background-color: #f1f5f9;"><td colspan="4" style="padding: 8px; font-weight: bold; color: #475569; font-size: 12px; text-transform: uppercase;">Parts & Equipment</td></tr>`;
    for (const item of partsItems) {
      itemsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; color: #1e293b;">
            <strong>${item.productService || ""}</strong>
            ${item.description ? `<br><span style="color: #64748b; font-size: 13px;">${item.description}</span>` : ""}
          </td>
          <td style="padding: 12px; text-align: center; color: #475569;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; color: #475569;">${formatCurrency(item.rate || 0)}</td>
          <td style="padding: 12px; text-align: right; color: #1e293b; font-weight: 500;">${formatCurrency(item.amount || 0)}</td>
        </tr>`;
    }
  }
  
  if (laborItems.length > 0) {
    itemsHtml += `<tr style="background-color: #f1f5f9;"><td colspan="4" style="padding: 8px; font-weight: bold; color: #475569; font-size: 12px; text-transform: uppercase;">Labor</td></tr>`;
    for (const item of laborItems) {
      itemsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; color: #1e293b;">
            <strong>${item.productService || ""}</strong>
            ${item.description ? `<br><span style="color: #64748b; font-size: 13px;">${item.description}</span>` : ""}
          </td>
          <td style="padding: 12px; text-align: center; color: #475569;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; color: #475569;">${formatCurrency(item.rate || 0)}</td>
          <td style="padding: 12px; text-align: right; color: #1e293b; font-weight: 500;">${formatCurrency(item.amount || 0)}</td>
        </tr>`;
    }
  }
  
  if (partsItems.length === 0 && laborItems.length === 0) {
    for (const item of items) {
      itemsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; color: #1e293b;">
            <strong>${item.productService || ""}</strong>
            ${item.description ? `<br><span style="color: #64748b; font-size: 13px;">${item.description}</span>` : ""}
          </td>
          <td style="padding: 12px; text-align: center; color: #475569;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right; color: #475569;">${formatCurrency(item.rate || 0)}</td>
          <td style="padding: 12px; text-align: right; color: #1e293b; font-weight: 500;">${formatCurrency(item.amount || 0)}</td>
        </tr>`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimate ${estimate.estimateNumber || ""} - ${COMPANY_INFO.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a8a; padding: 24px; color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${COMPANY_INFO.name}</h1>
                    <p style="margin: 4px 0 0 0; font-size: 16px; color: #93c5fd; font-style: italic;">${COMPANY_INFO.tagline}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; font-size: 13px; color: #bfdbfe;">
                    ${COMPANY_INFO.address}<br>
                    ${COMPANY_INFO.cityStateZip}<br>
                    ${COMPANY_INFO.phone} | ${COMPANY_INFO.email}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Estimate Title -->
          <tr>
            <td style="padding: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h2 style="margin: 0; color: #1e3a8a; font-size: 28px; letter-spacing: 2px;">ESTIMATE</h2>
                  </td>
                  <td align="right" style="font-size: 14px; color: #475569;">
                    <strong>Estimate #:</strong> ${estimate.estimateNumber || "—"}<br>
                    <strong>Date:</strong> ${formatDate(estimate.estimateDate || estimate.createdAt)}<br>
                    ${estimate.expirationDate ? `<strong>Valid Until:</strong> ${formatDate(estimate.expirationDate)}` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Addresses -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="vertical-align: top; background-color: #f8fafc; padding: 16px; border-radius: 6px;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Bill To</p>
                    <p style="margin: 0; font-size: 15px; color: #1e293b; font-weight: 600;">${estimate.customerName || estimate.propertyName}</p>
                    ${estimate.managementCompany ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">C/O ${estimate.managementCompany}</p>` : ""}
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">${estimate.billingAddress || estimate.address || ""}</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align: top; background-color: #f8fafc; padding: 16px; border-radius: 6px;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Service Location</p>
                    <p style="margin: 0; font-size: 15px; color: #1e293b; font-weight: 600;">${estimate.propertyName}</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">${estimate.address || ""}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Project Title -->
          ${estimate.title ? `
          <tr>
            <td style="padding: 0 24px 16px 24px;">
              <p style="margin: 0; font-size: 16px; color: #1e3a8a; font-weight: bold;">Project: ${estimate.title}</p>
              ${estimate.description ? `<p style="margin: 8px 0 0 0; padding: 12px; background-color: #eff6ff; border-left: 4px solid #1e3a8a; color: #475569; font-size: 14px; border-radius: 0 6px 6px 0;">${estimate.description}</p>` : ""}
            </td>
          </tr>
          ` : ""}

          <!-- Line Items Table -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <tr style="background-color: #1e3a8a; color: #ffffff;">
                  <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">Description</th>
                  <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; width: 60px;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; width: 90px;">Rate</th>
                  <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; width: 90px;">Amount</th>
                </tr>
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="60%"></td>
                  <td width="40%" style="background-color: #f8fafc; padding: 16px; border-radius: 6px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; color: #475569; font-size: 14px;">Subtotal</td>
                        <td style="padding: 4px 0; text-align: right; color: #1e293b; font-size: 14px;">${formatCurrency(estimate.subtotal || 0)}</td>
                      </tr>
                      ${estimate.discountAmount > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; color: #16a34a; font-size: 14px;">Discount</td>
                        <td style="padding: 4px 0; text-align: right; color: #16a34a; font-size: 14px;">-${formatCurrency(estimate.discountAmount)}</td>
                      </tr>
                      ` : ""}
                      ${estimate.salesTaxAmount > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; color: #475569; font-size: 14px;">Sales Tax${estimate.salesTaxRate ? ` (${estimate.salesTaxRate}%)` : ""}</td>
                        <td style="padding: 4px 0; text-align: right; color: #1e293b; font-size: 14px;">${formatCurrency(estimate.salesTaxAmount)}</td>
                      </tr>
                      ` : ""}
                      <tr>
                        <td colspan="2" style="border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 8px;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">Total</td>
                        <td style="padding: 4px 0; text-align: right; color: #1e3a8a; font-size: 18px; font-weight: bold;">${formatCurrency(estimate.totalAmount || 0)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliance & Terms -->
          <tr>
            <td style="padding: 0 24px 16px 24px;">
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">Compliance & Authorization</p>
                <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5;">${COMPLIANCE_TEXT}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 6px; padding: 12px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #854d0e; text-transform: uppercase;">Terms & Conditions</p>
                <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5;">${TERMS_TEXT}</p>
              </div>
            </td>
          </tr>

          <!-- Approval Buttons - Large, Bulletproof for Outlook -->
          <tr>
            <td style="padding: 32px 24px; background-color: #f1f5f9; border-top: 2px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 22px; color: #1e293b; font-weight: bold;">Your Response Required</h3>
                    <p style="margin: 0; font-size: 15px; color: #64748b;">Click one of the buttons below to approve or decline this estimate.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${approveUrl}" style="height:60px;v-text-anchor:middle;width:280px;" arcsize="10%" stroke="f" fillcolor="#16a34a">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">&#10003; APPROVE ESTIMATE</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${approveUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 20px; font-weight: bold; min-width: 240px; text-align: center; mso-padding-alt: 0; mso-text-raise: 0;">
                      &#10003; APPROVE ESTIMATE
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${declineUrl}" style="height:60px;v-text-anchor:middle;width:280px;" arcsize="10%" stroke="f" fillcolor="#dc2626">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">&#10007; DECLINE ESTIMATE</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${declineUrl}" target="_blank" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 20px; font-weight: bold; min-width: 240px; text-align: center; mso-padding-alt: 0; mso-text-raise: 0;">
                      &#10007; DECLINE ESTIMATE
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">By clicking approve, you authorize the work described above.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">${COMPANY_INFO.name}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">${COMPANY_INFO.phone} | ${COMPANY_INFO.email} | ${COMPANY_INFO.website}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
      
      // Check for expired deadlines and auto-return to needs_scheduling
      const now = new Date();
      for (const est of estimates) {
        if (est.status === "scheduled" && est.deadlineAt) {
          const deadline = new Date(est.deadlineAt);
          if (deadline < now) {
            // Deadline expired - return to needs_scheduling
            await storage.updateEstimate(est.id, {
              status: "needs_scheduling",
              deadlineAt: null,
              repairTechId: null,
              repairTechName: null,
            });
            est.status = "needs_scheduling";
            est.deadlineAt = null;
          }
        }
      }
      
      res.json({ estimates });
    } catch (error: any) {
      console.error("Error fetching estimates:", error);
      res.status(500).json({ error: "Failed to fetch estimates" });
    }
  });

  // Estimate metrics - must be before :id routes
  app.get("/api/estimates/metrics", async (req: Request, res: Response) => {
    try {
      const estimates = await storage.getEstimates();
      
      const metrics = {
        total: estimates.length,
        byStatus: {} as Record<string, number>,
        totalValue: 0,
        approvedValue: 0,
        scheduledValue: 0,
        completedValue: 0,
        readyToInvoiceValue: 0,
        readyToInvoiceCount: 0,
        invoicedValue: 0,
        conversionRate: 0,
        avgApprovalTime: 0,
        avgSchedulingTime: 0,
        avgCompletionTime: 0,
      };

      let approvalTimes: number[] = [];
      let schedulingTimes: number[] = [];
      let completionTimes: number[] = [];

      for (const est of estimates) {
        const status = est.status || "draft";
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
        const amount = (est.totalAmount || 0) / 100;
        metrics.totalValue += amount;

        if (["approved", "needs_scheduling", "scheduled", "completed", "ready_to_invoice", "invoiced"].includes(status)) {
          metrics.approvedValue += amount;
        }
        if (["scheduled", "completed", "ready_to_invoice", "invoiced"].includes(status)) {
          metrics.scheduledValue += amount;
        }
        if (["completed", "ready_to_invoice", "invoiced"].includes(status)) {
          metrics.completedValue += amount;
        }
        if (status === "ready_to_invoice") {
          metrics.readyToInvoiceValue += amount;
          metrics.readyToInvoiceCount += 1;
        }
        if (status === "invoiced") {
          metrics.invoicedValue += amount;
        }

        // Calculate average times
        if (est.sentForApprovalAt && est.approvedAt) {
          approvalTimes.push(new Date(est.approvedAt).getTime() - new Date(est.sentForApprovalAt).getTime());
        }
        if (est.approvedAt && est.scheduledAt) {
          schedulingTimes.push(new Date(est.scheduledAt).getTime() - new Date(est.approvedAt).getTime());
        }
        if (est.scheduledAt && est.completedAt) {
          completionTimes.push(new Date(est.completedAt).getTime() - new Date(est.scheduledAt).getTime());
        }
      }

      const approvedCount = estimates.filter(e => 
        ["approved", "needs_scheduling", "scheduled", "completed", "ready_to_invoice", "invoiced"].includes(e.status || "")
      ).length;
      const sentCount = estimates.filter(e => 
        e.status !== "draft"
      ).length;

      metrics.conversionRate = sentCount > 0 ? Math.round((approvedCount / sentCount) * 100) : 0;
      
      // Average times in hours
      metrics.avgApprovalTime = approvalTimes.length > 0 
        ? Math.round(approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length / (1000 * 60 * 60))
        : 0;
      metrics.avgSchedulingTime = schedulingTimes.length > 0 
        ? Math.round(schedulingTimes.reduce((a, b) => a + b, 0) / schedulingTimes.length / (1000 * 60 * 60))
        : 0;
      metrics.avgCompletionTime = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / (1000 * 60 * 60))
        : 0;

      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching estimate metrics:", error);
      res.status(500).json({ error: "Failed to fetch estimate metrics" });
    }
  });

  // Get repair technicians with availability - must be before :id routes
  app.get("/api/estimates/repair-techs", async (req: Request, res: Response) => {
    try {
      const technicians = await storage.getTechnicians();
      const repairTechs = technicians.filter((t: any) => 
        t.role === "repair" || t.role === "repair_tech" || t.role === "repair_foreman"
      );
      
      // Get scheduled estimates for each tech to show their workload
      const allEstimates = await storage.getEstimates("scheduled");
      
      const techsWithAvailability = repairTechs.map((tech: any) => {
        const assignedEstimates = allEstimates.filter((e: any) => e.repairTechId === tech.id);
        const name = tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Unknown';
        return {
          ...tech,
          name,
          assignedJobs: assignedEstimates.length,
          scheduledEstimates: assignedEstimates.slice(0, 5).map((e: any) => ({
            id: e.id,
            title: e.title,
            propertyName: e.propertyName,
            scheduledDate: e.scheduledDate,
          })),
        };
      });

      res.json({ technicians: techsWithAvailability });
    } catch (error: any) {
      console.error("Error fetching repair techs:", error);
      res.status(500).json({ error: "Failed to fetch repair technicians" });
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

  // Estimate workflow transitions
  app.patch("/api/estimates/:id/approve", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedByManagerId, approvedByManagerName } = req.body;
      const estimate = await storage.updateEstimate(id, {
        status: "approved",
        approvedAt: new Date(),
        approvedByManagerId,
        approvedByManagerName,
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error approving estimate:", error);
      res.status(500).json({ error: "Failed to approve estimate" });
    }
  });

  app.patch("/api/estimates/:id/reject", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const estimate = await storage.updateEstimate(id, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason,
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error rejecting estimate:", error);
      res.status(500).json({ error: "Failed to reject estimate" });
    }
  });

  app.patch("/api/estimates/:id/needs-scheduling", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, {
        status: "needs_scheduling",
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error updating estimate:", error);
      res.status(500).json({ error: "Failed to update estimate" });
    }
  });

  app.patch("/api/estimates/:id/schedule", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { repairTechId, repairTechName, scheduledDate, scheduledByUserId, scheduledByUserName, deadlineAt, deadlineUnit, deadlineValue } = req.body;
      
      // Get the current estimate first to get property info
      const currentEstimate = await storage.getEstimate(id);
      if (!currentEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      // Update the estimate status to scheduled
      const estimate = await storage.updateEstimate(id, {
        status: "scheduled",
        repairTechId,
        repairTechName,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        scheduledAt: new Date(),
        scheduledByUserId,
        scheduledByUserName,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        deadlineUnit: deadlineUnit || "hours",
        deadlineValue: deadlineValue || null,
      });
      
      // Create a linked service repair job in the Repair Queue
      const repairJob = await storage.createServiceRepairJob({
        jobNumber: `EST-${currentEstimate.estimateNumber || id.slice(0, 8)}`,
        propertyId: currentEstimate.propertyId,
        propertyName: currentEstimate.propertyName,
        customerId: null,
        customerName: currentEstimate.customerName,
        address: currentEstimate.address,
        technicianId: repairTechId,
        technicianName: repairTechName,
        jobDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        description: currentEstimate.title,
        notes: currentEstimate.description,
        totalAmount: currentEstimate.totalAmount || 0,
        status: "in_progress",
        estimateId: id,
      });
      
      // Update estimate with the linked repair job ID
      await storage.updateEstimate(id, {
        assignedRepairJobId: repairJob.id,
      });
      
      res.json({ estimate: { ...estimate, assignedRepairJobId: repairJob.id }, repairJob });
    } catch (error: any) {
      console.error("Error scheduling estimate:", error);
      res.status(500).json({ error: "Failed to schedule estimate" });
    }
  });

  app.patch("/api/estimates/:id/complete", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, {
        status: "completed",
        completedAt: new Date(),
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error completing estimate:", error);
      res.status(500).json({ error: "Failed to complete estimate" });
    }
  });

  app.patch("/api/estimates/:id/ready-to-invoice", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.updateEstimate(id, {
        status: "ready_to_invoice",
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error marking estimate ready to invoice:", error);
      res.status(500).json({ error: "Failed to mark estimate ready to invoice" });
    }
  });

  app.patch("/api/estimates/:id/invoice", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { invoiceId } = req.body;
      const estimate = await storage.updateEstimate(id, {
        status: "invoiced",
        invoicedAt: new Date(),
        invoiceId,
      });
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json({ estimate });
    } catch (error: any) {
      console.error("Error invoicing estimate:", error);
      res.status(500).json({ error: "Failed to invoice estimate" });
    }
  });

  // Send estimate for customer approval
  app.post("/api/estimates/:id/send-for-approval", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      // Generate a secure approval token
      const approvalToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const estimate = await storage.updateEstimate(id, {
        status: "pending_approval",
        approvalToken,
        approvalTokenExpiresAt: tokenExpiresAt,
        approvalSentTo: email,
        approvalSentAt: new Date(),
        sentForApprovalAt: new Date(),
      });
      
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      // Generate the approval URLs
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000";
      const approveUrl = `${baseUrl}/approve/${approvalToken}?action=approve`;
      const declineUrl = `${baseUrl}/approve/${approvalToken}?action=decline`;
      const approvalUrl = `${baseUrl}/approve/${approvalToken}`;
      
      // Generate the HTML email content
      const emailHtml = generateApprovalEmailHtml(estimate, approveUrl, declineUrl);
      
      res.json({ 
        estimate, 
        approvalUrl,
        approveUrl,
        declineUrl,
        emailHtml,
        emailSubject: `Estimate ${estimate.estimateNumber || ""} from ${COMPANY_INFO.name} - Approval Required`,
        message: `Estimate sent for approval to ${email}` 
      });
    } catch (error: any) {
      console.error("Error sending estimate for approval:", error);
      res.status(500).json({ error: "Failed to send estimate for approval" });
    }
  });

  // Public: Get estimate by approval token (no auth required)
  app.get("/api/public/estimates/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      const estimate = await storage.getEstimateByApprovalToken(token);
      
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found or link has expired" });
      }
      
      // Check if token has expired
      if (estimate.approvalTokenExpiresAt && new Date(estimate.approvalTokenExpiresAt) < new Date()) {
        return res.status(410).json({ error: "This approval link has expired" });
      }
      
      // Check if already approved or rejected
      if (estimate.status === "approved" || estimate.status === "needs_scheduling" || estimate.status === "scheduled" || estimate.status === "completed") {
        return res.json({ estimate, alreadyProcessed: true, action: "approved" });
      }
      if (estimate.status === "rejected") {
        return res.json({ estimate, alreadyProcessed: true, action: "rejected" });
      }
      
      res.json({ estimate, alreadyProcessed: false });
    } catch (error: any) {
      console.error("Error fetching estimate by token:", error);
      res.status(500).json({ error: "Failed to fetch estimate" });
    }
  });

  // Public: Approve estimate (no auth required)
  app.post("/api/public/estimates/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { approverName, approverTitle } = req.body;
      
      if (!approverName) {
        return res.status(400).json({ error: "Your name is required to approve this estimate" });
      }
      
      const existingEstimate = await storage.getEstimateByApprovalToken(token);
      
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found or link has expired" });
      }
      
      // Check if token has expired
      if (existingEstimate.approvalTokenExpiresAt && new Date(existingEstimate.approvalTokenExpiresAt) < new Date()) {
        return res.status(410).json({ error: "This approval link has expired" });
      }
      
      // Check if already processed
      if (existingEstimate.status !== "pending_approval") {
        return res.status(400).json({ error: "This estimate has already been processed" });
      }
      
      // Approve the estimate and move to needs_scheduling
      const estimate = await storage.updateEstimate(existingEstimate.id, {
        status: "needs_scheduling",
        approvedAt: new Date(),
        customerApproverName: approverName,
        customerApproverTitle: approverTitle || null,
        acceptedBy: `${approverName}${approverTitle ? ` (${approverTitle})` : ""}`,
        acceptedDate: new Date(),
      });
      
      res.json({ 
        estimate, 
        message: "Estimate approved successfully. The team will contact you to schedule the work." 
      });
    } catch (error: any) {
      console.error("Error approving estimate:", error);
      res.status(500).json({ error: "Failed to approve estimate" });
    }
  });

  // Public: Reject estimate (no auth required)
  app.post("/api/public/estimates/reject/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { approverName, approverTitle, rejectionReason } = req.body;
      
      const existingEstimate = await storage.getEstimateByApprovalToken(token);
      
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found or link has expired" });
      }
      
      // Check if token has expired
      if (existingEstimate.approvalTokenExpiresAt && new Date(existingEstimate.approvalTokenExpiresAt) < new Date()) {
        return res.status(410).json({ error: "This approval link has expired" });
      }
      
      // Check if already processed
      if (existingEstimate.status !== "pending_approval") {
        return res.status(400).json({ error: "This estimate has already been processed" });
      }
      
      // Reject the estimate
      const estimate = await storage.updateEstimate(existingEstimate.id, {
        status: "rejected",
        rejectedAt: new Date(),
        customerApproverName: approverName || null,
        customerApproverTitle: approverTitle || null,
        rejectionReason: rejectionReason || null,
      });
      
      res.json({ 
        estimate, 
        message: "Estimate has been declined. Thank you for your response." 
      });
    } catch (error: any) {
      console.error("Error rejecting estimate:", error);
      res.status(500).json({ error: "Failed to reject estimate" });
    }
  });
}
