import * as schema from "@shared/schema";
import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;

const useTcpPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
const useNeonWebSocket = databaseUrl.includes('neon') || databaseUrl.startsWith('wss://');

const shouldUseTcp = useTcpPostgres && !useNeonWebSocket;

let pool: any;
let db: any;

if (shouldUseTcp) {
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
  
  db = drizzlePg(pool, { schema });
  
  console.log('DB: using tcp postgres');
} else {
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
  
  process.on('unhandledRejection', (reason: any) => {
    if (reason?.code === '57P01' || reason?.message?.includes('terminating connection')) {
      console.warn('Database connection terminated by server, will reconnect on next query');
    } else {
      console.error('Unhandled rejection:', reason);
    }
  });
  
  db = drizzleNeon({ client: pool, schema });
  
  console.log('DB: using neon websocket');
}

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('DB: connection verified');
  } catch (err: any) {
    console.error('DB: connection check failed -', err.message);
  }
})();

export { pool, db };
