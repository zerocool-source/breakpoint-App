import type { Request, Response } from "express";

const API_V2_BASE_URL = "https://breakpoint-api-v2.onrender.com";

export function registerApiV2Routes(app: any) {
  app.get("/api/v2/users", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const role = req.query.role as string | undefined;
      
      let url = `${API_V2_BASE_URL}/api/users`;
      if (role) {
        url += `?role=${encodeURIComponent(role)}`;
      }
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: error || "Failed to fetch users from API v2" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching users from API v2:", error);
      res.status(500).json({ error: "Failed to fetch users", message: error.message });
    }
  });

  app.post("/api/v2/users", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const { email, password, firstName, lastName, phone, role, region } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Email, password, first name, and last name are required" });
      }
      
      const response = await fetch(`${API_V2_BASE_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          phone: phone || null,
          role: role || "technician",
          region: region || null,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: error || "Failed to create user in API v2" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error creating user in API v2:", error);
      res.status(500).json({ error: "Failed to create user", message: error.message });
    }
  });

  app.put("/api/v2/users/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      const updates = req.body;
      
      const response = await fetch(`${API_V2_BASE_URL}/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: error || "Failed to update user in API v2" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error updating user in API v2:", error);
      res.status(500).json({ error: "Failed to update user", message: error.message });
    }
  });

  app.delete("/api/v2/users/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const { id } = req.params;
      
      const response = await fetch(`${API_V2_BASE_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: error || "Failed to delete user in API v2" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error deleting user in API v2:", error);
      res.status(500).json({ error: "Failed to delete user", message: error.message });
    }
  });
}
