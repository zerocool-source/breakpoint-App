import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors gracefully to prevent process crashes
pool.on('error', (err) => {
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

export const db = drizzle({ client: pool, schema });
