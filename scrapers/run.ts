import { CarnivalCruiseLineAdapter, PrincessCruiseLineAdapter, HollandAmericaLineAdapter } from './adapters-fetch';
import { RCIGroupAdapter } from './royal-caribbean';
import { SourceAdapter, SailingRecord } from './base';
import { makeFingerprint } from './dedup';

interface InsertResult {
 inserted: number;
 updated: number;
 skipped: number;
 errors: number;
}

async function upsertToD1(sailings: SailingRecord[], dryRun: boolean): Promise<InsertResult> {
 const result: InsertResult = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
 const apiUrl = process.env.WORKER_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';

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
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SCRAPER_SECRET}` },
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

 const useRealAdapters = process.env.USE_REAL_ADAPTERS === '1';
 const adapters: SourceAdapter[] = useRealAdapters
  ? [
     new CarnivalCruiseLineAdapter(),
     new PrincessCruiseLineAdapter(),
     new HollandAmericaLineAdapter(),
     new RCIGroupAdapter(),
    ]
  : [];

 const adaptersToRun = adapters.length > 0 ? adapters : [new CarnivalCruiseLineAdapter(), new PrincessCruiseLineAdapter(), new HollandAmericaLineAdapter(), new RCIGroupAdapter()];

 console.log(`[Scraper Run] Mode: REAL fetch/cheerio adapters`);

 let totalInserted = 0;
 let totalErrors = 0;

 for (const adapter of adaptersToRun) {
  console.log(`[${adapter.name}] Fetching sailings...`);
  try {
   const sailings = await adapter.fetchSailings();
   console.log(`[${adapter.name}] Found ${sailings.length} sailings`);

   const result = await upsertToD1(sailings, false);
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
