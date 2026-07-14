/**
 * TRIPTIDE — PostgreSQL Connection Pool
 *
 * Provides a shared pool instance for the Express API server.
 * Configures connection from environment variables with sensible
 * development defaults.
 */

import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || '/tmp',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'triptide',
  user: process.env.DB_USER || process.env.USER || 'georgetozer',
  password: process.env.DB_PASSWORD || undefined,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Use Unix socket by default on macOS (host = /tmp)
// Override with DB_HOST for TCP connections
let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1 AS ok');
    client.release();
    return true;
  } catch (err) {
    console.error('[DB] Connection test failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

/**
 * Create the triptide database if it doesn't exist.
 * Connects to the 'postgres' default database to issue CREATE DATABASE.
 */
export async function ensureDatabase(): Promise<void> {
  const adminPool = new Pool({
    host: process.env.DB_HOST || '/tmp',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: 'postgres',
    user: process.env.DB_USER || process.env.USER || 'georgetozer',
    password: process.env.DB_PASSWORD || undefined,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [poolConfig.database]
    );
    if (result.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${poolConfig.database}`);
      console.log(`[DB] Created database '${poolConfig.database}'`);
    }
  } finally {
    await adminPool.end();
  }
}

export default getPool;
