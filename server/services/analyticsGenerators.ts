/**
 * TripTide — AI-Powered Market Analytics Generators (Batched)
 *
 * Generates structured analytics records via OpenCode API using batched prompts
 * to minimize API calls. Batch sizes: 10 ships, 8 regions, 10 cruise lines, 6 booking insights.
 *
 * All AI calls use callOpenCode from '../utils/openCodeClient' with centralized rate limiting.
 */

import { callOpenCode } from '../utils/openCodeClient';

// ============================================================================
// EXPORTED TYPES — Record shapes returned by generators
// ============================================================================

export interface ShipDetailRecord {
  shipName: string;
  cruiseLine: string;
  shipClass: string;
  yearBuilt: number;
  passengerCapacity: number;
  crewCount: number;
  tonnage: number;
  restaurants: string[];
  pools: number;
  entertainment: string[];
  amenities: string[];
  deckCount: number;
  cabinCount: number;
}

export interface DestinationInsightRecord {
  destinationRegion: string;
  avgPricePpd: number;
  bestValueMonths: string[];
  peakSeasonMonths: string[];
  shoulderMonths: string[];
  avgDurationDays: number;
  topCruiseLines: string[];
  priceTrend: string;
}

export interface MarketComparisonRecord {
  cruiseLine: string;
  avgPricePpd: number;
  minPricePpd: number;
  maxPricePpd: number;
  avgDurationDays: number;
  destinationCount: number;
  sailingCount: number;
  overallRating: number;
  bestValueRating: number;
}

export interface PriceForecastRecord {
  sailingId: number;
  cabinType: string;
  currentPriceUsd: number;
  forecast7d: number;
  forecast30d: number;
  confidenceScore: number;
  trendDirection: string;
}

export interface BookingInsightRecord {
  destinationRegion: string;
  optimalBookingWindow: string;
  avgDaysBeforeDeparture: number;
  lastMinuteDealScore: number;
  earlyBirdDiscountPct: number;
}

// ============================================================================
// HELPER — Resilient JSON array parser (handles batched responses)
// ============================================================================

/**
 * Attempt to parse a raw string response as a JSON array of type T.
 * Handles batched responses where the AI returns { items: [...] } or direct [...]
 * Strips markdown code fences if present.
 * Returns the parsed array on success, empty array on failure.
 */
function parseJsonArray<T>(raw: string): T[] {
  if (!raw || raw.trim().length === 0) {
    console.warn('[ANALYTICS_GEN] Empty response from AI');
    return [];
  }

  let cleaned = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try parsing directly
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    // If the top-level is an object with an array property, try that
    if (typeof parsed === 'object' && parsed !== null) {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          console.warn(
            `[ANALYTICS_GEN] Wrapped response detected — extracting array from key "${key}"`
          );
          return parsed[key] as T[];
        }
      }
    }
    console.warn('[ANALYTICS_GEN] Parsed result is not an array, got:', typeof parsed);
    return [];
  } catch {
    // Not valid JSON — try to find and extract a JSON array substring
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const extracted = JSON.parse(arrayMatch[0]);
        if (Array.isArray(extracted)) {
          console.warn('[ANALYTICS_GEN] Extracted JSON array from non-JSON response');
          return extracted as T[];
        }
      } catch {
        // Give up
      }
    }
    console.error('[ANALYTICS_GEN] Failed to parse AI response as JSON array');
    return [];
  }
}

// ============================================================================
// BATCH CONFIGURATION
// ============================================================================

const BATCH_SIZES = {
  ships: 10,
  destinations: 8,
  cruiseLines: 10,
  bookingInsights: 6,
} as const;

// ============================================================================
// GENERATOR 1 — Ship Details Batch (30 ships → 3 calls × 10)
// ============================================================================

const SHIP_BATCH_SYSTEM_PROMPT =
  'You are a cruise industry database curator with encyclopedic knowledge of the global cruise fleet. ' +
  'Respond ONLY with a valid JSON object containing an "items" array of ship objects. ' +
  'No markdown, no code fences, no explanation — just the raw JSON object. ' +
  'Every field must be populated with real, factual data.';

