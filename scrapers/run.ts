/**
 * TripTide — Real Scraper Runner
 * 
 * Uses real Jina Reader-based scrapers to fetch actual cruise data from
 * cruise line booking websites. No synthetic data.
 * 
 * Usage:
 *   npx tsx run.ts              # Run all real scrapers
 *   npx tsx run.ts --dry-run    # Test without saving to DB
 */

import { REAL_SCRAPERS, RealScraper } from './real-scrapers';
import { SailingRecord } from './base';

interface InsertResult {
  inserted: number;
  skipped: number;
  errors: number;
}

async function upsertToD1(sailings: SailingRecord[], dryRun: boolean): Promise<InsertResult> {
  const result: InsertResult = { inserted: 0, skipped: 0, errors: 0 };
  const apiUrl = process.env.WORKER_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';
  const secret = process.env.SCRAPER_SECRET;

  if (!secret) {
    console.error('[Scraper Run] SCRAPER_SECRET not found in env — aborting');
    result.errors = sailings.length;
    return result;
  }

  for (const s of sailings) {
    if (dryRun) {
      result.inserted++;
      continue;
    }

    try {
      const resp = await fetch(`${apiUrl}/api/deals`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${secret}` 
        },
        body: JSON.stringify(s),
      });

      if (resp.ok) {
        result.inserted++;
      } else {
        console.warn(`[Scraper Run] Upsert failed for ${s.ship} (${s.sailDate}): ${resp.status}`);
        result.errors++;
      }
    } catch (err) {
      console.error(`[Scraper Run] Error for ${s.ship}:`, (err as Error).message);
      result.errors++;
    }
  }

  return result;
}

async function main(): Promise<void> {
  console.log('[Real Scraper Run] Starting...');

  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('[Real Scraper Run] DRY RUN MODE — will not save to database');
  }

  let totalInserted = 0;
  let totalErrors = 0;

  for (const scraper of REAL_SCRAPERS) {
    console.log(`\n[${scraper.constructor.name}] Fetching sailings...`);
    try {
      const sailings = await scraper.fetchSailings();
      console.log(`[${scraper.constructor.name}] Found ${sailings.length} sailings`);

      const result = await upsertToD1(sailings, dryRun);
      totalInserted += result.inserted;
      totalErrors += result.errors;

      console.log(`[${scraper.constructor.name}] Inserted: ${result.inserted}, Errors: ${result.errors}`);
    } catch (err) {
      console.error(`[${scraper.constructor.name}] Error:`, (err as Error).message);
      totalErrors++;
    }
  }

  console.log(`\n[Real Scraper Run] Complete. Total inserted: ${totalInserted}, Errors: ${totalErrors}`);
}

main().catch(console.error);
