import '../utils/dns-fallback.js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { config } from '../config/index.js';
import * as schema from './schema/index.js';

// Configure WebSocket for Node.js runtime environments
neonConfig.webSocketConstructor = ws;

// Initialize connection pool reading strictly from validated config
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

// Initialize Drizzle instance with schema
export const db = drizzle({ client: pool, schema });

/**
 * Validates connectivity with Neon PostgreSQL via simple ping query (SELECT 1).
 * Does not expose connection strings or credentials.
 */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const latencyMs = Math.round(performance.now() - start);
      return { ok: true, latencyMs };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database connection error';
    return { ok: false, latencyMs: Math.round(performance.now() - start), error: message };
  }
}