const SHIP_BATCH_USER_TEMPLATE = (ships: string[]) => `Generate a JSON object with an "items" array of exactly ${ships.length} real, detailed cruise ship entries.

Ships to include:
${ships.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Each object must have exactly this structure:
{
  "shipName": "string",
  "cruiseLine": "string",
  "shipClass": "string",
  "yearBuilt": number,
  "passengerCapacity": number,
  "crewCount": number,
  "tonnage": number,
  "restaurants": ["string", ...],
  "pools": number,
  "entertainment": ["string", ...],
  "amenities": ["string", ...],
  "deckCount": number,
  "cabinCount": number
}

Use realistic data: accurate yearBuilt, passenger capacity (double occupancy), crew count, gross tonnage, and realistic counts for restaurants (5–25), pools (1–7), deckCount (10–20), and cabinCount (500–5000). Entertainment should list signature venues (theaters, casinos, water parks, etc.). Amenities should list key features (spa, fitness, kids club, etc.).

Return ONLY the JSON object — no other text.`;

const ALL_SHIPS = [
  'Icon of the Seas (Royal Caribbean)',
  'Symphony of the Seas (Royal Caribbean)',
  'Discovery Princess (Princess Cruises)',
  'Norwegian Prima (Norwegian Cruise Line)',
  'MSC World Europa (MSC Cruises)',
  'Carnival Jubilee (Carnival Cruise Line)',
  'Queen Anne (Cunard Line)',
  'Celebrity Ascent (Celebrity Cruises)',
  'Holland America Rotterdam (Holland America Line)',
  'Costa Smeralda (Costa Cruises)',
  'Silver Dawn (Silversea Cruises)',
  'Regent Seven Seas Splendor (Regent Seven Seas Cruises)',
  'Oceania Vista (Oceania Cruises)',
  'Viking Mars (Viking Ocean Cruises)',
  'Disney Treasure (Disney Cruise Line)',
  'Virgin Valiant Lady (Virgin Voyages)',
  'Wind Surf (Windstar Cruises)',
  'Seabourn Pursuit (Seabourn Cruise Line)',
  'Azamara Onward (Azamara)',
  'Emerald Sakara (Emerald Cruises)',
  'AIDAperla (AIDA Cruises)',
  'TUI Meine Schiff 7 (TUI Cruises)',
  'P&O Iona (P&O Cruises)',
  'Mardi Gras (Carnival Cruise Line)',
  'Norwegian Encore (Norwegian Cruise Line)',
  'Oasis of the Seas (Royal Caribbean)',
  'Celebrity Beyond (Celebrity Cruises)',
  'Enchanted Princess (Princess Cruises)',
  'MSC Seascape (MSC Cruises)',
  'Queen Mary 2 (Cunard Line)',
];

export async function generateShipDetailsBatch(): Promise<ShipDetailRecord[]> {
  console.log('[ANALYTICS_GEN] Generating ship details batch (batched)...');

  const allRecords: ShipDetailRecord[] = [];
  const batchSize = BATCH_SIZES.ships;

  for (let i = 0; i < ALL_SHIPS.length; i += batchSize) {
    const batch = ALL_SHIPS.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(ALL_SHIPS.length / batchSize);

    console.log(`[ANALYTICS_GEN] Ship batch ${batchNum}/${totalBatches} (${batch.length} ships)...`);

    try {
      const result = await callOpenCode(
        [
          { role: 'system', content: SHIP_BATCH_SYSTEM_PROMPT },
          { role: 'user', content: SHIP_BATCH_USER_TEMPLATE(batch) },
        ],
        { max_tokens: 8192, temperature: 0.3 }
      );

      const records = parseJsonArray<ShipDetailRecord>(result);
      console.log(`[ANALYTICS_GEN] Ship batch ${batchNum}: ${records.length} records parsed`);
      allRecords.push(...records);
    } catch (err: any) {
      console.error(`[ANALYTICS_GEN] Ship batch ${batchNum} failed: ${err.message}`);
    }
  }

  console.log(`[ANALYTICS_GEN] Ship details complete: ${allRecords.length} total records`);
  return allRecords;
}

