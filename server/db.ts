import { createRequire } from "node:module";
import * as schema from "@shared/schema";

const require = createRequire(import.meta.url);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;

// Determine connection type based on DATABASE_URL format
// Use TCP postgres for standard postgres:// or postgresql:// URLs  
// Use Neon WebSocket for URLs containing 'neon' (Replit's hosted Postgres)
const useTcpPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
const useNeonWebSocket = databaseUrl.includes('neon') || databaseUrl.startsWith('wss://');

// For Render.com and other standard Postgres hosts, use TCP connection
// For Replit with Neon, use WebSocket connection
const shouldUseTcp = useTcpPostgres && !useNeonWebSocket;

let pool: any;
let db: any;

if (shouldUseTcp) {
  // Use node-postgres (pg) for TCP connections - works on Render.com
  const pg = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");

  // Enable SSL for external connections (required by Render PostgreSQL)
  const isExternalConnection = databaseUrl.includes('.render.com') || databaseUrl.includes('sslmode=require');

  pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isExternalConnection ? { rejectUnauthorized: false } : false,
  });
  
  pool.on('error', (err: Error) => {
    console.error('Database pool error (will reconnect):', err.message);
  });
  
  db = drizzle(pool, { schema });
  
  console.log('DB: using tcp postgres');
} else {
  // Use Neon serverless for WebSocket connections - works on Replit
  const { Pool: NeonPool, neonConfig } = require("@neondatabase/serverless");
  const { drizzle } = require("drizzle-orm/neon-serverless");
  const ws = require("ws");
  
  neonConfig.webSocketConstructor = ws;
  
  pool = new NeonPool({ 
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  pool.on('error', (err: Error) => {
    console.error('Database pool error (will reconnect):', err.message);
  });
  
  // Handle uncaught errors from Neon serverless connections
  process.on('unhandledRejection', (reason: any) => {
    if (reason?.code === '57P01' || reason?.message?.includes('terminating connection')) {
      console.warn('Database connection terminated by server, will reconnect on next query');
    } else {
      console.error('Unhandled rejection:', reason);
    }
  });
  
  db = drizzle({ client: pool, schema });
  
  console.log('DB: using neon websocket');
}

// Startup health check
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('DB: connection verified');
  } catch (err: any) {
    console.error('DB: connection check failed -', err.message);
  }
})();

export { pool, db };
