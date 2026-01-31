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

  app.get("/api/poolbrain/customers", async (req: Request, res: Response) => {
    try {
      const customers = await poolBrainClient.getCustomers();
      res.json(customers);
    } catch (error: any) {
      console.error("Error fetching Pool Brain customers:", error);
      res.status(500).json({ error: "Failed to fetch customers", message: error.message });
    }
  });

  app.get("/api/poolbrain/customers/:customerId", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const customer = await poolBrainClient.getCustomerDetail(customerId);
      res.json(customer);
    } catch (error: any) {
      console.error("Error fetching Pool Brain customer detail:", error);
      res.status(500).json({ error: "Failed to fetch customer detail", message: error.message });
    }
  });

  app.get("/api/poolbrain/customers/:customerId/pools", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const pools = await poolBrainClient.getCustomerPools(customerId);
      res.json(pools);
    } catch (error: any) {
      console.error("Error fetching Pool Brain customer pools:", error);
      res.status(500).json({ error: "Failed to fetch customer pools", message: error.message });
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
