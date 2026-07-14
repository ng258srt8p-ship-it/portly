/**
 * TripTide — Optimized Analytics (via OpenCode)
 *
 * Optimized deal analysis with:
 * - Strict JSON output format (no markdown parsing)
 * - Reduced token usage (1024 max vs 1500)
 * - Cache-aware (works with hybridEngineOptimized cache layer)
 * - Deterministic heuristic fallbacks when AI rate-limited
 */

import { getPool } from '../db/pool';
import { callOpenCode } from '../utils/openCodeClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface HeuristicDealAnalysis {
  dealScore: number;
  pricingDeepDive: string;
  priceTrend: 'rising' | 'falling' | 'stable';
  shipExperience: string;
  insiderTips: string[];
  verdict: string;
  is_heuristic: true;
}

interface HeuristicPriceForecast {
  currentPriceAssessment: string;
  shortTermForecast: string;
  mediumTermForecast: string;
  recommendation: string;
  confidence: number;
  is_heuristic: true;
}

// ============================================================================
// HEURISTIC FALLBACKS (deterministic, no AI calls)
// ============================================================================

/**
 * Deterministic deal analysis based on price-per-day and trend.
 * Used when OpenCode API is exhausted (all 5 retries failed).
 */
function heuristicDealAnalysis(sailingData: any): HeuristicDealAnalysis {
  const cabinPrices = sailingData.pricing
    ?.filter((p: any) => p.passenger_count === 2)
    .reduce((acc: any, p: any) => {
      if (!acc[p.cabin_type] || new Date(p.captured_at) > new Date(acc[p.cabin_type].captured_at)) {
        acc[p.cabin_type] = p;
      }
      return acc;
    }, {}) ?? {};

  const inside = cabinPrices['Inside'];
  const ppd = inside ? parseFloat(inside.total_out_the_door_usd) / 2 / sailingData.durationDays : 150;

  // Parse trend from history
  let priceTrend: 'rising' | 'falling' | 'stable' = 'stable';
  let trendMagnitude = 0;
  const trendDesc = sailingData.pricingTrend || '';
  if (trendDesc.includes('UP') || trendDesc.includes('rising')) {
    priceTrend = 'rising';
    const mag = trendDesc.match(/(\d+\.?\d*)%/);
    if (mag) trendMagnitude = parseFloat(mag[1]);
  } else if (trendDesc.includes('DOWN') || trendDesc.includes('falling') || trendDesc.includes('dropping')) {
    priceTrend = 'falling';
    const mag = trendDesc.match(/(\d+\.?\d*)%/);
    if (mag) trendMagnitude = parseFloat(mag[1]);
  }

  // Scoring: lower PPD = better deal, falling prices = better deal
  let dealScore = 50;
  if (ppd < 100) dealScore += 25;
  else if (ppd < 150) dealScore += 10;
  else if (ppd > 300) dealScore -= 20;

  if (priceTrend === 'falling') dealScore += Math.min(20, trendMagnitude * 2);
  else if (priceTrend === 'rising') dealScore -= Math.min(15, trendMagnitude);

  dealScore = Math.max(0, Math.min(100, Math.round(dealScore)));

  const verdict = dealScore >= 75 ? 'Strong buy — excellent value' :
                  dealScore >= 60 ? 'Good deal — consider booking' :
                  dealScore >= 40 ? 'Fair value — monitor for drops' :
                  'Below average — wait for better pricing';

  return {
    dealScore,
    pricingDeepDive: `Heuristic: PPD $${ppd.toFixed(0)}, trend ${priceTrend} (${trendMagnitude.toFixed(1)}%). ${Object.entries(cabinPrices).slice(0,3).map(([k,v]: [string,any]) => `${k}: $${v.total_out_the_door_usd}`).join('; ')}`,
    priceTrend,
    shipExperience: 'AI analysis unavailable — based on fleet averages for this class',
    insiderTips: [
      'Book 60-90 days out for best cabin selection',
      'Monitor price drops 30-45 days before departure',
      'Consider shoulder season for better value'
    ],
    verdict,
    is_heuristic: true,
  };
}

/**
 * Deterministic price forecast based on days until departure and volatility.
 * Used when OpenCode API is rate-limited and all retries exhausted.
 */
