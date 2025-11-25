import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PoolBrainClient } from "./poolbrain-client";
import { insertAlertSchema, insertWorkflowSchema, insertCustomerSchema, insertChatMessageSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const data = req.body;
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);
      res.status(201).json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const alert = await storage.updateAlertStatus(id, status);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  // Workflows
  app.get("/api/workflows", async (req, res) => {
    try {
      const workflows = await storage.getWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const data = insertWorkflowSchema.parse(req.body);
      const workflow = await storage.createWorkflow(data);
      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ error: "Invalid workflow data" });
    }
  });

  app.patch("/api/workflows/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const workflow = await storage.updateWorkflowStatus(id, status);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  // Chat
  app.get("/api/chat/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatHistory(limit);
      res.json(messages.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat/message", async (req, res) => {
    try {
      const data = insertChatMessageSchema.parse(req.body);
      const message = await storage.addChatMessage(data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error adding chat message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Pool Brain API Proxy - Alerts List
  app.get("/api/poolbrain/alerts", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.poolBrainApiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured. Please configure in Settings." });
      }

      // Create Pool Brain client
      const client = new PoolBrainClient({
        apiKey: settings.poolBrainApiKey,
        companyId: settings.poolBrainCompanyId || undefined,
      });

      // Parse query parameters
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

      // Call Pool Brain API
      const data = await client.getAlertsList({
        fromDate,
        toDate,
        offset,
        limit,
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Pool Brain alerts:", error);
      res.status(500).json({ 
        error: "Failed to fetch alerts from Pool Brain",
        message: error.message 
      });
    }
  });

  // Pool Brain API Proxy - Customer List
  app.get("/api/poolbrain/customers", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.poolBrainApiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey: settings.poolBrainApiKey,
        companyId: settings.poolBrainCompanyId || undefined,
      });

      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

      const data = await client.getCustomerList({ offset, limit });
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Pool Brain customers:", error);
      res.status(500).json({ 
        error: "Failed to fetch customers from Pool Brain",
        message: error.message 
      });
    }
  });

  // Pool Brain API Proxy - Invoice List
  app.get("/api/poolbrain/invoices", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.poolBrainApiKey) {
        return res.status(400).json({ error: "Pool Brain API key not configured" });
      }

      const client = new PoolBrainClient({
        apiKey: settings.poolBrainApiKey,
        companyId: settings.poolBrainCompanyId || undefined,
      });

      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;

      const data = await client.getInvoiceList({ offset, limit });
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Pool Brain invoices:", error);
      res.status(500).json({ 
        error: "Failed to fetch invoices from Pool Brain",
        message: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
