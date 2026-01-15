import { Request, Response } from "express";
import { storage } from "../storage";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ObjectStorageService, ObjectNotFoundError } from "../replit_integrations/object_storage";
import { sendEmail } from "../services/microsoftGraph";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

const COMPANY_INFO = {
  name: "Breakpoint Commercial Pool Systems",
  tagline: "Keeping People Safe",
  address: "6236 River Crest Drive Suite C",
  cityStateZip: "Riverside, CA 92507",
  phone: "(951) 653-3333",
  email: "info@breakpointpools.com",
  website: "www.BreakpointPools.com",
};

const COMPLIANCE_TEXT = `All work performed under this estimate will comply with applicable regulatory standards including but not limited to: California Title 22 (Health & Safety Code), California Title 24 (Building Standards), NEC Article 680 (Swimming Pools, Fountains, and Similar Installations), NFPA 54 (National Fuel Gas Code), ANSI/NSF 50 (Equipment for Swimming Pools, Spas, Hot Tubs, and Other Recreational Water Facilities), DOE (Department of Energy) efficiency standards, ADA (Americans with Disabilities Act) accessibility requirements, and VGB Act (Virginia Graeme Baker Pool and Spa Safety Act) compliance.`;

const TERMS_TEXT = `This estimate is valid for 60 days from the date shown above. For projects exceeding $500, a deposit of 10% or $1,000 (whichever is greater) is required to schedule work. For repairs exceeding $10,000, a 35% deposit is required. Final payment is due upon completion of work. All materials remain the property of Breakpoint Commercial Pool Systems until paid in full.`;

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

function generateLineItemsHtml(items: any[]): string {
  let html = "";
  for (const item of items) {
    const description = item.productService || item.description || "";
    const descDetail = item.description && item.productService !== item.description ? `<br><span style="color: #666; font-size: 12px;">${item.description}</span>` : "";
    html += `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px;">${description}${descDetail}</td>
        <td style="padding: 10px; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(item.rate || 0)}</td>
        <td style="padding: 10px; text-align: right;">${formatCurrency(item.amount || 0)}</td>
      </tr>`;
  }
  return html;
}

