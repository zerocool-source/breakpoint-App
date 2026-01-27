import { Express, Request, Response } from "express";
import { z } from "zod";
import { sendSms, isTwilioConfigured } from "../services/sms";
import { storage } from "../storage";
import { insertSmsMessageSchema } from "@shared/schema";

const sendSmsSchema = z.object({
  to: z.string().min(10, "Phone number required"),
  body: z.string().min(1, "Message body required"),
  from: z.string().optional(),
  technicianId: z.string().optional(),
  customerId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

export function registerSmsRoutes(app: Express) {
  app.get("/api/sms/status", async (_req: Request, res: Response) => {
    try {
      const configured = isTwilioConfigured();
      res.json({ 
        configured,
        message: configured 
          ? "Twilio is configured and ready to send SMS" 
          : "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sms/send", async (req: Request, res: Response) => {
    try {
      const validated = sendSmsSchema.parse(req.body);
      
      const smsRecord = await storage.createSmsMessage({
        to: validated.to,
        body: validated.body,
        from: validated.from,
        status: "pending",
        technicianId: validated.technicianId,
        customerId: validated.customerId,
        relatedEntityType: validated.relatedEntityType,
        relatedEntityId: validated.relatedEntityId,
      });

      const result = await sendSms({
        to: validated.to,
        body: validated.body,
        from: validated.from,
      });

      if (result.success) {
        await storage.updateSmsMessage(smsRecord.id, {
          status: "sent",
          twilioSid: result.sid,
          sentAt: new Date(),
        });
        res.json({ 
          success: true, 
          messageId: smsRecord.id,
          twilioSid: result.sid,
          status: result.status 
        });
      } else {
        await storage.updateSmsMessage(smsRecord.id, {
          status: "failed",
          errorMessage: result.error,
        });
        res.status(400).json({ 
          success: false, 
          messageId: smsRecord.id,
          error: result.error 
        });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.get("/api/sms/messages", async (req: Request, res: Response) => {
    try {
      const { technicianId, customerId, limit = "50" } = req.query;
      const messages = await storage.getSmsMessages({
        technicianId: technicianId as string,
        customerId: customerId as string,
        limit: parseInt(limit as string, 10),
      });
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sms/messages/:id", async (req: Request, res: Response) => {
    try {
      const message = await storage.getSmsMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "SMS message not found" });
      }
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