function heuristicPriceForecast(currentPrice: number, daysUntil: number): HeuristicPriceForecast {
  const baseVolatility = 0.08;
  const urgencyMultiplier = daysUntil < 14 ? 1.5 : daysUntil < 30 ? 1.2 : daysUntil < 60 ? 1.0 : 0.8;
  const volatility = baseVolatility * urgencyMultiplier;

  // Trend: prices generally rise as departure approaches
  const trendFactor = daysUntil < 30 ? 1.15 : daysUntil < 60 ? 1.08 : 1.03;

  const forecast7d = Math.round(currentPrice * (1 + volatility * 0.5));
  const forecast30d = Math.round(currentPrice * trendFactor);
  const confidence = daysUntil < 14 ? 0.6 : daysUntil < 30 ? 0.45 : daysUntil < 60 ? 0.35 : 0.25;

  const assessment = forecast7d > currentPrice * 1.05 ? 'above market' :
                     forecast7d < currentPrice * 0.95 ? 'below market' : 'at market';

  const recommendation = trendFactor > 1.1 ? 'buy now' :
                         trendFactor > 1.05 ? 'buy soon' : 'monitor';

  return {
    currentPriceAssessment: assessment,
    shortTermForecast: `+${((forecast7d - currentPrice) / currentPrice * 100).toFixed(1)}% in 7 days (heuristic)`,
    mediumTermForecast: `+${((forecast30d - currentPrice) / currentPrice * 100).toFixed(1)}% in 30 days (heuristic)`,
    recommendation,
    confidence,
    is_heuristic: true,
  };
}

// ============================================================================
// OPTIMIZED DEAL ANALYSIS PROMPT (Strict JSON, ~500 tokens)
// ============================================================================

const OPTIMIZED_DEAL_ANALYSIS_PROMPT = `
Analyze this cruise sailing for deal value. Output ONLY valid JSON with this exact schema:

{
  "dealScore": 0-100,
  "pricingDeepDive": "string",
  "priceTrend": "rising|falling|stable",
  "shipExperience": "string",
  "insiderTips": ["tip1", "tip2", "tip3"],
  "verdict": "string"
}

NO MARKDOWN. NO COMMENTARY. NO EXPLANATION. JUST THE JSON OBJECT.

SAILING DATA:
{JSON_DATA}
`;

// ============================================================================
// MARKET SUMMARY
// ============================================================================

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

  const systemPrompt = `You are TripTide's cruise market analyst. Write a concise, data-driven market summary. Use the stats to give actionable insights. Format as markdown with headers. Under 400 words. Be direct and specific with numbers.`;

  const userPrompt = `Current cruise market data:

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

Generate a market summary report with: overall conditions, best-value destinations, pricing trends, notable deals.`;

  const result = await callOpenCode(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { max_tokens: 2048, temperature: 0.4 }
  );

  return result;
}

// ============================================================================
// OPTIMIZED SAILING DEAL ANALYSIS (with heuristic fallback)
// ============================================================================

