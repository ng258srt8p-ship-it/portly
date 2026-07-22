/**
 * TripTide — OpenCode Data Generator
 * 
 * Uses OpenCode (Big Pickle) to generate realistic cruise data
 * without web scraping.
 * 
 * Strategy:
 * - Ask OpenCode to "act as a cruise industry analyst"
 * - Generate JSON-structured sailing data for specific ships/dates
 * - Enforce realistic pricing heuristics in the prompt
 * - Generate deal analysis & forecasts in the same call
 */

import { callOpenCode } from '../utils/openCodeClient';
import { sanitizeDealContent } from '../utils/contentFormatter';

interface GeneratedSailing {
  ship: string;
  cruiseLine: string;
  sailDate: string;
  duration: number;
  departurePort: string;
  destination: string;
  itinerary: string[];
  cabinPricing: {
    interior: number;
    oceanview: number;
    balcony: number;
    suite: number;
  };
  dealAnalysis?: string;
  priceForecast?: string;
}

/**
 * Generate a batch of realistic sailing records.
 * 
 * @param shipName - Specific ship to generate for (optional)
 * @param month - Target departure month (1-12)
 * @param year - Target year (e.g., 2026)
 * @param count - Number of sailings to generate (default 10)
 */
export async function generateSailings(
  shipName?: string,
  month?: number,
  year: number = 2026,
  count: number = 10
): Promise<GeneratedSailing[]> {
  console.log(`[OpenCode Gen] Generating ${count} sailings`);
  if (shipName) console.log(`[OpenCode Gen] Ship: ${shipName}, Month: ${month || 'Any'}, Year: ${year}`);

  const ships = [
    'Icon of the Seas', 'Wonder of the Seas', 'Symphony of the Seas',
    'Utopia of the Seas', 'Allure of the Seas', 'Oasis of the Seas',
    'Mardi Gras', 'Carnival Celebration', 'Icon of the Seas'
  ];
  
  const targetShip = shipName || ships[Math.floor(Math.random() * ships.length)];
  const targetMonth = month || Math.floor(Math.random() * 12) + 1;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = monthNames[targetMonth - 1];

  const prompt = `
You are a Cruise Industry Actuary with deep knowledge of Royal Caribbean, Carnival, and Norwegian pricing models.
Your task: Generate ${count} realistic sailing records for **${targetShip}** departing in **${monthStr} ${year}**.

CRITICAL CONSTRAINTS:
1. Return ONLY a valid JSON array. No markdown, no explanations.
2. Prices must follow industry logic: Suite > Balcony > Oceanview > Interior.
3. Typical 7-night Caribbean pricing (2 passengers):
   - Interior: $800 - $1,500
   - Oceanview: $1,000 - $1,800
   - Balcony: $1,500 - $2,500
   - Suite: $2,500 - $5,000+
4. Itineraries must be realistic ports for the region (Caribbean/Bahamas).
5. Duration must be 3, 4, 5, 6, 7, or 10 nights.

SCHEMA (exact JSON structure):
[
  {
    "ship": "string (ship name)",
    "cruiseLine": "Royal Caribbean | Carnival | Norwegian",
    "sailDate": "YYYY-MM-DD",
    "duration": number (nights),
    "departurePort": "string (port city, state)",
    "destination": "Caribbean | Bahamas | Alaska | Mediterranean",
    "itinerary": ["Port 1", "Port 2", "Port 3", ...],
    "cabinPricing": {
      "interior": number (USD),
      "oceanview": number (USD),
      "balcony": number (USD),
      "suite": number (USD)
    },
    "dealAnalysis": "string (1-2 sentences, insider tone explaining value proposition)",
    "priceForecast": "string (predicts price trend: rising, falling, stable)"
  }
]

Generate now for **${targetShip}** in **${monthStr} ${year}**.
`;

  try {
    const response = await callOpenCode(
      [{ role: 'user', content: prompt }],
      { model: 'mimo-v2.5-free', temperature: 0.7, max_tokens: 2048 }
    );

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const data = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(data)) {
      throw new Error('Response is not an array');
    }

    // Validate and sanitize generated data
    const sanitized: GeneratedSailing[] = data.map((item: any) => ({
      ship: item.ship || targetShip,
      cruiseLine: item.cruiseLine || 'Royal Caribbean',
      sailDate: item.sailDate || `${year}-${String(targetMonth).padStart(2, '0')}-${10}`,
      duration: item.duration || 7,
      departurePort: item.departurePort || 'Miami, FL',
      destination: item.destination || 'Caribbean',
      itinerary: item.itinerary || ['Miami', 'Cozumel', 'Roatan'],
      cabinPricing: {
        interior: Math.max(0, item.cabinPricing?.interior || 1000),
        oceanview: Math.max(0, item.cabinPricing?.oceanview || 1200),
        balcony: Math.max(0, item.cabinPricing?.balcony || 1800),
        suite: Math.max(0, item.cabinPricing?.suite || 3000),
      },
      dealAnalysis: item.dealAnalysis || 'Standard value pricing for this itinerary.',
      priceForecast: item.priceForecast || 'Prices expected to remain stable until close-in booking.',
    })).filter(s => s.cabinPricing.interior > 0); // Filter invalid entries

    console.log(`[OpenCode Gen] Generated ${sanitized.length} valid sailings`);
    return sanitized;

  } catch (err: any) {
    console.error(`[OpenCode Gen] Failed:`, err.message);
    // Fallback: Generate deterministic "good enough" data
    console.log('[OpenCode Gen] Falling back to deterministic generation');
    return generateFallbackSailings(targetShip, targetMonth, year, count);
  }
}

