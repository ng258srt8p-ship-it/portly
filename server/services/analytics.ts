/**
 * TripTide — AI-Powered Analytics (via OpenCode)
 *
 * Uses OpenCode (mimo-v2.5-free) to generate AI-powered market summaries,
 * deal analyses, and price forecasts from the sailings + pricing data.
 */

import { getPool } from '../db/pool';
import { callOpenCode } from '../utils/openCodeClient';
import { sanitizeDealContent } from '../utils/contentFormatter';

// ─── generateMarketSummary ──────────────────────────────────────────────────

export async function generateMarketSummary(forceRefresh = false): Promise<string> {
  const pool = getPool();

  const statsResult = await pool.query(`
    SELECT
      COUNT(DISTINCT s.id) AS total_sailings,
      COUNT(DISTINCT s.cruise_line) AS total_lines,
      COUNT(DISTINCT s.destination_region) AS total_destinations,
      ROUND(AVG(ps.total_out_the_door_usd)::numeric, 2) AS avg_price,
      ROUND(MIN(ps.total_out_the_door_usd)::numeric, 2) AS min_price,
      ROUND(MAX(ps.total_out_the_door_usd)::numeric, 2) AS max_price,
      ROUND(AVG(s.duration_days)::numeric, 1) AS avg_duration
    FROM sailings s
    INNER JOIN pricing_snapshots ps ON ps.sailing_id = s.id
    WHERE s.sync_status = 'active'
  `);

  const stats = statsResult.rows[0];

  const destResult = await pool.query(`
    SELECT
      s.destination_region,
      COUNT(*) AS sailing_count,
      ROUND(AVG(ps.total_out_the_door_usd)::numeric, 2) AS avg_price
    FROM sailings s
    INNER JOIN pricing_snapshots ps ON ps.sailing_id = s.id
    WHERE s.sync_status = 'active' AND s.destination_region IS NOT NULL
    GROUP BY s.destination_region
    ORDER BY sailing_count DESC
    LIMIT 8
  `);

  const destBreakdown = destResult.rows
    .map((r: any) => `  - ${r.destination_region}: ${r.sailing_count} sailings, avg $${r.avg_price}`)
    .join('\n');

  const lineResult = await pool.query(`
    SELECT
      s.cruise_line,
      COUNT(*) AS sailing_count,
      ROUND(AVG(ps.total_out_the_door_usd)::numeric, 2) AS avg_price
    FROM sailings s
    INNER JOIN pricing_snapshots ps ON ps.sailing_id = s.id
    WHERE s.sync_status = 'active'
    GROUP BY s.cruise_line
    ORDER BY sailing_count DESC
    LIMIT 8
  `);

  const lineBreakdown = lineResult.rows
    .map((r: any) => `  - ${r.cruise_line}: ${r.sailing_count} sailings, avg $${r.avg_price}`)
    .join('\n');

  const trendResult = await pool.query(`
    WITH recent AS (
      SELECT ps.sailing_id, ps.total_out_the_door_usd, ps.captured_at,
             ROW_NUMBER() OVER (PARTITION BY ps.sailing_id, ps.cabin_type ORDER BY ps.captured_at DESC) AS rn
      FROM pricing_snapshots ps
      INNER JOIN sailings s ON s.id = ps.sailing_id
      WHERE s.sync_status = 'active'
    ),
    price_pairs AS (
      SELECT r1.sailing_id, r1.total_out_the_door_usd AS latest_price, r2.total_out_the_door_usd AS prev_price
      FROM recent r1
      INNER JOIN recent r2 ON r1.sailing_id = r2.sailing_id AND r1.rn = 1 AND r2.rn = 2
    )
    SELECT
      COUNT(*) AS tracked,
      SUM(CASE WHEN latest_price < prev_price THEN 1 ELSE 0 END) AS price_drops,
      SUM(CASE WHEN latest_price > prev_price THEN 1 ELSE 0 END) AS price_rises,
      ROUND(AVG((prev_price - latest_price) / NULLIF(prev_price, 0) * 100)::numeric, 1) AS avg_change_pct
    FROM price_pairs
  `);

  const trends = trendResult.rows[0];

  const systemPrompt = `You are TripTide's cruise market analyst. Write a concise, data-driven market summary for cruise travelers. Use the stats provided to give actionable insights. Format as markdown with headers. Keep it under 400 words. Be direct and specific with numbers.`;

  const userPrompt = `Here is the current cruise market data:

OVERVIEW:
- Total active sailings: ${stats.total_sailings}
- Cruise lines: ${stats.total_lines}
- Destinations: ${stats.total_destinations}
- Average price (out-the-door): $${stats.avg_price}
- Price range: $${stats.min_price} – $${stats.max_price}
- Average duration: ${stats.avg_duration} nights

DESTINATIONS (by volume):
${destBreakdown || '  No data'}

CRUISE LINES (by volume):
${lineBreakdown || '  No data'}

RECENT PRICE MOVEMENT:
- Sailings with multiple price snapshots: ${trends.tracked}
- Price drops: ${trends.price_drops}
- Price rises: ${trends.price_rises}
- Average price change: ${trends.avg_change_pct}%

Generate a market summary report that a cruise shopper would find valuable. Include: overall market conditions, best-value destinations, pricing trends, and any notable deals.`;

  const result = await callOpenCode(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { max_tokens: 2048, temperature: 0.4 }
  );

  return result;
}