// ============================================================================
// GENERATOR 2 — Destination Insights (15+ regions → 2 calls × 8)
// ============================================================================

const DEST_BATCH_SYSTEM_PROMPT =
  'You are a cruise market intelligence analyst with deep knowledge of global cruise destination pricing and seasonality. ' +
  'Respond ONLY with a valid JSON object containing an "items" array. ' +
  'No markdown, no code fences, no explanation — just the raw JSON object.';

const DEST_BATCH_USER_TEMPLATE = (regions: string[]) => `Generate a JSON object with an "items" array of ${regions.length} market intelligence records for cruise destination regions.

Regions to cover:
${regions.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Each object must have exactly this structure:
{
  "destinationRegion": "string",
  "avgPricePpd": number,
  "bestValueMonths": ["string", ...],
  "peakSeasonMonths": ["string", ...],
  "shoulderMonths": ["string", ...],
  "avgDurationDays": number,
  "topCruiseLines": ["string", ...],
  "priceTrend": "string"
}

Use realistic per-person-per-day pricing (avgPricePpd between $80 and $600 depending on region).
bestValueMonths: 3-4 months when prices are lowest.
peakSeasonMonths: 3-4 months of highest demand/pricing.
shoulderMonths: transition months between peak and off-peak.
avgDurationDays: realistic (3-14 for most, up to 21+ for transatlantic/Amazon).
topCruiseLines: 3-6 lines that dominate that region.
priceTrend: one of "rising", "falling", or "stable".

Examples:
- Caribbean: avgPricePpd ~$120-180, peak Dec-Apr, best value Sep-Nov
- Alaska: avgPricePpd ~$200-350, peak Jun-Aug, best value May/Sep
- Mediterranean: avgPricePpd ~$150-300, peak Jul-Aug, best value Oct-Apr

Return ONLY the JSON object — no other text.`;

const ALL_DESTINATIONS = [
  'Caribbean (Eastern)',
  'Caribbean (Western)',
  'Caribbean (Southern)',
  'Bahamas',
  'Alaska (Inside Passage)',
  'Alaska (Glacier Bay)',
  'Mediterranean (Western)',
  'Mediterranean (Eastern)',
  'Mediterranean (Greek Isles)',
  'Northern Europe / Baltic',
  'Norwegian Fjords',
  'Mexican Riviera',
  'Panama Canal',
  'Hawaii',
  'South Pacific / French Polynesia',
  'Australia / New Zealand',
  'South America / Amazon',
  'Transatlantic',
  'Asia (Southeast Asia)',
  'Asia (Japan)',
  'Middle East / Arabian Gulf',
  'Canada / New England',
  'Bermuda',
  'British Isles / Ireland',
  'Antarctica',
  'Galapagos',
];

export async function generateDestinationInsights(): Promise<DestinationInsightRecord[]> {
  console.log('[ANALYTICS_GEN] Generating destination insights (batched)...');

  const allRecords: DestinationInsightRecord[] = [];
  const batchSize = BATCH_SIZES.destinations;

  for (let i = 0; i < ALL_DESTINATIONS.length; i += batchSize) {
    const batch = ALL_DESTINATIONS.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(ALL_DESTINATIONS.length / batchSize);

    console.log(`[ANALYTICS_GEN] Destination batch ${batchNum}/${totalBatches} (${batch.length} regions)...`);

    try {
      const result = await callOpenCode(
        [
          { role: 'system', content: DEST_BATCH_SYSTEM_PROMPT },
          { role: 'user', content: DEST_BATCH_USER_TEMPLATE(batch) },
        ],
        { max_tokens: 4096, temperature: 0.4 }
      );

      const records = parseJsonArray<DestinationInsightRecord>(result);
      console.log(`[ANALYTICS_GEN] Destination batch ${batchNum}: ${records.length} records parsed`);
      allRecords.push(...records);
    } catch (err: any) {
      console.error(`[ANALYTICS_GEN] Destination batch ${batchNum} failed: ${err.message}`);
    }
  }

  console.log(`[ANALYTICS_GEN] Destination insights complete: ${allRecords.length} total records`);
  return allRecords;
}

