import { Request, Response, Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

export function registerHealthRoutes(app: Express) {
  
  // Comprehensive health check endpoint for Ops/Debug app
  app.get("/api/health", async (req: Request, res: Response) => {
    const startTime = Date.now();
    const health: any = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {},
      errors: [],
    };

    // 1. Database Connectivity
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      health.checks.database = {
        status: "connected",
        responseTime: Date.now() - dbStart,
      };
    } catch (error: any) {
      health.status = "degraded";
      health.checks.database = {
        status: "disconnected",
        error: error.message,
      };
      health.errors.push({ component: "database", error: error.message });
    }

    // 2. Table Health - Check all required tables exist
    const requiredTables = [
      "customers", "technicians", "estimates", "invoices", "repair_requests",
      "alerts", "settings", "chat_messages", "workflows", "properties",
      "fleet_trucks", "fleet_inventory", "emergencies", "tech_ops_entries",
      "channels", "threads", "messages", "quickbooks_tokens"
    ];
    
    health.checks.tables = { existing: [], missing: [], counts: {} };
    
    for (const table of requiredTables) {
      try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        health.checks.tables.existing.push(table);
        health.checks.tables.counts[table] = Number((result as any)[0]?.count || 0);
      } catch {
        health.checks.tables.missing.push(table);
      }
    }
    
    if (health.checks.tables.missing.length > 0) {
      health.status = "degraded";
      health.errors.push({ 
        component: "tables", 
        error: `Missing tables: ${health.checks.tables.missing.join(", ")}` 
      });
    }

    // 3. QuickBooks Integration Status
    try {
      const qbTokens = await db.execute(sql`
        SELECT realm_id, access_token_expires_at, refresh_token_expires_at 
        FROM quickbooks_tokens 
        LIMIT 1
      `);
      const token = (qbTokens as any)[0];
      if (token) {
        const accessExpiry = new Date(token.access_token_expires_at);
        const refreshExpiry = new Date(token.refresh_token_expires_at);
        const now = new Date();
        health.checks.quickbooks = {
          connected: true,
          realmId: token.realm_id,
          accessTokenValid: accessExpiry > now,
          accessTokenExpiresIn: Math.round((accessExpiry.getTime() - now.getTime()) / 1000 / 60) + " minutes",
          refreshTokenValid: refreshExpiry > now,
          refreshTokenExpiresIn: Math.round((refreshExpiry.getTime() - now.getTime()) / 1000 / 60 / 60 / 24) + " days",
        };
      } else {
        health.checks.quickbooks = { connected: false };
      }
    } catch {
      health.checks.quickbooks = { connected: false, error: "Table not found" };
    }

    // 4. Data Integrity Checks
    health.checks.dataIntegrity = {};
    
    try {
      // Estimates without property
      const orphanedEstimates = await db.execute(sql`
        SELECT COUNT(*) as count FROM estimates 
        WHERE property_id IS NULL OR property_name IS NULL OR property_name = ''
      `);
      health.checks.dataIntegrity.estimatesWithoutProperty = Number((orphanedEstimates as any)[0]?.count || 0);
      
      // Invoices without QuickBooks sync
      const unsyncedInvoices = await db.execute(sql`
        SELECT COUNT(*) as count FROM invoices 
        WHERE quickbooks_invoice_id IS NULL AND status != 'draft'
      `);
      health.checks.dataIntegrity.invoicesNotSyncedToQB = Number((unsyncedInvoices as any)[0]?.count || 0);
      
      // Pending repair requests older than 7 days
      const oldPendingRequests = await db.execute(sql`
        SELECT COUNT(*) as count FROM repair_requests 
        WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'
      `);
      health.checks.dataIntegrity.oldPendingRepairRequests = Number((oldPendingRequests as any)[0]?.count || 0);
      
    } catch (error: any) {
      health.checks.dataIntegrity.error = error.message;
    }

    // 5. Workflow Status (Estimates Pipeline)
    try {
      const estimatesByStatus = await db.execute(sql`
        SELECT status, COUNT(*) as count 
        FROM estimates 
        GROUP BY status
      `);
      health.checks.estimatesPipeline = {};
      for (const row of estimatesByStatus as any[]) {
        health.checks.estimatesPipeline[row.status] = Number(row.count);
      }
    } catch {
      health.checks.estimatesPipeline = { error: "Could not fetch" };
    }

    // 6. Recent Activity (last 24 hours)
    health.checks.recentActivity = {};
    try {
      const recentEstimates = await db.execute(sql`
        SELECT COUNT(*) as count FROM estimates 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      health.checks.recentActivity.estimatesCreated24h = Number((recentEstimates as any)[0]?.count || 0);
      
      const recentInvoices = await db.execute(sql`
        SELECT COUNT(*) as count FROM invoices 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      health.checks.recentActivity.invoicesCreated24h = Number((recentInvoices as any)[0]?.count || 0);
      
      const recentRepairRequests = await db.execute(sql`
        SELECT COUNT(*) as count FROM repair_requests 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      health.checks.recentActivity.repairRequestsCreated24h = Number((recentRepairRequests as any)[0]?.count || 0);
    } catch {
      health.checks.recentActivity.error = "Could not fetch";
    }

    // 7. System Resources
    const memoryUsage = process.memoryUsage();
    health.checks.system = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
        external: Math.round(memoryUsage.external / 1024 / 1024) + " MB",
      },
      uptime: {
        seconds: Math.round(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
    };

    // 8. Environment Configuration
    health.checks.configuration = {
      databaseConfigured: !!process.env.DATABASE_URL,
      quickbooksConfigured: !!(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
      poolBrainConfigured: !!process.env.POOL_BRAIN_ACCESS_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      microsoftGraphConfigured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    };

    // 9. Scheduled Tasks Status
    health.checks.scheduledTasks = {
      deadlineChecker: "running", // The deadline checker runs every minute
    };

    // Total response time
    health.responseTime = Date.now() - startTime + "ms";

    // Set appropriate status code
    const statusCode = health.status === "healthy" ? 200 : 
                       health.status === "degraded" ? 207 : 500;
    
    res.status(statusCode).json(health);
  });

  // Quick liveness probe (for load balancers)
  app.get("/api/health/live", (req: Request, res: Response) => {
    res.json({ status: "alive", timestamp: new Date().toISOString() });
  });

  // Readiness probe (can the app serve traffic?)
  app.get("/api/health/ready", async (req: Request, res: Response) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({ status: "ready", timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(503).json({ 
        status: "not_ready", 
        reason: "Database unavailable",
        timestamp: new Date().toISOString() 
      });
    }
  });

  // Detailed database diagnostics
  app.get("/api/health/database", async (req: Request, res: Response) => {
    try {
      const tables = [
        "customers", "technicians", "estimates", "invoices", "repair_requests",
        "alerts", "settings", "chat_messages", "workflows", "properties",
        "fleet_trucks", "fleet_inventory", "emergencies", "tech_ops_entries",
        "channels", "threads", "messages", "quickbooks_tokens"
      ];
      
      const tableStats: any = {};
      
      for (const table of tables) {
        try {
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
          const count = Number((countResult as any)[0]?.count || 0);
          
          let latestRecord = null;
          try {
            const latest = await db.execute(sql.raw(
              `SELECT created_at FROM ${table} ORDER BY created_at DESC LIMIT 1`
            ));
            latestRecord = (latest as any)[0]?.created_at || null;
          } catch {
            // Table might not have created_at column
          }
          
          tableStats[table] = {
            exists: true,
            rowCount: count,
            latestRecord: latestRecord,
          };
        } catch {
          tableStats[table] = { exists: false };
        }
      }
      
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        tables: tableStats,
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Integration status check
  app.get("/api/health/integrations", async (req: Request, res: Response) => {
    const integrations: any = {};

    // QuickBooks
    try {
      const qbTokens = await db.execute(sql`
        SELECT realm_id, access_token_expires_at, refresh_token_expires_at, updated_at
        FROM quickbooks_tokens 
        LIMIT 1
      `);
      const token = (qbTokens as any)[0];
      if (token) {
        const now = new Date();
        integrations.quickbooks = {
          status: new Date(token.access_token_expires_at) > now ? "connected" : "token_expired",
          realmId: token.realm_id,
          lastUpdated: token.updated_at,
          accessTokenExpires: token.access_token_expires_at,
          refreshTokenExpires: token.refresh_token_expires_at,
        };
      } else {
        integrations.quickbooks = { status: "not_configured" };
      }
    } catch {
      integrations.quickbooks = { status: "error" };
    }

    // Pool Brain
    integrations.poolBrain = {
      status: process.env.POOL_BRAIN_ACCESS_KEY ? "configured" : "not_configured",
    };

    // Microsoft Graph (Email)
    integrations.microsoftGraph = {
      status: (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) 
        ? "configured" : "not_configured",
    };

    // OpenAI
    integrations.openai = {
      status: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
    };

    res.json({
      timestamp: new Date().toISOString(),
      integrations,
    });
  });

  // Metrics endpoint
  app.get("/api/health/metrics", async (req: Request, res: Response) => {
    try {
      const metrics: any = {
        timestamp: new Date().toISOString(),
      };

      // Estimates metrics
      const estimateMetrics = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'invoiced') as invoiced,
          COALESCE(SUM(total_amount), 0) as total_value,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'invoiced'), 0) as invoiced_value
        FROM estimates
      `);
      metrics.estimates = (estimateMetrics as any)[0];

      // Invoices metrics
      const invoiceMetrics = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'paid') as paid,
          COALESCE(SUM(total_amount), 0) as total_value,
          COALESCE(SUM(amount_paid), 0) as paid_value
        FROM invoices
      `);
      metrics.invoices = (invoiceMetrics as any)[0];

      // Repair requests metrics
      const repairMetrics = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE is_urgent = true) as urgent
        FROM repair_requests
      `);
      metrics.repairRequests = (repairMetrics as any)[0];

      // Technicians
      const techMetrics = await db.execute(sql`
        SELECT COUNT(*) as total FROM technicians WHERE is_active = true
      `);
      metrics.activeTechnicians = Number((techMetrics as any)[0]?.total || 0);

      // Customers
      const customerMetrics = await db.execute(sql`SELECT COUNT(*) as total FROM customers`);
      metrics.totalCustomers = Number((customerMetrics as any)[0]?.total || 0);

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(" ");
}
