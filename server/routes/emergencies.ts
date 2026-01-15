import { Express } from "express";
import { storage } from "../storage";
import { insertEmergencySchema, type InsertEmergency } from "@shared/schema";
import { z } from "zod";

export function registerEmergencyRoutes(app: Express) {
  app.get("/api/emergencies", async (req, res) => {
    try {
      const { submitterRole, propertySearch, startDate, endDate, status } = req.query;
      
      const filters: any = {};
      if (submitterRole && typeof submitterRole === 'string') filters.submitterRole = submitterRole;
      if (propertySearch && typeof propertySearch === 'string') filters.propertySearch = propertySearch;
      if (startDate && typeof startDate === 'string') filters.startDate = new Date(startDate);
      if (endDate && typeof endDate === 'string') filters.endDate = new Date(endDate);
      if (status && typeof status === 'string') filters.status = status;
      
      const emergencies = await storage.getEmergencies(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(emergencies);
    } catch (error) {
      console.error("Failed to fetch emergencies:", error);
      res.status(500).json({ error: "Failed to fetch emergencies" });
    }
  });

  app.get("/api/emergencies/summary", async (req, res) => {
    try {
      const summary = await storage.getEmergenciesCount();
      res.json(summary);
    } catch (error) {
      console.error("Failed to fetch emergencies summary:", error);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  app.get("/api/emergencies/:id", async (req, res) => {
    try {
      const emergency = await storage.getEmergency(req.params.id);
      if (!emergency) {
        return res.status(404).json({ error: "Emergency not found" });
      }
      res.json(emergency);
    } catch (error) {
      console.error("Failed to fetch emergency:", error);
      res.status(500).json({ error: "Failed to fetch emergency" });
    }
  });

  app.post("/api/emergencies", async (req, res) => {
    try {
      const data = insertEmergencySchema.parse(req.body);
      const emergency = await storage.createEmergency(data);
      res.status(201).json(emergency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Failed to create emergency:", error);
      res.status(500).json({ error: "Failed to create emergency" });
    }
  });

  app.put("/api/emergencies/:id", async (req, res) => {
    try {
      const emergency = await storage.updateEmergency(req.params.id, req.body);
      if (!emergency) {
        return res.status(404).json({ error: "Emergency not found" });
      }
      res.json(emergency);
    } catch (error) {
      console.error("Failed to update emergency:", error);
      res.status(500).json({ error: "Failed to update emergency" });
    }
  });

  app.put("/api/emergencies/:id/status", async (req, res) => {
    try {
      const { status, resolvedById, resolvedByName, resolutionNotes } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const updates: Partial<InsertEmergency> = { status };
      if (status === 'resolved') {
        updates.resolvedAt = new Date();
        if (resolvedById) updates.resolvedById = resolvedById;
        if (resolvedByName) updates.resolvedByName = resolvedByName;
        if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
      }
      
      const emergency = await storage.updateEmergency(req.params.id, updates);
      if (!emergency) {
        return res.status(404).json({ error: "Emergency not found" });
      }
      res.json(emergency);
    } catch (error) {
      console.error("Failed to update emergency status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.delete("/api/emergencies/:id", async (req, res) => {
    try {
      await storage.deleteEmergency(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete emergency:", error);
      res.status(500).json({ error: "Failed to delete emergency" });
    }
  });
}