// ============================================================================
// GENERATOR 3 — Market Comparisons (20+ cruise lines → 2 calls × 10)
// ============================================================================

const MARKET_BATCH_SYSTEM_PROMPT =
  'You are a cruise industry pricing analyst with access to comprehensive fare benchmarking data across all major cruise lines. ' +
  'Respond ONLY with a valid JSON object containing an "items" array. ' +
  'No markdown, no code fences, no explanation — just the raw JSON object.';

const MARKET_BATCH_USER_TEMPLATE = (lines: string[]) => `Generate a JSON object with an "items" array of ${lines.length} cruise line pricing benchmark records.

Cruise lines to cover:
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Each object must have exactly this structure:
{
  "cruiseLine": "string",
  "avgPricePpd": number,
  "minPricePpd": number,
  "maxPricePpd": number,
  "avgDurationDays": number,
  "destinationCount": number,
  "sailingCount": number,
  "overallRating": number,
  "bestValueRating": number
}

Use realistic benchmarks:
- avgPricePpd: $80-200 mass market, $150-350 premium, $200-500 upper premium, $350-1000+ luxury
- minPricePpd / maxPricePpd: realistic low-end and high-end spread (within 30-60% of avg)
- avgDurationDays: 5-8 mass market, 7-12 premium, 10-18 luxury
- destinationCount: 20-300+ depending on fleet size
- sailingCount: 200-5000+ depending on fleet size
- overallRating: 1.0-5.0 based on real-world reputation
- bestValueRating: 1.0-5.0 reflecting price-to-experience ratio

Return ONLY the JSON object — no other text.`;

const ALL_CRUISE_LINES = [
  // Mass Market / Contemporary
  'Carnival Cruise Line',
  'Royal Caribbean International',
  'Norwegian Cruise Line',
  'MSC Cruises',
  'Costa Cruises',
  'AIDA Cruises',
  // Premium
  'Celebrity Cruises',
  'Princess Cruises',
  'Holland America Line',
  'Cunard Line',
  'Virgin Voyages',
  // Upper Premium / Entry Luxury
  'Oceania Cruises',
  'Viking Ocean Cruises',
  'Azamara',
  // Luxury
  'Regent Seven Seas Cruises',
  'Silversea Cruises',
  'Seabourn Cruise Line',
  // Specialty / Regional
  'Disney Cruise Line',
  'P&O Cruises',
  'TUI Cruises',
  'Windstar Cruises',
  'Emerald Cruises',
];

export async function generateMarketComparisons(): Promise<MarketComparisonRecord[]> {
  console.log('[ANALYTICS_GEN] Generating market comparisons (batched)...');

  const allRecords: MarketComparisonRecord[] = [];
  const batchSize = BATCH_SIZES.cruiseLines;

  for (let i = 0; i < ALL_CRUISE_LINES.length; i += batchSize) {
    const batch = ALL_CRUISE_LINES.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(ALL_CRUISE_LINES.length / batchSize);

    console.log(`[ANALYTICS_GEN] Market comparison batch ${batchNum}/${totalBatches} (${batch.length} lines)...`);

    try {
      const result = await callOpenCode(
        [
          { role: 'system', content: MARKET_BATCH_SYSTEM_PROMPT },
          { role: 'user', content: MARKET_BATCH_USER_TEMPLATE(batch) },
        ],
        { max_tokens: 4096, temperature: 0.3 }
      );

      const records = parseJsonArray<MarketComparisonRecord>(result);
      console.log(`[ANALYTICS_GEN] Market comparison batch ${batchNum}: ${records.length} records parsed`);
      allRecords.push(...records);
    } catch (err: any) {
      console.error(`[ANALYTICS_GEN] Market comparison batch ${batchNum} failed: ${err.message}`);
    }
  }

  console.log(`[ANALYTICS_GEN] Market comparisons complete: ${allRecords.length} total records`);
  return allRecords;
}