export async function analyzeSailingDealOptimized(
  sailingId: string,
  sailingData: any,
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

  const cabinPrices = sailingData.pricing
    ?.filter((p: any) => p.passenger_count === 2)
    .reduce((acc: any, p: any) => {
      if (!acc[p.cabin_type] || new Date(p.captured_at) > new Date(acc[p.cabin_type].captured_at)) {
        acc[p.cabin_type] = p;
      }
      return acc;
    }, {}) ?? {};

  const pricingLines = Object.entries(cabinPrices)
    .map(([type, p]: [string, any]) => {
      const perPerson = (parseFloat(p.total_out_the_door_usd) / 2).toFixed(0);
      const ppd = (parseFloat(p.total_out_the_door_usd) / 2 / sailingData.durationDays).toFixed(2);
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

  const sailingJson = {
    sailing: {
      cruiseLine: sailingData.cruiseLine,
      shipName: sailingData.shipName,
      durationDays: sailingData.durationDays,
      departurePort: sailingData.departurePort,
      destinationRegion: sailingData.destinationRegion,
      departureDate: sailingData.departureDate,
      itinerary: sailingData.itinerary,
      cabinCategories: sailingData.cabinCategories,
      bookingUrl: sailingData.bookingUrl,
    },
    pricing: {
      cabinPrices: pricingLines,
      trend: trendDescription,
    },
  };

  const prompt = OPTIMIZED_DEAL_ANALYSIS_PROMPT.replace('{JSON_DATA}', JSON.stringify(sailingJson));

  try {
    const result = await callOpenCode(
      [
        { role: 'system', content: "You are TripTide's deal analyst. Output ONLY the JSON object specified. No markdown, no commentary." },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 1024, temperature: 0.3 }
    );

    // Validate and normalize JSON output
    const parsed = JSON.parse(result.trim());
    return JSON.stringify({
      dealScore: Math.max(0, Math.min(100, Number(parsed.dealScore) || 50)),
      pricingDeepDive: String(parsed.pricingDeepDive || 'Analysis unavailable'),
      priceTrend: ['rising', 'falling', 'stable'].includes(parsed.priceTrend) ? parsed.priceTrend : 'stable',
      shipExperience: String(parsed.shipExperience || 'Experience data unavailable'),
      insiderTips: Array.isArray(parsed.insiderTips) ? parsed.insiderTips.slice(0, 3) : ['Contact agent for details'],
      verdict: String(parsed.verdict || 'Manual review recommended'),
      is_heuristic: false,
    });
  } catch (err: any) {
    // All retries exhausted or parse failed → use heuristic fallback
    console.warn(`[HEURISTIC] Deal analysis fallback for sailing ${id}: ${err.message}`);
    const heuristic = heuristicDealAnalysis({ ...sailingData, pricingTrend: trendDescription });
    return JSON.stringify(heuristic);
  }
}

// ============================================================================
// PRICE FORECAST (with heuristic fallback)
// ============================================================================

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

  const systemPrompt = `You are TripTide's price forecasting analyst. Based on historical pricing data, predict where prices are headed. Consider time until departure, price volatility, and historical patterns. Format as markdown. Be specific with numbers and timeframes. Under 250 words.`;

  const userPrompt = `Forecast the price trajectory for this cruise:

SAILING:
- Cruise Line: ${s.cruise_line}
- Ship: ${s.ship_name}
- Duration: ${s.duration_days} nights
- Destination: ${s.destination_region || 'N/A'}
- Departure: ${s.departure_date} (${daysUntil} days from now)

PRICING HISTORY BY CABIN:
${cabinSummaries}

Provide:
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

  return result;
}

// ============================================================================
// CACHED PRICE FORECAST (sync-phase generation, DB-first serving)
// ============================================================================

export async function generatePriceForecastOptimized(
  sailingId: string,
  forceRefresh = false
): Promise<string> {
  const pool = getPool();
  const id = parseInt(sailingId, 10);
  if (isNaN(id)) throw new Error(`Invalid sailing ID: ${sailingId}`);

  if (!forceRefresh) {
    const cached = await pool.query(
      'SELECT price_forecast FROM sailings WHERE id = $1 AND price_forecast IS NOT NULL',
      [id]
    );
    if (cached.rows.length > 0 && cached.rows[0].price_forecast) {
      return cached.rows[0].price_forecast;
    }
  }

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

  const systemPrompt = `You are TripTide's price forecasting analyst. Based on historical pricing data, predict where prices are headed. Consider time until departure, price volatility, and historical patterns. Format as markdown. Be specific with numbers and timeframes. Under 250 words.`;

  const userPrompt = `Forecast the price trajectory for this cruise:

SAILING:
- Cruise Line: ${s.cruise_line}
- Ship: ${s.ship_name}
- Duration: ${s.duration_days} nights
- Destination: ${s.destination_region || 'N/A'}
- Departure: ${s.departure_date} (${daysUntil} days from now)

PRICING HISTORY BY CABIN:
${cabinSummaries}

Provide:
1. Current price assessment (below/above/at market)
2. Short-term forecast (next 1-2 weeks)
3. Medium-term forecast (next month)
4. Buy/wait recommendation with confidence level`;

  try {
    const result = await callOpenCode(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { max_tokens: 1200, temperature: 0.3 }
    );

    await pool.query(
      'UPDATE sailings SET price_forecast = $1, price_forecast_generated_at = NOW() WHERE id = $2',
      [result, id]
    );

    return result;
  } catch (err: any) {
    // All retries exhausted → use heuristic fallback
    console.warn(`[HEURISTIC] Price forecast fallback for sailing ${id}: ${err.message}`);
    const currentPrice = extractCurrentPrice(s, byCabin);
    const heuristic = heuristicPriceForecast(currentPrice, daysUntil);
    const heuristicResult = JSON.stringify(heuristic);
    
    await pool.query(
      'UPDATE sailings SET price_forecast = $1, price_forecast_generated_at = NOW() WHERE id = $2',
      [heuristicResult, id]
    );
    
    return heuristicResult;
  }
}

function extractCurrentPrice(sailing: any, byCabin: Record<string, any[]>): number {
  const inside = byCabin['Inside']?.[0];
  if (inside?.total_out_the_door_usd) return parseFloat(inside.total_out_the_door_usd);
  const firstCabin = Object.values(byCabin)[0]?.[0];
  return firstCabin?.total_out_the_door_usd ? parseFloat(firstCabin.total_out_the_door_usd) : 1000;
}

// ============================================================================
// BATCH ANALYSIS (for manual trigger via /api/analytics/analyze-all)
// ============================================================================

export async function analyzeAllSailingsOptimized(closePool = false): Promise<string> {
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
          // Need to fetch sailing data for proper analysis
          const sailingResult = await pool.query(
            `SELECT * FROM sailings WHERE id = $1`,
            [sid]
          );
          if (sailingResult.rows.length === 0) return false;
          
          const sailing = sailingResult.rows[0];
          const pricingResult = await pool.query(
            `SELECT * FROM pricing_snapshots WHERE sailing_id = $1 ORDER BY captured_at DESC`,
            [sid]
          );
          
          const analysis = await analyzeSailingDealOptimized(String(sid), {
            ...sailing,
            pricing: pricingResult.rows
          }, true);
          
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