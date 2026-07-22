/**
 * Phase 2 — Batch Regenerate Degraded Deal Analysis Content
 * 
 * Identifies sailings with score=50 (placeholder) deal_analysis and regenerates
 * using OpenCode AI with improved prompts. Respects rate limiting (2.5s spacing)
 * and logs progress. 
 * 
 * Usage:
 *   npx tsx scripts/regenerate-deal-analysis.ts          # default 10 at a time
 *   npx tsx scripts/regenerate-deal-analysis.ts 50      # up to 50
 */

// Load .env before anything else
import 'dotenv/config';

import { Pool, PoolConfig } from 'pg';
import { generateEnhancedDealAnalysis, SailingContext } from '../server/services/enhancedAnalytics';
import { sanitizeDealAnalysisObject } from '../server/utils/contentFormatter';

// Use same pool config as the rest of the project
const POOL_CONFIG: PoolConfig = {
  host: process.env.DB_HOST || '/tmp',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'triptide',
  user: process.env.DB_USER || process.env.USER || 'georgetozer',
  password: process.env.DB_PASSWORD || undefined,
};

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool(POOL_CONFIG);
  return pool;
}

interface SailingRow {
  id: number;
  cruise_line: string;
  ship_name: string;
  duration_days: number;
  departure_port: string;
  destination_region: string;
  departure_date: string;
  itinerary: unknown;
}

/**
 * Fetch sailings with degraded (placeholder) deal analysis.
 */
async function getDegradedSailings(limit: number = 100): Promise<SailingRow[]> {
  const p = getPool();
  const result = await p.query(
    `SELECT id, cruise_line, ship_name, duration_days, departure_port, 
            destination_region, departure_date, itinerary
     FROM sailings 
     WHERE sync_status = 'active' 
       AND deal_analysis IS NOT NULL 
       AND length(deal_analysis) > 30 
       AND deal_analysis ~ '^\s*\{'
       AND deal_analysis::json->>'dealScore' = '50'
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Fetch pricing snapshots for a sailing (latest per cabin type).
 */
async function getPricing(sailingId: number): Promise<Record<string, number>> {
  const p = getPool();
  const result = await p.query(
    `SELECT cabin_type, total_out_the_door_usd
     FROM pricing_snapshots
     WHERE sailing_id = $1
     ORDER BY captured_at DESC`,
    [sailingId]
  );

  const pricing: Record<string, number> = {};
  for (const row of result.rows) {
    if (!(row.cabin_type in pricing)) {
      pricing[row.cabin_type] = parseFloat(row.total_out_the_door_usd);
    }
  }
  return pricing;
}

/**
 * Fetch pricing history for a sailing (Inside cabin, last 20 snapshots).
 */
async function getPricingHistory(sailingId: number): Promise<Array<{ cabinType: string; price: number; date: string }>> {
  const p = getPool();
  const result = await p.query(
    `SELECT cabin_type, total_out_the_door_usd, captured_at
     FROM pricing_snapshots
     WHERE sailing_id = $1 AND cabin_type = 'Inside'
     ORDER BY captured_at ASC LIMIT 20`,
    [sailingId]
  );

  return result.rows.map((r: any) => ({
    cabinType: r.cabin_type,
    price: parseFloat(r.total_out_the_door_usd),
    date: r.captured_at,
  }));
}

async function main() {
  const limit = parseInt(process.argv[2] || '10', 10);
  console.log(`[Phase 2] Starting batch regeneration for up to ${limit} degraded sailings...`);

  const degraded = await getDegradedSailings(limit);
  console.log(`[Phase 2] Found ${degraded.length} degraded sailings to process`);

  if (degraded.length === 0) {
    console.log('[Phase 2] Nothing to do — all sailings are healthy!');
    const p = getPool();
    await p.end();
    return;
  }

  let success = 0;
  let failure = 0;

  for (const sailing of degraded) {
    try {
      const currentPricing = await getPricing(sailing.id);
      const priceHistory = await getPricingHistory(sailing.id);

      const context: SailingContext = {
        sailingId: sailing.id,
        cruiseLine: sailing.cruise_line || 'Unknown',
        shipName: sailing.ship_name || 'Unknown Ship',
        durationDays: sailing.duration_days || 7,
        departurePort: sailing.departure_port || 'Unknown',
        destinationRegion: sailing.destination_region || 'Unknown Region',
        departureDate: sailing.departure_date,
        itinerary: Array.isArray(sailing.itinerary) ? (sailing.itinerary as string[]) : [],
        currentPricing,
        priceHistory,
      };

      const result = await generateEnhancedDealAnalysis(context, true);

      // Sanitize before storing
      const sanitized = sanitizeDealAnalysisObject(
        result as unknown as Record<string, unknown>
      ) as unknown as typeof result;

      const p = getPool();
      await p.query(
        'UPDATE sailings SET deal_analysis = $1, deal_analysis_generated_at = NOW() WHERE id = $2',
        [JSON.stringify(sanitized), sailing.id]
      );

      success++;
      console.log(`[Phase 2] Regenerated sailing ${sailing.id}: score=${sanitized.dealScore} (${sanitized.cabinValueBreakdown ? 'with cabin breakdown' : 'no cabin breakdown'})`);
    } catch (err: any) {
      failure++;
      console.error(`[Phase 2] Failed sailing ${sailing.id}: ${err.message}`);
    }

    // Rate limit: 2.5 seconds between requests (matches OpenCode API spacing)
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log(`[Phase 2] Done. Success: ${success}, Failure: ${failure}`);

  // Verify results
  const p = getPool();
  const result = await p.query(
    `SELECT COUNT(*) AS remaining FROM sailings 
     WHERE sync_status = 'active' 
       AND deal_analysis IS NOT NULL 
       AND length(deal_analysis) > 30 
       AND deal_analysis ~ '^\s*\{'
       AND deal_analysis::json->>'dealScore' = '50'`
  );
  console.log(`[Phase 2] Remaining degraded: ${result.rows[0].remaining}`);

  await p.end();
}

main().catch(err => {
  console.error('[Phase 2] Fatal error:', err);
  const p = getPool();
  p.end().catch(() => {});
  process.exit(1);
});