// ============================================================================
// GENERATOR 4 — Price Forecast (single sailing, per-cabin) — UNCHANGED
// ============================================================================

/**
 * Generates a price forecast for a specific sailing and cabin type based on
 * current pricing and contextual sailing data.
 *
 * @param sailingId - Database ID of the sailing
 * @param cabinType - Cabin category (e.g., "Inside", "Oceanview", "Balcony", "Suite")
 * @param currentPrice - Current out-the-door price in USD
 * @returns A single PriceForecastRecord, or null on failure
 */
export async function generatePriceForecast(
  sailingId: number,
  cabinType: string,
  currentPrice: number
): Promise<PriceForecastRecord | null> {
  console.log(
    `[ANALYTICS_GEN] Generating price forecast for sailing ${sailingId}, ${cabinType} (current: $${currentPrice})...`
  );

  const systemPrompt =
    'You are a cruise pricing forecaster with expertise in revenue management and dynamic pricing patterns. ' +
    'Respond ONLY with a valid JSON object. No markdown, no code fences, no explanation — just the raw JSON.';

  const userPrompt = `Generate a price forecast for a cruise sailing based on the following data:

SAILING DATA:
- sailingId: ${sailingId}
- cabinType: ${cabinType}
- currentPrice: $${currentPrice}

Consider typical cruise pricing patterns:
- Prices often rise 10-25% within 7 days as lower-priced inventory gets booked
- Prices at 30 days out may rise 15-40% depending on demand and season
- Last-minute pricing near departure can drop 20-40% if inventory remains
- Suites and Balcony cabins tend to rise faster than Inside/Oceanview
- Confidence is higher for the 7-day forecast than the 30-day forecast

Respond with a single JSON object exactly like this:
{
  "sailingId": ${sailingId},
  "cabinType": "${cabinType}",
  "currentPriceUsd": ${currentPrice},
  "forecast7d": number,
  "forecast30d": number,
  "confidenceScore": number,
  "trendDirection": "rising" | "falling" | "stable"
}

- forecast7d: predicted price in 7 days (within 5-25% of current)
- forecast30d: predicted price in 30 days (within 10-40% of current)
- confidenceScore: 0.0 to 1.0 (higher for short-term forecasts)
- trendDirection: "rising", "falling", or "stable"

Return ONLY the JSON object — no other text.`;

  try {
    const result = await callOpenCode(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { max_tokens: 1024, temperature: 0.3 }
    );

    const records = parseJsonArray<PriceForecastRecord>(result);
    if (records.length > 0) {
      console.log(
        `[ANALYTICS_GEN] Price forecast for sailing ${sailingId}: ${records[0].trendDirection} (confidence: ${records[0].confidenceScore})`
      );
      return records[0];
    }

    // If parseJsonArray returned empty, try parsing as a single object
    try {
      const cleaned = result.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      const parsed = JSON.parse(cleaned);
      if (parsed && !Array.isArray(parsed) && parsed.sailingId !== undefined) {
        console.log(
          `[ANALYTICS_GEN] Price forecast for sailing ${sailingId}: ${parsed.trendDirection} (confidence: ${parsed.confidenceScore})`
        );
        return parsed as PriceForecastRecord;
      }
    } catch {
      // Single-object fallback also failed
    }

    console.warn(`[ANALYTICS_GEN] Price forecast parsing failed for sailing ${sailingId}`);
    return null;
  } catch (err: any) {
    console.error(`[ANALYTICS_GEN] Price forecast generation failed for sailing ${sailingId}: ${err.message}`);
    return null;
  }
}