function generateApprovalEmailHtml(estimate: any, approveUrl: string, declineUrl: string): string {
  const items = estimate.items || [];
  const lineItemsHtml = generateLineItemsHtml(items);
  
  const billToName = estimate.customerName || estimate.propertyName || "";
  const billToAddress = estimate.billingAddress || estimate.address || "";
  const serviceLocationName = estimate.propertyName || "";
  const serviceLocationAddress = estimate.address || "";
  const hasProjectTitle = !!estimate.title;
  const projectTitle = estimate.title || "";
  const projectDescription = estimate.description || "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="background-color: #1e3a5f; padding: 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${COMPANY_INFO.name}</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-style: italic;">${COMPANY_INFO.tagline}</p>
            </td>
            <td style="text-align: right; color: #ffffff; font-size: 12px;">
              <p style="margin: 0;">${COMPANY_INFO.address}</p>
              <p style="margin: 0;">${COMPANY_INFO.cityStateZip}</p>
              <p style="margin: 0;">${COMPANY_INFO.phone}</p>
              <p style="margin: 0;">${COMPANY_INFO.email}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Estimate Title -->
    <tr>
      <td style="padding: 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h2 style="color: #1e3a5f; margin: 0; font-size: 28px;">ESTIMATE</h2>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0; color: #666;">Estimate #: <strong>${estimate.estimateNumber || "—"}</strong></p>
              <p style="margin: 0; color: #666;">Date: <strong>${formatDate(estimate.estimateDate || estimate.createdAt)}</strong></p>
              ${estimate.expirationDate ? `<p style="margin: 0; color: #666;">Valid Until: <strong>${formatDate(estimate.expirationDate)}</strong></p>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Bill To / Ship To -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48%" style="background-color: #f8f9fa; padding: 15px; vertical-align: top;">
              <p style="margin: 0 0 5px 0; color: #666; font-size: 12px; text-transform: uppercase;">Bill To</p>
              <p style="margin: 0; font-weight: bold;">${billToName}</p>
              ${estimate.managementCompany ? `<p style="margin: 0; color: #666;">C/O ${estimate.managementCompany}</p>` : ""}
              <p style="margin: 0; color: #666;">${billToAddress}</p>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background-color: #f8f9fa; padding: 15px; vertical-align: top;">
              <p style="margin: 0 0 5px 0; color: #666; font-size: 12px; text-transform: uppercase;">Service Location / Ship To</p>
              <p style="margin: 0; font-weight: bold;">${serviceLocationName}</p>
              <p style="margin: 0; color: #666;">${serviceLocationAddress}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Project Title -->
    ${hasProjectTitle ? `
    <tr>
      <td style="padding: 0 30px 10px 30px;">
        <h3 style="color: #e67e22; margin: 0;">Project: ${projectTitle}</h3>
      </td>
    </tr>
    ` : ""}

    <!-- Description -->
    ${projectDescription ? `
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="border-left: 4px solid #3498db; padding-left: 15px; color: #666;">
          ${projectDescription}
        </div>
      </td>
    </tr>
    ` : ""}

    <!-- Line Items Header -->
    <tr>
      <td style="padding: 0 30px;">
        <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">
          <tr style="background-color: #1e3a5f;">
            <td style="color: #ffffff; font-weight: bold; width: 50%;">Description</td>
            <td style="color: #ffffff; font-weight: bold; text-align: center;">Qty</td>
            <td style="color: #ffffff; font-weight: bold; text-align: right;">Rate</td>
            <td style="color: #ffffff; font-weight: bold; text-align: right;">Amount</td>
          </tr>
          ${lineItemsHtml}
        </table>
      </td>
    </tr>

    <!-- Totals -->
    <tr>
      <td style="padding: 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="60%"></td>
            <td width="40%">
              <table width="100%" cellpadding="8" cellspacing="0">
                <tr>
                  <td style="text-align: right; color: #666;">Subtotal</td>
                  <td style="text-align: right;">${formatCurrency(estimate.subtotal || 0)}</td>
                </tr>
                ${estimate.discountAmount > 0 ? `
                <tr>
                  <td style="text-align: right; color: #27ae60;">Discount</td>
                  <td style="text-align: right; color: #27ae60;">-${formatCurrency(estimate.discountAmount)}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="text-align: right; color: #666;">Tax${estimate.salesTaxRate ? ` (${estimate.salesTaxRate}%)` : ""}</td>
                  <td style="text-align: right;">${formatCurrency(estimate.salesTaxAmount || 0)}</td>
                </tr>
                <tr style="font-size: 18px; font-weight: bold;">
                  <td style="text-align: right; color: #1e3a5f;">Total</td>
                  <td style="text-align: right; color: #e67e22;">${formatCurrency(estimate.totalAmount || 0)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Compliance Section -->
    <tr>
      <td style="padding: 0 30px 20px 30px;">
        <div style="border: 1px solid #e0e0e0; padding: 15px; background-color: #fafafa;">
          <h4 style="color: #e67e22; margin: 0 0 10px 0; font-size: 14px;">COMPLIANCE & AUTHORIZATION</h4>
          <p style="margin: 0; font-size: 11px; color: #666; line-height: 1.5;">
            ${COMPLIANCE_TEXT}
          </p>
        </div>
      </td>
    </tr>

    <!-- Terms Section -->
    <tr>
      <td style="padding: 0 30px 30px 30px;">
        <div style="border: 1px solid #e0e0e0; padding: 15px; background-color: #fafafa;">
          <h4 style="color: #e67e22; margin: 0 0 10px 0; font-size: 14px;">TERMS & CONDITIONS</h4>
          <p style="margin: 0; font-size: 11px; color: #666; line-height: 1.5;">
            ${TERMS_TEXT}
          </p>
        </div>
      </td>
    </tr>

    <!-- Approval Section -->
    <tr>
      <td style="padding: 0 30px 30px 30px;">
        <div style="border: 2px solid #1e3a5f; border-radius: 8px; padding: 25px; text-align: center; background-color: #f8f9fa;">
          <h3 style="color: #1e3a5f; margin: 0 0 10px 0;">Your Response Required</h3>
          <p style="color: #666; margin: 0 0 20px 0;">Please review the estimate above and click one of the buttons below:</p>
          
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" style="text-align: center;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${approveUrl}" style="height:50px;v-text-anchor:middle;width:180px;" arcsize="10%" stroke="f" fillcolor="#27ae60">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">&#10003; APPROVE ESTIMATE</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${approveUrl}" style="display: inline-block; background-color: #27ae60; color: #ffffff; padding: 15px 40px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 5px;">&#10003; APPROVE ESTIMATE</a>
                <!--<![endif]-->
              </td>
              <td width="4%"></td>
              <td width="48%" style="text-align: center;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${declineUrl}" style="height:50px;v-text-anchor:middle;width:180px;" arcsize="10%" stroke="f" fillcolor="#e74c3c">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">&#10007; DECLINE ESTIMATE</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${declineUrl}" style="display: inline-block; background-color: #e74c3c; color: #ffffff; padding: 15px 40px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 5px;">&#10007; DECLINE ESTIMATE</a>
                <!--<![endif]-->
              </td>
            </tr>
          </table>
          
          <p style="color: #999; font-size: 11px; margin: 20px 0 0 0;">This link is secure and does not require you to log in. You will be asked to enter your name and title when responding.</p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1e3a5f; padding: 20px 30px; text-align: center;">
        <p style="color: #ffffff; margin: 0; font-size: 12px;">${COMPANY_INFO.name} • ${COMPANY_INFO.phone} • ${COMPANY_INFO.email}</p>
        <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px;">${COMPANY_INFO.website}</p>
      </td>
    </tr>

  </table>
</body>
</html>`;
}

async function generateEstimatePdf(estimate: any): Promise<Buffer> {
  const objectStorageService = new ObjectStorageService();
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  doc.text(COMPANY_INFO.tagline, 14, 26);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.address, pageWidth - 14, 14, { align: "right" });
  doc.text(COMPANY_INFO.cityStateZip, pageWidth - 14, 19, { align: "right" });
  doc.text(COMPANY_INFO.phone, pageWidth - 14, 24, { align: "right" });
  doc.text(COMPANY_INFO.email, pageWidth - 14, 29, { align: "right" });
  
  let yPos = 50;
  
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", 14, yPos);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Estimate #: ${estimate.estimateNumber || "—"}`, pageWidth - 14, yPos - 6, { align: "right" });
  doc.text(`Date: ${formatDate(estimate.estimateDate || estimate.createdAt)}`, pageWidth - 14, yPos, { align: "right" });
  if (estimate.expirationDate) {
    doc.text(`Valid Until: ${formatDate(estimate.expirationDate)}`, pageWidth - 14, yPos + 6, { align: "right" });
  }
  
  yPos += 15;
  
  const boxWidth = (pageWidth - 32) / 2;
  
  doc.setFillColor(248, 249, 250);
  doc.rect(14, yPos, boxWidth, 30, "F");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("BILL TO", 16, yPos + 6);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(estimate.customerName || estimate.propertyName || "", 16, yPos + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const billToAddress = estimate.billingAddress || estimate.address || "";
  doc.text(billToAddress.substring(0, 40), 16, yPos + 20);
  if (billToAddress.length > 40) {
    doc.text(billToAddress.substring(40, 80), 16, yPos + 26);
  }
  
  doc.setFillColor(248, 249, 250);
  doc.rect(18 + boxWidth, yPos, boxWidth, 30, "F");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("SERVICE LOCATION", 20 + boxWidth, yPos + 6);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(estimate.propertyName || "", 20 + boxWidth, yPos + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const serviceAddress = estimate.address || "";
  doc.text(serviceAddress.substring(0, 40), 20 + boxWidth, yPos + 20);
  if (serviceAddress.length > 40) {
    doc.text(serviceAddress.substring(40, 80), 20 + boxWidth, yPos + 26);
  }
  
  yPos += 38;
  
  if (estimate.title) {
    doc.setFontSize(12);
    doc.setTextColor(230, 126, 34);
    doc.setFont("helvetica", "bold");
    doc.text(`Project: ${estimate.title}`, 14, yPos);
    yPos += 8;
    
    if (estimate.description) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(estimate.description, pageWidth - 28);
      doc.text(descLines, 14, yPos);
      yPos += descLines.length * 5 + 5;
    }
  }
  
  const items = estimate.items || [];
  const tableData = items.map((item: any) => [
    item.productService || item.description || "",
    (item.quantity || 1).toString(),
    formatCurrency(item.rate || 0),
    formatCurrency(item.amount || 0),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: "bold", fontSize: 10 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });
  
  yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;
  
  const totalsX = pageWidth - 80;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal", totalsX, yPos);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(estimate.subtotal || 0), pageWidth - 14, yPos, { align: "right" });
  yPos += 7;
  
  if (estimate.discountAmount > 0) {
    doc.setTextColor(39, 174, 96);
    doc.text("Discount", totalsX, yPos);
    doc.text(`-${formatCurrency(estimate.discountAmount)}`, pageWidth - 14, yPos, { align: "right" });
    yPos += 7;
  }
  
  doc.setTextColor(100, 100, 100);
  doc.text(`Tax${estimate.salesTaxRate ? ` (${estimate.salesTaxRate}%)` : ""}`, totalsX, yPos);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(estimate.salesTaxAmount || 0), pageWidth - 14, yPos, { align: "right" });
  yPos += 10;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, yPos - 3, pageWidth - 14, yPos - 3);
  
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.text("Total", totalsX, yPos + 4);
  doc.setTextColor(230, 126, 34);
  doc.text(formatCurrency(estimate.totalAmount || 0), pageWidth - 14, yPos + 4, { align: "right" });
  
  yPos += 20;
  
  // Add Supporting Photos section if photos exist
  const validPhotos = (estimate.photos || []).filter((p: string) => p && !p.includes('[object Object]'));
  if (validPhotos.length > 0) {
    // Add section header
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.text("SUPPORTING PHOTOS", 14, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("The following photos document the work required:", 14, yPos);
    yPos += 10;
    
    // Calculate photo layout - 2 photos per row
    const photoWidth = 85;
    const photoHeight = 65;
    const margin = 14;
    const gap = 10;
    
    for (let i = 0; i < validPhotos.length; i++) {
      try {
        const photoPath = validPhotos[i];
        const objectFile = await objectStorageService.getObjectEntityFile(photoPath);
        const [contents] = await objectFile.download();
        const [metadata] = await objectFile.getMetadata();
        
        // Determine image format from content type
        let format: "JPEG" | "PNG" = "JPEG";
        if (metadata.contentType?.includes("png")) {
          format = "PNG";
        }
        
        // Convert buffer to base64
        const base64Image = contents.toString("base64");
        const imageData = `data:${metadata.contentType || "image/jpeg"};base64,${base64Image}`;
        
        // Calculate position (2 per row)
        const col = i % 2;
        const xPos = margin + col * (photoWidth + gap);
        
        // Check if we need a new page
        if (yPos + photoHeight > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        // Add image
        doc.addImage(imageData, format, xPos, yPos, photoWidth, photoHeight);
        
        // Add photo number label
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Photo ${i + 1}`, xPos, yPos + photoHeight + 5);
        
        // Move to next row after every 2 photos
        if (col === 1) {
          yPos += photoHeight + 15;
        }
      } catch (error) {
        console.error(`Error adding photo ${i + 1} to PDF:`, error);
        // Continue with other photos if one fails
      }
    }
    
    // Adjust yPos if we ended on an odd photo (left column)
    if (validPhotos.length % 2 === 1) {
      yPos += photoHeight + 15;
    }
    
    yPos += 10;
  }
  
  doc.setFontSize(7);
  const complianceLines = doc.splitTextToSize(COMPLIANCE_TEXT, pageWidth - 32);
  const complianceBoxHeight = 10 + complianceLines.length * 3.5;
  
  if (yPos + complianceBoxHeight > 260) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setDrawColor(224, 224, 224);
  doc.setFillColor(250, 250, 250);
  doc.rect(14, yPos, pageWidth - 28, complianceBoxHeight, "FD");
  doc.setFontSize(9);
  doc.setTextColor(230, 126, 34);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLIANCE & AUTHORIZATION", 16, yPos + 6);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(complianceLines, 16, yPos + 12);
  
  yPos += complianceBoxHeight + 5;
  
  const termsLines = doc.splitTextToSize(TERMS_TEXT, pageWidth - 32);
  const termsBoxHeight = 10 + termsLines.length * 3.5;
  
  if (yPos + termsBoxHeight > 270) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFillColor(250, 250, 250);
  doc.rect(14, yPos, pageWidth - 28, termsBoxHeight, "FD");
  doc.setFontSize(9);
  doc.setTextColor(230, 126, 34);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS", 16, yPos + 6);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(termsLines, 16, yPos + 12);
  
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(30, 58, 95);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${COMPANY_INFO.name} • ${COMPANY_INFO.phone} • ${COMPANY_INFO.email} • ${COMPANY_INFO.website}`, pageWidth / 2, pageHeight - 6, { align: "center" });
  
  return Buffer.from(doc.output("arraybuffer"));
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

  // Generate PDF for estimate
  app.get("/api/estimates/:id/pdf", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const estimate = await storage.getEstimate(id);
      
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      const pdfBuffer = await generateEstimatePdf(estimate);
      const filename = `Estimate-${estimate.estimateNumber || id}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating estimate PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Send estimate for customer approval via Microsoft Graph email
  app.post("/api/estimates/:id/send-for-approval", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      // Get the estimate first to check if it exists
      const existingEstimate = await storage.getEstimate(id);
      if (!existingEstimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      
      // Generate a secure approval token
      const approvalToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Generate the approval URLs
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000";
      const approveUrl = `${baseUrl}/approve/${approvalToken}?action=approve`;
      const declineUrl = `${baseUrl}/approve/${approvalToken}?action=decline`;
      
      // Generate email subject
      const emailSubject = `Estimate Approval Request: ${existingEstimate.title || 'Pool Service Estimate'} - ${existingEstimate.propertyName}`;
      
      // Generate the full branded HTML email
      const htmlContent = generateApprovalEmailHtml(existingEstimate, approveUrl, declineUrl);
      
      // Generate the PDF for attachment
      const pdfBuffer = await generateEstimatePdf(existingEstimate);
      const pdfBase64 = pdfBuffer.toString("base64");
      const pdfFilename = `Estimate-${existingEstimate.estimateNumber || id}.pdf`;
      
      // Send email via Microsoft Graph - this must succeed before updating any state
      await sendEmail({
        to: email,
        subject: emailSubject,
        htmlContent,
        attachments: [
          {
            name: pdfFilename,
            contentType: "application/pdf",
            contentBytes: pdfBase64,
          },
        ],
      });
      
      // Only update estimate after successful email send (atomic state update)
      const estimate = await storage.updateEstimate(id, {
        status: "pending_approval",
        approvalToken,
        approvalTokenExpiresAt: tokenExpiresAt,
        approvalSentTo: email,
        approvalSentAt: new Date(),
        sentForApprovalAt: new Date(),
      });
      
      res.json({ 
        estimate, 
        message: `Estimate approval email sent successfully to ${email}` 
      });
    } catch (error: any) {
      console.error("Error sending estimate for approval:", error);
      res.status(500).json({ error: `Failed to send approval email: ${error.message}` });
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