// ─── analyzeSailingDeal ─────────────────────────────────────────────────────

export async function analyzeSailingDeal(
  sailingId: string,
  forceRefresh = false
): Promise<string> {
  const pool = getPool();
  const id = parseInt(sailingId, 10);
  if (isNaN(id)) throw new Error(`Invalid sailing ID: ${sailingId}`);

  if (!forceRefresh) {
    const cached = await pool.query(
      'SELECT deal_analysis FROM sailings WHERE id = $1 AND deal_analysis IS NOT NULL',
      [id]
    );
    if (cached.rows.length > 0 && cached.rows[0].deal_analysis) {
      return cached.rows[0].deal_analysis;
    }
  }

  const sailingResult = await pool.query(
    `SELECT id, cruise_line, ship_name, duration_days, departure_port,
            departure_region, itinerary, destination_region, departure_date,
            cabin_categories, booking_url
     FROM sailings WHERE id = $1`,
    [id]
  );

  if (sailingResult.rows.length === 0) {
    throw new Error(`Sailing ${id} not found`);
  }

  const s = sailingResult.rows[0];

  const pricingResult = await pool.query(
    `SELECT cabin_type, passenger_count, base_fare_usd, port_fees_usd,
            gratuities_usd, total_out_the_door_usd, captured_at
     FROM pricing_snapshots
     WHERE sailing_id = $1
     ORDER BY captured_at DESC
     LIMIT 20`,
    [id]
  );

  const prices = pricingResult.rows;

  const cabinPrices = prices
    .filter((p: any) => p.passenger_count === 2)
    .reduce((acc: any, p: any) => {
      if (!acc[p.cabin_type] || new Date(p.captured_at) > new Date(acc[p.cabin_type].captured_at)) {
        acc[p.cabin_type] = p;
      }
      return acc;
    }, {});

  const pricingLines = Object.entries(cabinPrices)
    .map(([type, p]: [string, any]) => {
      const perPerson = (parseFloat(p.total_out_the_door_usd) / 2).toFixed(0);
      const ppd = (parseFloat(p.total_out_the_door_usd) / 2 / s.duration_days).toFixed(2);
      return `  - ${type}: $${p.total_out_the_door_usd} total ($${perPerson}/person, $${ppd}/person/day)`;
    })
    .join('\n');

  const historyResult = await pool.query(
    `SELECT total_out_the_door_usd, captured_at
     FROM pricing_snapshots
     WHERE sailing_id = $1 AND cabin_type = 'Inside' AND passenger_count = 2
     ORDER BY captured_at ASC`,
    [id]
  );

  const history = historyResult.rows;
  let trendDescription = 'No pricing history available';
  if (history.length >= 2) {
    const first = parseFloat(history[0].total_out_the_door_usd);
    const latest = parseFloat(history[history.length - 1].total_out_the_door_usd);
    const changePercent = ((latest - first) / first * 100).toFixed(1);
    const direction = latest < first ? 'DOWN' : latest > first ? 'UP' : 'STABLE';
    trendDescription = `${direction} ${Math.abs(parseFloat(changePercent))}% over ${history.length} snapshots ($${first} → $${latest})`;
  }

  const systemPrompt = `You are TripTide's deal analyst. Evaluate a cruise deal with specific data. Give it a deal score out of 100 and explain why. Be specific, use the numbers provided, and give actionable advice. Format as markdown. Keep it under 300 words.`;

  const userPrompt = `Analyze this cruise deal:

SAILING:
- Cruise Line: ${s.cruise_line}
- Ship: ${s.ship_name}
- Duration: ${s.duration_days} nights
- Route: ${Array.isArray(s.itinerary) ? s.itinerary.join(' → ') : s.itinerary}
- Destination: ${s.destination_region || 'N/A'}
- Departure: ${s.departure_port} on ${s.departure_date}
- Cabin Categories: ${Array.isArray(s.cabin_categories) ? s.cabin_categories.join(', ') : s.cabin_categories || 'N/A'}

CURRENT PRICING (2 passengers):
${pricingLines || '  No current pricing'}

PRICE TREND:
${trendDescription}

Booking URL: ${s.booking_url || 'N/A'}

Provide: deal score (0-100), pricing analysis, value assessment, and booking recommendation.`;

  const result = await callOpenCode(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { max_tokens: 1500, temperature: 0.3 }
  );

  return result;
}

// ─── generatePriceForecast ──────────────────────────────────────────────────