// ============================================================================
// GENERATOR 5 — Booking Insights (12+ regions → 2 calls × 6)
// ============================================================================

const BOOKING_BATCH_SYSTEM_PROMPT =
  'You are a cruise industry booking intelligence analyst with data on booking windows, ' +
  'pricing elasticity, and discount patterns across all major destinations. ' +
  'Respond ONLY with a valid JSON object containing an "items" array. ' +
  'No markdown, no code fences, no explanation — just the raw JSON object.';

const BOOKING_BATCH_USER_TEMPLATE = (regions: string[]) => `Generate a JSON object with an "items" array of ${regions.length} booking window intelligence records for cruise destination regions.

Regions to cover:
${regions.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Each object must have exactly this structure:
{
  "destinationRegion": "string",
  "optimalBookingWindow": "string",
  "avgDaysBeforeDeparture": number,
  "lastMinuteDealScore": number,
  "earlyBirdDiscountPct": number
}

Use realistic data:
- optimalBookingWindow: human-readable window like "6-9 months before departure" or "3-5 months before departure"
- avgDaysBeforeDeparture: typical days early travelers book (30-365 depending on region)
- lastMinuteDealScore: 0-100 score for last-minute deal likelihood (higher = more deals close to departure)
- earlyBirdDiscountPct: typical early booking discount percentage (5-40 depending on region/cruise line)

Patterns:
- Caribbean: short windows (90-150 days), high last-minute deals (70-90), moderate early-bird (10-20%)
- Alaska: longer windows (180-300 days), low last-minute deals (20-40), high early-bird (20-35%)
- Mediterranean: moderate windows (120-210 days), moderate last-minute (40-65), moderate early-bird (15-25%)
- Luxury/expedition: very long windows (270-365 days), very low last-minute (5-20), high early-bird (25-40%)

Return ONLY the JSON object — no other text.`;

const ALL_BOOKING_REGIONS = [
  'Caribbean',
  'Bahamas',
  'Alaska',
  'Mediterranean (Western)',
  'Mediterranean (Eastern)',
  'Mediterranean (Greek Isles)',
  'Northern Europe / Baltic',
  'Norwegian Fjords',
  'Mexican Riviera',
  'Panama Canal',
  'Hawaii',
  'South Pacific / French Polynesia',
  'Australia / New Zealand',
  'South America / Amazon',
  'Transatlantic',
  'Asia / Southeast Asia',
  'Middle East / Arabian Gulf',
  'Canada / New England',
  'Bermuda',
  'British Isles / Ireland',
  'Antarctica',
  'Galapagos',
];

export async function generateBookingInsights(): Promise<BookingInsightRecord[]> {
  console.log('[ANALYTICS_GEN] Generating booking insights (batched)...');

  const allRecords: BookingInsightRecord[] = [];
  const batchSize = BATCH_SIZES.bookingInsights;

  for (let i = 0; i < ALL_BOOKING_REGIONS.length; i += batchSize) {
    const batch = ALL_BOOKING_REGIONS.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(ALL_BOOKING_REGIONS.length / batchSize);

    console.log(`[ANALYTICS_GEN] Booking insights batch ${batchNum}/${totalBatches} (${batch.length} regions)...`);

    try {
      const result = await callOpenCode(
        [
          { role: 'system', content: BOOKING_BATCH_SYSTEM_PROMPT },
          { role: 'user', content: BOOKING_BATCH_USER_TEMPLATE(batch) },
        ],
        { max_tokens: 4096, temperature: 0.4 }
      );

      const records = parseJsonArray<BookingInsightRecord>(result);
      console.log(`[ANALYTICS_GEN] Booking insights batch ${batchNum}: ${records.length} records parsed`);
      allRecords.push(...records);
    } catch (err: any) {
      console.error(`[ANALYTICS_GEN] Booking insights batch ${batchNum} failed: ${err.message}`);
    }
  }

  console.log(`[ANALYTICS_GEN] Booking insights complete: ${allRecords.length} total records`);
  return allRecords;
}