/**
 * Fallback deterministic generator if OpenCode fails.
 * Creates realistic-sounding fake data.
 */
function generateFallbackSailings(
  ship: string,
  month: number,
  year: number,
  count: number
): GeneratedSailing[] {
  const basePrices: Record<string, { i: number; o: number; b: number; s: number }> = {
      'Icon of the Seas': { i: 1100, o: 1350, b: 1800, s: 3000 },
      'Wonder of the Seas': { i: 950, o: 1200, b: 1600, s: 2600 },
      'Symphony of the Seas': { i: 900, o: 1150, b: 1500, s: 2400 },
      'Utopia of the Seas': { i: 1050, o: 1300, b: 1750, s: 2900 },
    };
  
    const styles: Record<string, { line: string; port: string; dest: string }> = {
      'Icon of the Seas': { line: 'Royal Caribbean', port: 'Miami, FL', dest: 'Caribbean' },
      'Wonder of the Seas': { line: 'Royal Caribbean', port: 'Florida (Port Canaveral)', dest: 'Caribbean' },
      'Symphony of the Seas': { line: 'Royal Caribbean', port: 'Miami, FL', dest: 'Caribbean' },
      'Utopia of the Seas': { line: 'Royal Caribbean', port: 'Port Canaveral, FL', dest: 'Caribbean' },
    };

    const data = styles[ship] || { line: 'Royal Caribbean', port: 'Miami, FL', dest: 'Caribbean' };
    const prices = basePrices[ship] || { i: 1000, o: 1250, b: 1700, s: 2800 };

  const results: GeneratedSailing[] = [];
  
  for (let i = 0; i < count; i++) {
    const day = 5 + (i * 7); // Spread over the month
    const dates = new Date(year, month - 1, 5);
    dates.setDate(day);
    
    const saleDate = dates.toISOString().split('T')[0];
    
    // Add slight random variance (±5%)
    const variance = 0.95 + (Math.random() * 0.1);
    
    results.push({
      ship,
      cruiseLine: data.line,
      sailDate: saleDate,
      duration: 7,
      departurePort: data.port,
      destination: data.dest,
      itinerary: ['Homeport', 'At Sea', 'CocoCay', 'Nassau', 'At Sea'],
      cabinPricing: {
        interior: Math.floor(prices.i * variance),
        oceanview: Math.floor(prices.o * variance),
        balcony: Math.floor(prices.b * variance),
        suite: Math.floor(prices.s * variance),
      },
      dealAnalysis: `Great value for ${ship} in ${month}/${year}. Prices are trending ${Math.random() > 0.5 ? 'down' : 'stable'}.`,
      priceForecast: Math.random() > 0.7 ? 'Expected to rise 10-15% as sail date approaches.' : 'Stable pricing expected.',
    });
  }

  return results;
}

/**
 * Upsert generated sailings to database.
 */
export async function upsertSailingsToDB(sailings: GeneratedSailing[]): Promise<void> {
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
        VALUES ($1, $2, $3::date, $4, $5, $6, $7, 'opencode-ai', NOW())
        ON CONFLICT (cruise_line, ship_name, CAST(departure_date AS date))
        DO UPDATE SET
          duration_days = EXCLUDED.duration_days,
          departure_port = EXCLUDED.departure_port,
          destination_region = EXCLUDED.destination_region,
          itinerary = EXCLUDED.itinerary,
          deal_analysis = EXCLUDED.deal_analysis,
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

      // Upsert pricing for each cabin
      const cabinTypes = [
        { type: 'Inside', price: s.cabinPricing.interior },
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
          VALUES ($1, $2, 2, $3::numeric, 0, 0, NOW(), 'opencode-ai')
        `, [sailingId, cabin.type, cabin.price]);
      }

      // Update deal analysis if available
      if (s.dealAnalysis) {
        await pool.query(
          `UPDATE sailings SET deal_analysis = $1 WHERE id = $2`,
          [sanitizeDealContent(s.dealAnalysis), sailingId]
        );
      }

      console.log(`[DB] ✅ Upserted: ${s.ship} (${s.sailDate})`);
    } catch (err: any) {
      console.error(`[DB] ❌ Failed: ${s.ship} (${s.sailDate}):`, err.message);
    }
  }
}

/**
 * Main entry point for CLI or cron
 */
export async function runOpencodeSync(ship?: string): Promise<number> {
  console.log('\n🚀 Starting OpenCode-Only Data Generation...\n');
  
  // Skip OpenCode call (too slow/unreliable), use deterministic fallback
  console.log('[Sync] Using deterministic generation (OpenCode skipped for reliability)');
  const count = ship ? 10 : 20;
  const targetShip = ship || 'Icon of the Seas';
  const sailings = generateFallbackSailings(targetShip, new Date().getMonth() + 1, 2026, count);
  
  if (sailings.length === 0) {
    console.log('No sailings generated. Exiting.');
    return 0;
  }

  console.log(`\nUpserting ${sailings.length} sailings to DB...`);
  await upsertSailingsToDB(sailings);
  
  console.log('\n✅ OpenCode Sync Complete\n');
  return sailings.length;
}

// Run if called directly
if (require.main === module) {
  const shipArg = process.argv[2];
  runOpencodeSync(shipArg)
    .then(count => {
      console.log(`Generated ${count} sailings`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}