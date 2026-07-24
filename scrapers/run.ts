import { CarnivalAdapter, PrincessAdapter, HollandAmericaAdapter, CunardAdapter } from './carnival-corp'; // restored: compiled gold path from prior pass
import { RCIGroupAdapter } from './royal-caribbean';
import { SourceAdapter, SailingRecord } from './base';
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

 const completeRunDefault = true; // new defaults-first behavior: never silently skip source categories
 console.log(`[Scraper Run] Adapter mode: COMPLETE (legacy stubs + RC)`);

 const adaptersToRun = [
  new CarnivalAdapter(),
  new PrincessAdapter(),
  new HollandAmericaAdapter(),
  new CunardAdapter(),
  new RCIGroupAdapter(),
 ];

 let totalInserted = 0;
 let totalErrors = 0;

 for (const adapter of adaptersToRun) {
  console.log(`[${adapter.name}] Fetching sailings...`);
  try {
   await adapter.initialize();
   const sailings = await adapter.fetchSailings();
   console.log(`[${adapter.name}] Found ${sailings.length} sailings`);

   const result = await upsertToD1(sailings, false);
   totalInserted += result.inserted;
   totalErrors += result.errors;

   console.log(`[${adapter.name}] Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
  } catch (err) {
   console.error(`[${adapter.name}] Error:`, err);
   totalErrors++;
  } finally {
   await adapter.destroy();
  }
 }

 console.log(`[Scraper Run] Complete. Total inserted: ${totalInserted}, Errors: ${totalErrors}`);
}

main().catch(console.error);
