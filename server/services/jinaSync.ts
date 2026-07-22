/**
 * TripTide — Jina Reader Sync Service
 * 
 * Uses Jina AI Reader (free, unlimited) to scrape real cruise data
 * from Royal Caribbean and other booking sites.
 * 
 * Strategy:
 * 1. Generate list of target URLs (ships + date ranges)
 * 2. Scrape with Jina Reader
 * 3. Parse markdown for ship, date, price, itinerary
 * 4. Upsert to database
 * 
 * Cost: $0.00 (Jina Reader is free)
 * Limits: Unknown (seems unlimited as of 2026-07)
 */

import JinaReader from './jinaReader';
import { ParsedCruise } from './jinaParser';

const CRUISE_URLS = [
  'https://www.royalcaribbean.com/cruises/icon-of-the-seas',
  'https://www.royalcaribbean.com/cruises/wonder-of-the-seas',
  'https://www.royalcaribbean.com/cruises/symphony-of-the-seas',
  'https://www.royalcaribbean.com/cruises/utopia-of-the-seas',
  'https://www.royalcaribbean.com/cruises/allure-of-the-seas',
  'https://www.carnival.com/cruises',
  'https://www.ncl.com/cruises',
];

interface ParsedSailing {
  cruiseLine: string;
  ship: string;
  sailDate: string;
  duration: number;
  departurePort: string;
  destination: string;
  itinerary: string[];
  cabinPricing: {
    inside: number;
    oceanview: number;
    balcony: number;
    suite: number;
  };
  rawMarkdown: string;
}

/**
 * Parse Jina markdown output into structured sailing data.
 * Uses the dedicated jinaParser module for high accuracy.
 */
function parseJinaOutput(markdown: string, url: string): ParsedSailing[] {
  const { parseJinaMarkdown } = require('./jinaParser');
  
  console.log('[Jina Parser] Parsing markdown...');
  
  const result = parseJinaMarkdown(markdown, url);
  
  if (!result.success || result.cruises.length === 0) {
    console.warn('[Jina Parser] No cruises parsed:', result.errors);
    return [];
  }
  
  console.log(`[Jina Parser] ✅ Parsed ${result.cruises.length} cruise(s)`);
  
  if (result.warnings.length > 0) {
    console.warn('[Jina Parser] Warnings:', result.warnings);
  }
  
  // Convert ParsedCruise to ParsedSailing format
  return result.cruises.map((cruise: ParsedCruise) => ({
    cruiseLine: cruise.cruiseLine,
    ship: cruise.ship,
    sailDate: cruise.sailDate,
    duration: cruise.duration,
    departurePort: cruise.departurePort,
    destination: cruise.destination,
    itinerary: cruise.itinerary,
    cabinPricing: cruise.cabinPricing,
    rawMarkdown: cruise.rawMarkdown,
  }));
}

/**
 * Upsert parsed sailings to database.
 */
async function upsertSailings(sailings: ParsedSailing[]): Promise<void> {
  const { getPool } = await import('../db/pool');
  const pool = getPool();
  
  for (const s of sailings) {
    try {
      // Upsert sailing
      await pool.query(`
        INSERT INTO sailings (
          cruise_line, ship_name, departure_date, duration_days,
          departure_port, destination_region, itinerary,
          cron_source, scraped_at
        )
        VALUES ($1, $2, $3::date, $4, $5, $6, $7, 'jina-reader', NOW())
        ON CONFLICT (cruise_line, ship_name, CAST(departure_date AS date))
        DO UPDATE SET
          duration_days = EXCLUDED.duration_days,
          departure_port = EXCLUDED.departure_port,
          destination_region = EXCLUDED.destination_region,
          itinerary = EXCLUDED.itinerary,
          scraped_at = NOW()
      `, [
        s.cruiseLine,
        s.ship,
        s.sailDate,
        s.duration,
        s.departurePort,
        s.destination,
        s.itinerary,
      ]);

      // Get sailing ID
      const sailingRes = await pool.query(
        `SELECT id FROM sailings 
         WHERE cruise_line = $1 AND ship_name = $2 AND CAST(departure_date AS date) = CAST($3 AS date)`,
        [s.cruiseLine, s.ship, s.sailDate]
      );
      const sailingId = sailingRes.rows[0]?.id;
      if (!sailingId) continue;

      // Insert pricing snapshots
      const cabinTypes = [
        { type: 'Inside', price: s.cabinPricing.inside },
        { type: 'Oceanview', price: s.cabinPricing.oceanview },
        { type: 'Balcony', price: s.cabinPricing.balcony },
        { type: 'Suite', price: s.cabinPricing.suite },
      ];

      for (const cabin of cabinTypes) {
        await pool.query(`
          INSERT INTO pricing_snapshots (
            sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd,
            captured_at, generated_by
          )
          VALUES ($1, $2, 2, $3::numeric, 0, 0, NOW(), 'jina-reader')
        `, [sailingId, cabin.type, cabin.price]);
      }

      console.log(`[DB] ✅ Upserted: ${s.ship} (${s.sailDate})`);
    } catch (err) {
      console.error(`[DB] ❌ Failed: ${s.ship} (${s.sailDate}):`, (err as Error).message);
    }
  }
}

/**
 * Main sync function.
 */
export async function runJinaSync(): Promise<number> {
  console.log('\n🚀 Starting Jina Reader Sync...\n');
  
  const reader = new JinaReader();
  const allSailings: ParsedSailing[] = [];
  
  // Scrape each URL
  for (const url of CRUISE_URLS.slice(0, 3)) { // Limit to 3 for testing
    console.log(`\n[1/${CRUISE_URLS.length}] Scraping: ${url}`);
    
    try {
      const result = await reader.scrape(url);
      console.log(`   → Extracted ${result.prices.length} prices, ${result.markdown.length} chars`);
      
      const sailings = parseJinaOutput(result.markdown, url);
      console.log(`   → Parsed ${sailings.length} sailings`);
      
      allSailings.push(...sailings);
      
      // Rate limit: 2 seconds between requests
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`   ❌ Failed: ${(err as Error).message}`);
    }
  }
  
  console.log(`\nTotal sailings parsed: ${allSailings.length}`);
  
  if (allSailings.length === 0) {
    console.log('No sailings to upsert. Exiting.');
    return 0;
  }
  
  console.log('\nUpserting to database...');
  await upsertSailings(allSailings);
  
  console.log('\n✅ Jina Reader Sync Complete\n');
  return allSailings.length;
}

// Run if called directly
if (require.main === module) {
  runJinaSync()
    .then(count => {
      console.log(`Synced ${count} sailings`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}