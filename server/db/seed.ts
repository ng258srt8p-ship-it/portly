/**
 * TRIPTIDE — Database Seed Script
 *
 * Loads the mock sailing data into PostgreSQL so the API routes
 * can serve real DB queries instead of the in-memory mock arrays.
 *
 * Run via: npm run seed
 */

import { getPool, closePool, testConnection } from './pool';

const sailings = [
  {
    cruise_line: 'Royal Caribbean',
    ship_name: 'Icon of the Seas',
    departure_date: '2026-12-20',
    duration_days: 7,
    departure_port: 'Miami, FL',
    itinerary: ['Miami', 'CocoCay', 'St. Thomas', 'St. Maarten', 'Miami'],
    destination_region: 'Caribbean',
  },
  {
    cruise_line: 'Royal Caribbean',
    ship_name: 'Symphony of the Seas',
    departure_date: '2026-11-15',
    duration_days: 7,
    departure_port: 'Miami, FL',
    itinerary: ['Miami', 'Cozumel', 'Roatán', 'Costa Maya', 'Miami'],
    destination_region: 'Caribbean',
  },
  {
    cruise_line: 'Princess Cruises',
    ship_name: 'Discovery Princess',
    departure_date: '2026-06-08',
    duration_days: 10,
    departure_port: 'Vancouver, BC',
    itinerary: ['Vancouver', 'Ketchikan', 'Juneau', 'Skagway', 'Glacier Bay', 'Vancouver'],
    destination_region: 'Alaska',
  },
  {
    cruise_line: 'Norwegian Cruise Line',
    ship_name: 'Norwegian Viva',
    departure_date: '2026-09-03',
    duration_days: 11,
    departure_port: 'Barcelona, ES',
    itinerary: ['Barcelona', 'Marseille', 'Florence', 'Rome', 'Naples', 'Barcelona'],
    destination_region: 'Mediterranean',
  },
  {
    cruise_line: 'Carnival Cruise Line',
    ship_name: 'Carnival Celebration',
    departure_date: '2026-07-22',
    duration_days: 4,
    departure_port: 'Miami, FL',
    itinerary: ['Miami', 'Nassau', 'Half Moon Cay', 'Miami'],
    destination_region: 'Bahamas',
  },
  {
    cruise_line: 'Celebrity Cruises',
    ship_name: 'Celebrity Beyond',
    departure_date: '2026-11-05',
    duration_days: 9,
    departure_port: 'San Juan, PR',
    itinerary: ['San Juan', 'Barbados', 'St. Lucia', 'Antigua', 'St. Thomas', 'San Juan'],
    destination_region: 'Caribbean',
  },
];

const pricingSnapshots = [
  { ship: 'Icon of the Seas', date: '2026-12-20', cabin_type: 'Balcony', passengers: 2, base: 1250.00, fees: 184.50, tips: 126.00, waived: false },
  { ship: 'Icon of the Seas', date: '2026-12-20', cabin_type: 'Balcony', passengers: 1, base: 1250.00, fees: 184.50, tips: 126.00, waived: false },
  { ship: 'Icon of the Seas', date: '2026-12-20', cabin_type: 'Inside', passengers: 2, base: 849.00, fees: 145.00, tips: 112.00, waived: false },
  { ship: 'Symphony of the Seas', date: '2026-11-15', cabin_type: 'Oceanview', passengers: 2, base: 899.00, fees: 145.00, tips: 112.00, waived: false },
  { ship: 'Symphony of the Seas', date: '2026-11-15', cabin_type: 'Inside', passengers: 2, base: 649.00, fees: 145.00, tips: 112.00, waived: false },
  { ship: 'Symphony of the Seas', date: '2026-11-15', cabin_type: 'Balcony', passengers: 2, base: 1199.00, fees: 145.00, tips: 112.00, waived: false },
  { ship: 'Discovery Princess', date: '2026-06-08', cabin_type: 'Balcony', passengers: 2, base: 1649.00, fees: 215.00, tips: 160.00, waived: false },
  { ship: 'Discovery Princess', date: '2026-06-08', cabin_type: 'Balcony', passengers: 1, base: 1649.00, fees: 215.00, tips: 160.00, waived: true },
  { ship: 'Discovery Princess', date: '2026-06-08', cabin_type: 'Inside', passengers: 2, base: 1099.00, fees: 215.00, tips: 160.00, waived: false },
  { ship: 'Discovery Princess', date: '2026-06-08', cabin_type: 'Suite', passengers: 2, base: 2799.00, fees: 215.00, tips: 160.00, waived: false },
  { ship: 'Norwegian Viva', date: '2026-09-03', cabin_type: 'Suite', passengers: 2, base: 3199.00, fees: 376.00, tips: 176.00, waived: false },
  { ship: 'Norwegian Viva', date: '2026-09-03', cabin_type: 'Balcony', passengers: 2, base: 1899.00, fees: 376.00, tips: 176.00, waived: false },
  { ship: 'Norwegian Viva', date: '2026-09-03', cabin_type: 'Inside', passengers: 2, base: 1299.00, fees: 376.00, tips: 176.00, waived: false },
  { ship: 'Carnival Celebration', date: '2026-07-22', cabin_type: 'Inside', passengers: 2, base: 449.00, fees: 98.00, tips: 64.00, waived: false },
  { ship: 'Carnival Celebration', date: '2026-07-22', cabin_type: 'Inside', passengers: 1, base: 449.00, fees: 98.00, tips: 64.00, waived: true },
  { ship: 'Carnival Celebration', date: '2026-07-22', cabin_type: 'Balcony', passengers: 2, base: 899.00, fees: 98.00, tips: 64.00, waived: false },
  { ship: 'Celebrity Beyond', date: '2026-11-05', cabin_type: 'Balcony', passengers: 2, base: 1349.00, fees: 198.00, tips: 144.00, waived: false },
  { ship: 'Celebrity Beyond', date: '2026-11-05', cabin_type: 'Suite', passengers: 2, base: 2599.00, fees: 198.00, tips: 144.00, waived: false },
  { ship: 'Celebrity Beyond', date: '2026-11-05', cabin_type: 'Inside', passengers: 2, base: 949.00, fees: 198.00, tips: 144.00, waived: false },
];

