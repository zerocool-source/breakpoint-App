import type { Express, Request, Response } from "express";
import { poolBrainClient } from "../poolbrain";

export function registerPoolBrainRoutes(app: Express) {
  
  app.get("/api/poolbrain/test", async (req: Request, res: Response) => {
    try {
      const result = await poolBrainClient.testConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Pool Brain connection test error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/poolbrain/products", async (req: Request, res: Response) => {
    try {
      const products = await poolBrainClient.getProducts();
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching Pool Brain products:", error);
      res.status(500).json({ error: "Failed to fetch products", message: error.message });
    }
  });
}
