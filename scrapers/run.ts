import { CarnivalAdapter, PrincessAdapter, HollandAmericaAdapter, CunardAdapter, RCIGroupAdapter } from './carnival-corp';
import { SourceAdapter, SailingRecord } from './base';
import { decideDedup, makeFingerprint } from './dedup';

interface InsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function upsertToD1(sailings: SailingRecord[]): Promise<InsertResult> {
  const result: InsertResult = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const apiUrl = process.env.WORKER_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';

  for (const s of sailings) {
    // Check fingerprint via D1 direct — in CI this uses wrangler d1 execute
    const fp = makeFingerprint({
      cruiseLine: s.cruiseLine,
      sailDate: s.sailDate,
      ship: s.ship,
      departurePort: s.departurePort,
      nights: s.nights,
    });

    // For now, just POST to the Worker API which handles upsert
    try {
      const resp = await fetch(`${apiUrl}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, fingerprint: fp }),
      });
      if (resp.ok) {
        result.inserted++;
      } else {
        result.errors++;
      }
    } catch {
      result.errors++;
    }
  }
  return result;
}

async function main(): Promise<void> {
  console.log('[Scraper Run] Starting...');

  const adapters: SourceAdapter[] = [
    new CarnivalAdapter(),
    new PrincessAdapter(),
    new HollandAmericaAdapter(),
    new CunardAdapter(),
    new RCIGroupAdapter(),
  ];

  let totalInserted = 0;
  let totalErrors = 0;

  for (const adapter of adapters) {
    console.log(`[${adapter.name}] Fetching sailings...`);
    try {
      const sailings = await adapter.fetchSailings();
      console.log(`[${adapter.name}] Found ${sailings.length} sailings`);

      const result = await upsertToD1(sailings);
      totalInserted += result.inserted;
      totalErrors += result.errors;

      console.log(`[${adapter.name}] Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
    } catch (err) {
      console.error(`[${adapter.name}] Error: ${err}`);
      totalErrors++;
    }
  }

  console.log(`[Scraper Run] Complete. Total inserted: ${totalInserted}, Errors: ${totalErrors}`);
}

main().catch(console.error);