async function seed() {
  console.log('[SEED] Starting database seed...\n');

  const connected = await testConnection();
  if (!connected) {
    console.error('[SEED] Cannot connect to database. Run migration first: npm run migrate');
    process.exit(1);
  }

  const pool = getPool();
  let sailingCount = 0;
  let snapshotCount = 0;

  try {
    // Clear existing data
    await pool.query('DELETE FROM pricing_history');
    await pool.query('DELETE FROM pricing_snapshots');
    await pool.query('DELETE FROM sailings');
    console.log('[SEED] Cleared existing data\n');

    // Insert sailings
    for (const s of sailings) {
      await pool.query(
        `INSERT INTO sailings (cruise_line, ship_name, departure_date, duration_days, departure_port, itinerary, destination_region, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
         ON CONFLICT (cruise_line, ship_name, departure_date) DO NOTHING`,
        [s.cruise_line, s.ship_name, s.departure_date, s.duration_days, s.departure_port, s.itinerary, s.destination_region]
      );
      sailingCount++;
    }
    console.log(`[SEED] Inserted ${sailingCount} sailings`);

    // Insert pricing snapshots
    for (const ps of pricingSnapshots) {
      const { rows } = await pool.query(
        `SELECT id FROM sailings WHERE ship_name = $1 AND departure_date = $2 LIMIT 1`,
        [ps.ship, ps.date]
      );
      if (rows.length === 0) {
        console.warn(`[SEED] Skipping snapshot for ${ps.ship} / ${ps.date}: sailing not found`);
        continue;
      }
      const sailingId = rows[0].id;

      try {
        await pool.query(
          `INSERT INTO pricing_snapshots (sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd, is_solo_supplement_waived)
           VALUES ($1, $2::cabin_tier, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [sailingId, ps.cabin_type, ps.passengers, ps.base, ps.fees, ps.tips, ps.waived]
        );
        snapshotCount++;
      } catch (err: any) {
        console.warn(`[SEED] Skipping snapshot: ${err.message?.slice(0, 80)}`);
      }
    }
    console.log(`[SEED] Inserted ${snapshotCount} pricing snapshots`);

    // Verify
    const { rows: sailingRows } = await pool.query('SELECT COUNT(*)::int AS count FROM sailings');
    const { rows: snapshotRows } = await pool.query('SELECT COUNT(*)::int AS count FROM pricing_snapshots');
    console.log(`\n[SEED] Verification:`);
    console.log(`[SEED]   Sailings: ${sailingRows[0].count}`);
    console.log(`[SEED]   Pricing snapshots: ${snapshotRows[0].count}`);
    console.log(`\n[SEED] Seed complete!\n`);
  } catch (err) {
    console.error('[SEED] Seed failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();