export async function generatePriceForecast(
  sailingId: string,
  forceRefresh = false
): Promise<string> {
  const pool = getPool();
  const id = parseInt(sailingId, 10);
  if (isNaN(id)) throw new Error(`Invalid sailing ID: ${sailingId}`);

  const sailingResult = await pool.query(
    `SELECT id, cruise_line, ship_name, duration_days, departure_port,
            destination_region, departure_date
     FROM sailings WHERE id = $1`,
    [id]
  );

  if (sailingResult.rows.length === 0) {
    throw new Error(`Sailing ${id} not found`);
  }

  const s = sailingResult.rows[0];

  const historyResult = await pool.query(
    `SELECT cabin_type, passenger_count, total_out_the_door_usd, base_fare_usd,
            captured_at
     FROM pricing_snapshots
     WHERE sailing_id = $1
     ORDER BY cabin_type, captured_at ASC`,
    [id]
  );

  const allPrices = historyResult.rows;

  const byCabin: Record<string, any[]> = {};
  for (const p of allPrices) {
    const key = p.cabin_type;
    if (!byCabin[key]) byCabin[key] = [];
    byCabin[key].push(p);
  }

  const cabinSummaries = Object.entries(byCabin)
    .map(([cabin, snaps]) => {
      const doubles = snaps.filter((s: any) => s.passenger_count === 2);
      if (doubles.length === 0) return `  ${cabin}: No double-occupancy data`;
      const prices = doubles.map((s: any) => parseFloat(s.total_out_the_door_usd));
      const dates = doubles.map((s: any) => s.captured_at);
      const first = prices[0];
      const latest = prices[prices.length - 1];
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = (prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(0);
      const change = ((latest - first) / first * 100).toFixed(1);
      const pricePoints = prices.map((p: number, i: number) => {
        const dateStr = String(dates[i]);
        const shortDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.substring(0, 10);
        return `$${p}(${shortDate})`;
      }).join(' → ');
      return `  ${cabin}: $${first} → $${latest} (${change}%), range $${min}–$${max}, avg $${avg}, ${doubles.length} snapshots: ${pricePoints}`;
    })
    .join('\n');

  const daysUntil = Math.ceil(
    (new Date(s.departure_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const systemPrompt = `You are TripTide's price forecasting analyst. Based on historical pricing data, predict where prices are headed for this cruise. Consider the time until departure, price volatility, and historical patterns. Format as markdown. Be specific with numbers and timeframes. Keep it under 250 words.`;

  const userPrompt = `Forecast the price trajectory for this cruise:

SAILING:
- Cruise Line: ${s.cruise_line}
- Ship: ${s.ship_name}
- Duration: ${s.duration_days} nights
- Destination: ${s.destination_region || 'N/A'}
- Departure: ${s.departure_date} (${daysUntil} days from now)

PRICING HISTORY BY CABIN:
${cabinSummaries}

Based on this data, provide:
1. Current price assessment (below/above/at market)
2. Short-term forecast (next 1-2 weeks)
3. Medium-term forecast (next month)
4. Buy/wait recommendation with confidence level`;

  const result = await callOpenCode(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { max_tokens: 1200, temperature: 0.3 }
  );

  return sanitizeDealContent(result);
}

// ─── analyzeAllSailings ─────────────────────────────────────────────────────

export async function analyzeAllSailings(closePool = false): Promise<string> {
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT DISTINCT s.id
       FROM sailings s
       INNER JOIN pricing_snapshots ps ON ps.sailing_id = s.id
       WHERE s.deal_analysis IS NULL
       ORDER BY s.id`
    );
    const ids = result.rows.map((r: any) => r.id) as number[];
    const total = ids.length;
    const startTime = Date.now();

    if (total === 0) {
      return 'All sailings already have deal analysis.';
    }

    console.log(`[ANALYSIS] Batch-generating analysis for ${total} sailings...`);

    const CHUNK_SIZE = 10;
    let generated = 0;
    let failed = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const chunkPromises = chunk.map(async (sid: number) => {
        try {
          const analysis = sanitizeDealContent(await analyzeSailingDeal(String(sid), true));
          if (analysis && analysis.length > 0) {
            await pool.query(
              `UPDATE sailings SET deal_analysis = $1, deal_analysis_generated_at = NOW() WHERE id = $2`,
              [analysis, sid]
            );
            return true;
          }
          return false;
        } catch (err: any) {
          console.error(`[ANALYSIS] Failed for sailing ${sid}: ${err.message}`);
          return false;
        }
      });

      const results = await Promise.all(chunkPromises);
      generated += results.filter(Boolean).length;
      failed += results.filter((r) => !r).length;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(
        `[ANALYSIS] Chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(total / CHUNK_SIZE)}: ${generated} generated, ${failed} failed (${elapsed}s)`
      );
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const msg = `${generated} analyses generated, ${failed} failed (${total} total, ${totalElapsed}s).`;
    console.log(`[ANALYSIS] Complete: ${msg}`);
    return msg;
  } catch (err: any) {
    console.error(`[ANALYSIS] Error in batch analysis: ${err.message}`);
    throw err;
  } finally {
    if (closePool) await pool.end();
  }
}
