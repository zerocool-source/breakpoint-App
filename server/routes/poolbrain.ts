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

  app.get("/api/poolbrain/alerts", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const alerts = await poolBrainClient.getAlerts({
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching Pool Brain alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts", message: error.message });
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

  app.get("/api/poolbrain/technicians", async (req: Request, res: Response) => {
    try {
      const technicians = await poolBrainClient.getTechnicians();
      res.json(technicians);
    } catch (error: any) {
      console.error("Error fetching Pool Brain technicians:", error);
      res.status(500).json({ error: "Failed to fetch technicians", message: error.message });
    }
  });

  app.get("/api/poolbrain/routes", async (req: Request, res: Response) => {
    try {
      const routes = await poolBrainClient.getRoutes();
      res.json(routes);
    } catch (error: any) {
      console.error("Error fetching Pool Brain routes:", error);
      res.status(500).json({ error: "Failed to fetch routes", message: error.message });
    }
  });

  app.get("/api/poolbrain/jobs", async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const jobs = await poolBrainClient.getJobs({
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching Pool Brain jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs", message: error.message });
    }
  });
}
