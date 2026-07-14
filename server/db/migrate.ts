/**
 * TRIPTIDE — Database Migration Runner
 *
 * Reads server/db/schema.sql and executes it against the database.
 * Run via: npm run migrate
 *
 * NOTE: Executes the full schema in one shot so that DO $$ blocks
 * (which contain internal semicolons) work correctly.
 */

import fs from 'fs';
import path from 'path';
import { getPool, ensureDatabase, closePool, testConnection } from './pool';

async function migrate() {
  console.log('[MIGRATE] Starting database migration...\n');

  // Ensure the database exists
  await ensureDatabase();

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('[MIGRATE] Cannot connect to database. Aborting.');
    process.exit(1);
  }
  console.log('[MIGRATE] Database connection OK\n');

  // Read schema SQL
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const v2Path = path.join(__dirname, 'migration_v2.sql');
  const v2Schema = fs.readFileSync(v2Path, 'utf-8');

  const pool = getPool();

  try {
    // Execute the schema files as one query
    await pool.query(schema);
    console.log('[MIGRATE] Schema v1 executed successfully\n');

    // Run v2 data enrichment migration
    await pool.query(v2Schema);
    console.log('[MIGRATE] Schema v2 (data enrichment) executed successfully\n');

    // Verify key tables exist
    const tables = ['sailings', 'pricing_snapshots', 'pricing_history', 'price_alerts', 'sync_log', 'ship_details', 'destination_insights', 'market_comparisons', 'price_forecasts', 'booking_insights'];
    for (const table of tables) {
      const { rows } = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) AS exists`,
        [table]
      );
      console.log(`[MIGRATE]   ${table}: ${rows[0].exists ? '✓' : '✗'}`);
    }
    console.log('');
  } catch (err) {
    console.error('[MIGRATE] Migration failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
