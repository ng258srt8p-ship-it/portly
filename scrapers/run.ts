import { CarnivalAdapter, PrincessAdapter, HollandAmericaAdapter, CunardAdapter, RoyalCaribbeanAdapter } from './carnival-corp';
import { NorwegianAdapter, MSCAdapter, DisneyAdapter, CelebrityAdapter } from './additional-lines';
import { SourceAdapter, SailingRecord, SailingDetail } from './base';
import { makeFingerprint } from './dedup';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

interface InsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function upsertToD1(sailings: SailingRecord[], dryRun: boolean): Promise<InsertResult> {
  const result: InsertResult = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const apiUrl = process.env.WORKER_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';
  const secret = process.env.SCRAPER_SECRET;

  if (!secret) {
    console.error('[Scraper Run] SCRAPER_SECRET not found in env — aborting');
    result.errors = sailings.length;
    return result;
  }

  for (const s of sailings) {
    const fp = makeFingerprint({
      cruiseLine: s.cruiseLine,
      sailDate: s.sailDate,
      ship: s.ship,
      departurePort: s.departurePort,
      nights: s.nights,
    });

    if (dryRun) {
      result.inserted++;
      continue;
    }

    try {
      const resp = await fetch(`${apiUrl}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
        body: JSON.stringify({ ...s, fingerprint: fp }),
      });
      if (resp.ok) {
        const data = await resp.json();
        result.inserted++;

        // Seed cabin prices + price history if adapter supports fetchSailingDetail
        if (data.action === 'inserted') {
          try {
            const adapter = adaptersMap.get(s.id);
            if (adapter) {
              const detail = await adapter.fetchSailingDetail(s.id);
              if (detail?.cabins?.length) {
                const detailResp = await fetch(`${apiUrl}/api/sailing/${encodeURIComponent(s.id)}/details`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
                  body: JSON.stringify({
                    cabins: detail.cabins.map(c => ({
                      cabinClass: c.cabinClass,
                      baseFare: c.baseFarePerPerson,
                      portTax: c.portTaxPerPerson,
                      gratuityPerNight: c.gratuityPerPersonPerNight,
                    })),
                    priceHistory: detail.priceHistory?.map(p => ({ price: p.price, date: p.date, cabinClass: p.cabinClass })),
                  }),
                });
                if (!detailResp.ok) {
                  console.warn(`[Scraper Run] Cabin detail seed failed for ${s.id}: ${detailResp.status}`);
                }
              }
            }
          } catch (e) {
            console.warn(`[Scraper Run] Cabin detail seed error for ${s.id}:`, e);
          }
        }
      } else {
        result.errors++;
        console.warn(`[Scraper Run] Upsert failed for ${s.id}: ${resp.status}`);
      }
    } catch {
      result.errors++;
    }
  }
  return result;
}

// Map sailing IDs to their adapters for detail fetching
const adaptersMap = new Map<string, SourceAdapter>();

async function main(): Promise<void> {
  console.log('[Scraper Run] Starting...');

  const clear = process.argv.includes('--clear');
  const dryRun = process.argv.includes('--dry-run');

  if (clear && !dryRun) {
    console.log('[Scraper Run] --clear flag detected, but D1 clear is handled remotely');
  }

  const adapters: SourceAdapter[] = [
    new CarnivalAdapter(),
    new PrincessAdapter(),
    new HollandAmericaAdapter(),
    new CunardAdapter(),
    new RoyalCaribbeanAdapter(),
    new NorwegianAdapter(),
    new MSCAdapter(),
    new DisneyAdapter(),
    new CelebrityAdapter(),
  ];

  let totalInserted = 0;
  let totalErrors = 0;

  for (const adapter of adapters) {
    console.log(`[${adapter.name}] Fetching sailings...`);
    try {
      // Stub adapters don't need browser — skip initialize/destroy
      const sailings = await adapter.fetchSailings();
      console.log(`[${adapter.name}] Found ${sailings.length} sailings`);

      // Register adapter for detail fetching
      for (const s of sailings) {
        adaptersMap.set(s.id, adapter);
      }

      const result = await upsertToD1(sailings, dryRun);
      totalInserted += result.inserted;
      totalErrors += result.errors;

      console.log(`[${adapter.name}] Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
    } catch (err) {
      console.error(`[${adapter.name}] Error:`, err);
      totalErrors++;
    }
  }

  console.log(`[Scraper Run] Complete. Total inserted: ${totalInserted}, Errors: ${totalErrors}`);
}

main().catch(console.error);
