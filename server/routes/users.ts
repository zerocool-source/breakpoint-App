import { Express } from "express";
import { storage } from "../storage";
import { insertSystemUserSchema } from "@shared/schema";

export function registerUserRoutes(app: Express) {
  app.get("/api/system-users", async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.getSystemUsers(role);
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch system users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/system-users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const user = await storage.getSystemUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/system-users", async (req, res) => {
    try {
      const existingUser = await storage.getSystemUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }
      
      const parsed = insertSystemUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid user data", details: parsed.error.errors });
      }
      
      const user = await storage.createSystemUser(parsed.data);
      res.status(201).json(user);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/system-users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      if (req.body.email) {
        const existingUser = await storage.getSystemUserByEmail(req.body.email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ error: "A user with this email already exists" });
        }
      }
      
      const user = await storage.updateSystemUser(id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/system-users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await storage.getSystemUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await storage.deleteSystemUser(id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
}
