import { Router, Request, Response } from "express";
import { sendEmail } from "../services/microsoftGraph";
import { z } from "zod";

const router = Router();

const COMPANY_INFO = {
  name: "Breakpoint Commercial Pool Systems, Inc.",
  tagline: "Keeping People Safe™",
  address: "6236 River Crest Drive, Suite C",
  cityStateZip: "Riverside, CA 92507",
  phone: "(951) 653-3333",
  email: "info@breakpointpools.com",
  website: "www.BreakpointPools.com"
};

const recipientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email("Invalid email address"),
});

const emailBlastSchema = z.object({
  recipients: z.array(recipientSchema).min(1, "At least one recipient required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

function replaceTemplateVariables(text: string, customerName: string): string {
  return text
    .replace(/\{\{customer_name\}\}/g, customerName)
    .replace(/\{\{company_name\}\}/g, COMPANY_INFO.name);
}

function generateEmailHtml(body: string, customerName: string): string {
  const personalizedBody = replaceTemplateVariables(body, customerName);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="background-color: #1e3a5f; padding: 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${COMPANY_INFO.name}</h1>
              <p style="color: #7dd8f0; margin: 5px 0 0 0; font-style: italic; font-size: 14px;">${COMPANY_INFO.tagline}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <div style="font-size: 14px; line-height: 1.6; color: #333333; white-space: pre-wrap;">
${personalizedBody}
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e0e0e0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                ${COMPANY_INFO.name}
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666666;">
                ${COMPANY_INFO.address} | ${COMPANY_INFO.cityStateZip}
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666666;">
                Phone: ${COMPANY_INFO.phone} | Email: ${COMPANY_INFO.email}
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #999999;">
                <a href="https://${COMPANY_INFO.website}" style="color: #0078D4; text-decoration: none;">${COMPANY_INFO.website}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</body>
</html>`;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const parseResult = emailBlastSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request", 
        details: parseResult.error.errors.map(e => e.message).join(", ")
      });
    }
    
    const { recipients, subject, body } = parseResult.data;
    const results: { success: boolean; email: string; error?: string }[] = [];
    
    for (const recipient of recipients) {
      try {
        const customerName = recipient.name || "Valued Customer";
        const htmlContent = generateEmailHtml(body, customerName);
        const personalizedSubject = replaceTemplateVariables(subject, customerName);
        
        await sendEmail({
          to: recipient.email,
          subject: personalizedSubject,
          htmlContent,
        });
        
        results.push({ success: true, email: recipient.email });
      } catch (error: any) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({ success: false, email: recipient.email, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    res.json({
      message: `Email blast completed. ${successCount} sent successfully, ${failureCount} failed.`,
      results,
      successCount,
      failureCount,
    });
  } catch (error: any) {
    console.error("Email blast error:", error);
    res.status(500).json({ error: error.message || "Failed to send email blast" });
  }
});

export default router;
