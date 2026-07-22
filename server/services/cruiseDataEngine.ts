/**
 * TripTide — Cruise Data Engine (Orchestrator)
 * 
 * Main entry point for scraping multiple cruise lines.
 * Uses cruiseLineConfig.ts for URL lists and jinaReader/jinaParser for scraping.
 * 
 * Features:
 * - Modular architecture (easy to add new cruise lines)
 * - Configurable rate limiting
 * - Error handling and logging
 * - Database upsert with idempotent writes
 */

import { JinaReader } from './jinaReader';
import { parseJinaMarkdown, type ParsedCruise } from './jinaParser';
import { getAllScrapeUrls, type CruiseLineConfig } from './cruiseLineConfig';

export interface ScrapeResult {
  cruiseLine: string;
  ship: string;
  sailDate: string;
  duration: number;
  departurePort: string;
  destination: string;
  cabinPricing: {
    inside: number;
    oceanview: number;
    balcony: number;
    suite: number;
  };
  sourceUrl: string;
  success: boolean;
  error?: string;
}

export interface SyncOptions {
  maxUrls?: number;
  delayMs?: number;
  dryRun?: boolean;
}

/**
 * Scrape all configured cruise lines and return structured data.
 */
export async function runCruiseDataSync(options: SyncOptions = {}): Promise<ScrapeResult[]> {
  const { maxUrls = 50, delayMs = 1000, dryRun = false } = options;
  
  console.log('\n🚀 Starting Cruise Data Sync...\n');
  console.log(`   Max URLs: ${maxUrls}`);
  console.log(`   Delay: ${delayMs}ms`);
  console.log(`   Dry Run: ${dryRun ? 'YES' : 'NO'}\n`);
  
  const reader = new JinaReader();
  const allUrls = getAllScrapeUrls().slice(0, maxUrls);
  
  console.log(`📋 Scraping ${allUrls.length} URL(s)...\n`);
  
  const results: ScrapeResult[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i];
    const cruiseLineConfig = getCruiseLineConfigFromUrl(url);
    
    console.log(`[${i + 1}/${allUrls.length}] ${cruiseLineConfig?.name || 'Unknown'}: ${url}`);
    
    try {
      if (dryRun) {
        console.log(`   → [DRY RUN] Skipping actual scrape`);
        results.push({
          cruiseLine: cruiseLineConfig?.name || 'Unknown',
          ship: 'TBD',
          sailDate: new Date().toISOString().split('T')[0],
          duration: 7,
          departurePort: 'Miami, FL',
          destination: 'Caribbean',
          cabinPricing: { inside: 800, oceanview: 1000, balcony: 1500, suite: 2500 },
          sourceUrl: url,
          success: true,
        });
        successCount++;
      } else {
        const scrapeResult = await reader.scrape(url);
        
        if (!scrapeResult.markdown || scrapeResult.markdown.length < 100) {
          console.log(`   → ⚠️ Empty or too short markdown, skipping`);
          failCount++;
          continue;
        }
        
        const parseResult = parseJinaMarkdown(scrapeResult.markdown, url);
        
        if (parseResult.success && parseResult.cruises.length > 0) {
          console.log(`   → ✅ Parsed ${parseResult.cruises.length} sailing(s)`);
          
          for (const cruise of parseResult.cruises) {
            results.push({
              cruiseLine: cruise.cruiseLine,
              ship: cruise.ship,
              sailDate: cruise.sailDate,
              duration: cruise.duration,
              departurePort: cruise.departurePort,
              destination: cruise.destination,
              cabinPricing: cruise.cabinPricing,
              sourceUrl: url,
              success: true,
            });
            successCount++;
          }
        } else {
          console.log(`   → ⚠️ No cruises parsed: ${parseResult.errors.join(', ')}`);
          failCount++;
        }
      }
      
      // Rate limiting
      if (i < allUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err: any) {
      console.error(`   → ❌ Failed: ${err.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Sync Complete:`);
  console.log(`   Total URLs: ${allUrls.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total Sailings: ${results.length}\n`);
  
  return results;
}

/**
 * Get cruise line config from URL.
 */
function getCruiseLineConfigFromUrl(url: string): CruiseLineConfig | undefined {
  const configs = getAllScrapeUrls().map(url => ({ url, config: undefined as any }));
  
  if (url.includes('royalcaribbean.com')) return { name: 'Royal Caribbean', slug: 'royalcaribbean', baseUrl: '', shipUrls: [], parserType: 'default', enabled: true };
  if (url.includes('carnival.com')) return { name: 'Carnival', slug: 'carnival', baseUrl: '', shipUrls: [], parserType: 'carnival', enabled: true };
  if (url.includes('ncl.com')) return { name: 'Norwegian', slug: 'ncl', baseUrl: '', shipUrls: [], parserType: 'ncl', enabled: true };
  if (url.includes('msccruises.com')) return { name: 'MSC Cruises', slug: 'msc', baseUrl: '', shipUrls: [], parserType: 'msc', enabled: true };
  if (url.includes('celebrity.com')) return { name: 'Celebrity', slug: 'celebrity', baseUrl: '', shipUrls: [], parserType: 'celebrity', enabled: true };
  if (url.includes('princess.com')) return { name: 'Princess', slug: 'princess', baseUrl: '', shipUrls: [], parserType: 'default', enabled: true };
  if (url.includes('disney.com')) return { name: 'Disney', slug: 'disney', baseUrl: '', shipUrls: [], parserType: 'default', enabled: true };
  if (url.includes('viking.com')) return { name: 'Viking', slug: 'viking', baseUrl: '', shipUrls: [], parserType: 'default', enabled: true };
  
  return undefined;
}

/**
 * Upsert scraped sailings to database.
 */
export async function upsertScrapedSailings(sailings: ScrapeResult[]): Promise<number> {
  if (sailings.length === 0) {
    console.log('No sailings to upsert.');
    return 0;
  }
  
  const { getPool } = await import('../db/pool');
  const pool = getPool();
  
  let upsertCount = 0;
  
  for (const sailing of sailings) {
    try {
      // Upsert sailing (use empty array for null itinerary)
      const itinerary = sailing.destination ? [sailing.destination] : ['TBA'];
      const sailingResult = await pool.query(`
        INSERT INTO sailings (
          cruise_line, ship_name, departure_date, duration_days,
          departure_port, destination_region, itinerary, sync_source, scraped_at
        ) VALUES ($1, $2, $3::date, $4, $5, $6, $7::text[], 'cruise-data-engine', NOW())
        ON CONFLICT (cruise_line, ship_name, CAST(departure_date AS date))
        DO UPDATE SET
          duration_days = EXCLUDED.duration_days,
          departure_port = EXCLUDED.departure_port,
          destination_region = EXCLUDED.destination_region,
          itinerary = EXCLUDED.itinerary,
          sync_source = EXCLUDED.sync_source,
          scraped_at = NOW()
        RETURNING id
      `, [
        sailing.cruiseLine,
        sailing.ship,
        sailing.sailDate,
        sailing.duration,
        sailing.departurePort,
        sailing.destination,
        itinerary,
      ]);
      
      const sailingId = sailingResult.rows[0]?.id;
      if (!sailingId) {
        console.warn(`⚠️ Could not get sailing ID for ${sailing.ship} on ${sailing.sailDate}`);
        continue;
      }
      
      // Insert pricing snapshots for all cabin types
      const cabinTypes = [
        { type: 'Inside' as const, price: sailing.cabinPricing.inside },
        { type: 'Oceanview' as const, price: sailing.cabinPricing.oceanview },
        { type: 'Balcony' as const, price: sailing.cabinPricing.balcony },
        { type: 'Suite' as const, price: sailing.cabinPricing.suite },
      ];
      
      for (const cabin of cabinTypes) {
        await pool.query(`
          INSERT INTO pricing_snapshots (
            sailing_id, cabin_type, passenger_count, base_fare_usd, port_fees_usd, gratuities_usd,
            captured_at, captured_by
          ) VALUES ($1, $2, 2, $3::numeric, 0, 0, NOW(), 'cruise-data-engine')
          ON CONFLICT DO NOTHING
        `, [sailingId, cabin.type, cabin.price]);
      }
      
      upsertCount++;
      console.log(`   ✅ Upserted: ${sailing.ship} (${sailing.sailDate}) - $${sailing.cabinPricing.inside}+`);
    } catch (err: any) {
      console.error(`   ❌ Failed to upsert ${sailing.ship}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Upsert Complete: ${upsertCount} sailings updated\n`);
  return upsertCount;
}

// Run if called directly
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  
  runCruiseDataSync({ dryRun, maxUrls: 20, delayMs: 1500 })
    .then(sailings => {
      if (!dryRun) {
        return upsertScrapedSailings(sailings);
      }
      console.log(`\n[Dry Run] Would upsert ${sailings.length} sailings`);
      return 0;
    })
    .then(count => {
      console.log(`Synced ${count} sailings`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}
