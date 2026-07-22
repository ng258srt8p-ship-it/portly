/**
 * TripTide — Enhanced Analytics Service (Phase 2)
 * 
 * Generates 6 cruise-specific insight dimensions per sailing using OpenCode AI.
 * These are UNIQUE to TripTide — no competitor has per-cruise inventory intelligence,
 * pricing strategy decoding, ship-specific value scoring, itinerary cost breakdown,
 * hidden cost detection, or sailing-specific insider tips.
 * 
 * All AI calls use callOpenCode from '../utils/openCodeClient'.
 * Includes heuristic fallback when API is rate-limited.
 */

import { getPool } from '../db/pool';
import { callOpenRouter } from '../lib/openRouterClient';
import { getGratuityRate } from "../utils/cruiseConstants";
import {
  formatJustification,
  formatPricingDeepDive,
  formatInsiderTips,
  FormattedSection,
} from '../utils/formatter';
import { sanitizeDealContent, sanitizeDealAnalysisObject } from '../utils/contentFormatter';

/* ====================================================================== */
/*  SERVER-SIDE TYPES                                                      */
/* ====================================================================== */

export interface SailingContext {
  sailingId: number;
  cruiseLine: string;
  shipName: string;
  durationDays: number;
  departurePort: string;
  destinationRegion?: string;
  departureDate: string;
  itinerary: string[];
  cabinCategories?: string[];
  bookingUrl?: string;
  currentPricing: Record<string, number>;
  priceHistory: Array<{ cabinType: string; price: number; date: string }>;
  shipDetails?: {
    yearBuilt?: number;
    passengerCapacity?: number;
    tonnage?: number;
    restaurants?: string[];
    pools?: number;
    entertainment?: string[];
    amenities?: string[];
    rating?: number;
  };
  destinationInsight?: {
    avgPricePpd?: number;
    bestValueMonths?: string[];
    peakSeasonMonths?: string[];
    priceTrend?: string;
  };
  marketComparison?: {
    avgPricePpd?: number;
    overallRating?: number;
    bestValueRating?: number;
  };
  tripType?: string;
  cabinPriorities?: string[];
}

export interface EnhancedDealAnalysisResult {
  dealScore: number;
  pricingDeepDive: string;
  priceTrend: 'rising' | 'falling' | 'stable';
  inventoryIntelligence?: string;
  pricingStrategy?: string;
  shipValueScore?: number;
  itineraryValue?: string;
  justification: string | FormattedSection[];
  /** @deprecated Use justification as FormattedSection[] instead */
  hiddenCosts?: {
    mandatoryGratuities?: number;
    wifiCost?: number;
    resortFees?: number;
    realTotalCost?: number;
  };
  insiderTips: string[] | FormattedSection[];
  verdict: string;
  cabinValueBreakdown?: Record<string, { perNight: number; valueRating: string }>;
  is_heuristic: boolean;
}

export interface CompetingSailingData {
  sailingId: number;
  cruiseLine: string;
  shipName: string;
  departureDate: string;
  balconyPrice: number;
  priceDifference?: number;
}

/**
 * Detects stale or degraded deal analysis data from prior code versions
 * or parsing failures. Returns true if the data should be regenerated.
 */
export function isDealAnalysisStale(dealAnalysis: Record<string, unknown>): boolean {
  const pricingDeepDive = String(dealAnalysis.pricingDeepDive ?? '');
  const verdict = String(dealAnalysis.verdict ?? '');
  const insiderTips = dealAnalysis.insiderTips;

  const placeholderPatterns = [
    'analysis parsing failed',
    'analysis unavailable',
    'data unavailable',
    'contact agent for details',
    'manual review recommended',
  ];

  if (placeholderPatterns.some(p => pricingDeepDive.toLowerCase().includes(p))) return true;
  if (pricingDeepDive.length < 30) return true;
  if (placeholderPatterns.some(p => verdict.toLowerCase().includes(p))) return true;

  if (Array.isArray(insiderTips)) {
    if (insiderTips.length === 0) return true;
    const allGeneric = insiderTips.every(
      (tip: unknown) => typeof tip === 'string' && placeholderPatterns.some(p => (tip as string).toLowerCase().includes(p))
    );
    if (allGeneric) return true;
  }

  // Reject deal scores of 0 (likely parsing error)
  if (typeof dealAnalysis.dealScore === 'number' && dealAnalysis.dealScore === 0) return true;

  return false;
}

/**
 * Repairs degraded heuristic output to meet minimum quality standards.
 */
export function repairHeuristicOutput(result: Record<string, unknown>): Record<string, unknown> {
  const repaired = { ...result };
  const pricingDeepDive = String(repaired.pricingDeepDive ?? '');
  if (pricingDeepDive.length < 30) {
    repaired.pricingDeepDive = 'Cruise-specific pricing analysis based on historical data and current market conditions.';
  }
  if (String(repaired.verdict ?? '') === 'Manual review recommended') {
    repaired.verdict = 'Average value - monitor for price drops';
  }
  if (Array.isArray(repaired.insiderTips) && repaired.insiderTips.length === 0) {
    repaired.insiderTips = ['Monitor this sailing for price drops - historical patterns suggest promotions every 4-8 weeks.'];
  }
  return repaired;
}

export interface EnhancedPriceForecastResult {
  cabinForecasts: Array<{
    cabinType: string;
    currentPrice: number;
    forecast7d: number;
    forecast30d: number;
    confidence: number;
    trend: 'rising' | 'falling' | 'stable';
  }>;
  optimalBookingWindow?: string;
  competingSailings?: CompetingSailingData[];
  alerts?: Array<{
    cabinType: string;
    triggerPrice: number;
    currentPrice: number;
    savings: number;
  }>;
  trendContext?: {
    direction: 'rising' | 'falling' | 'stable';
    magnitude: number;
    windows: Array<{ period: string; direction: string; magnitude: number; snapshots: number }>;
  };
  seasonalIndicator?: 'peak' | 'shoulder' | 'low' | 'unknown';
  rateLock?: {
    expiresAt?: string;
    minutesRemaining?: number;
    urgency: 'critical' | 'high' | 'moderate' | 'low';
  };
  is_heuristic: boolean;
}

/* ====================================================================== */
/*  ENHANCED DEAL ANALYSIS — 6 CRUISE-SPECIFIC DIMENSIONS                  */
/* ====================================================================== */

const ENHANCED_DEAL_SYSTEM_PROMPT =
  'You are the TripTide Insider, a cruise industry analyst with exclusive access to real-time pricing data, ' +
  'historical trends, and inventory intelligence. You do NOT give generic cruise advice. Every word you write ' +
  'is specific to THIS EXACT sailing: this ship by name, this departure date, this exact route, this cruise line. ' +
  'Do NOT write "this sailing" — name the ship and cruise line. ' +
  'Do NOT write "this route" — name the destination and ports. ' +
  'Do NOT write "this booking window" — say the number of days until departure. ' +
  'You provide insight dimensions that no booking site will show: deal score, pricing deep-dive, price trend, ' +
  'inventory intelligence, pricing strategy, ship value score, itinerary value, hidden cost breakdown, ' +
  'cabin value comparison, insider tips, and a bottom-line verdict. ' +
  'You also generate a single-paragraph justification explaining the deal score with real numbers from data, ' +
  'a per-cabin value breakdown with ratings (Excellent/Great/Good/Fair/Overpriced), and data-driven insider tips. ' +
  'IMPORTANT FORMATTING RULES: ' +
  'Do NOT use em dashes (—) or en dashes (–). Use commas, colons, or periods instead. ' +
  'Every sentence must begin with a capital letter. ' +
  'Write in a conversational, human tone — sound like an experienced cruise agent who has booked this exact sailing. ' +
  'Avoid generic phrases like "monitor for sales," "book early to secure," "standard cruise line." ' +
  'Use proper capitalization for all cruise line names, ship names, port names, and destination names. ' +
  'Insider tips must name the ship, mention specific ports or seasons, and give real dollar amounts. ' +
  'Every sentence in insider tips must be specific to THIS EXACT sailing — no copy-paste advice. ' +
  'Respond ONLY with valid JSON. No markdown, no code fences, no explanation.';

const ENHANCED_DEAL_USER_TEMPLATE = (ctx: SailingContext) => {
  const pricingLines = Object.entries(ctx.currentPricing)
    .map(([cabin, price]) => `  - ${cabin}: $${price.toLocaleString()} (2 passengers)`)
    .join('');

  const historyLines = ctx.priceHistory.length > 0
    ? ctx.priceHistory.slice(0, 15).map(h => `  - ${h.cabinType}: $${h.price.toLocaleString()} on ${h.date}`).join('')
    : '  No pricing history available';

  const shipInfo = ctx.shipDetails
    ? `SHIP DETAILS: Built ${ctx.shipDetails.yearBuilt || 'N/A'} | ${ctx.shipDetails.passengerCapacity || 'N/A'} passengers | ${ctx.shipDetails.tonnage || 'N/A'} tons | Rating: ${ctx.shipDetails.rating || 'N/A'}/10 | Restaurants: ${(ctx.shipDetails.restaurants || []).length} | Pools: ${ctx.shipDetails.pools || 0} | Amenities: ${(ctx.shipDetails.amenities || []).length}`
    : 'SHIP DETAILS: Not available in our database';

  const destInfo = ctx.destinationInsight
    ? `DESTINATION INSIGHTS: Regional avg PPD $${ctx.destinationInsight.avgPricePpd || 'N/A'} | Best value months: ${(ctx.destinationInsight.bestValueMonths || []).join(', ') || 'N/A'} | Peak months: ${(ctx.destinationInsight.peakSeasonMonths || []).join(', ') || 'N/A'} | Trend: ${ctx.destinationInsight.priceTrend || 'N/A'}`
    : 'DESTINATION INSIGHTS: No regional data available';

  const marketInfo = ctx.marketComparison
    ? `MARKET BENCHMARK: ${ctx.cruiseLine} avg PPD $${ctx.marketComparison.avgPricePpd || 'N/A'} | Line rating: ${ctx.marketComparison.overallRating || 'N/A'}/100 | Best-value rating: ${ctx.marketComparison.bestValueRating || 'N/A'}/100`
    : `MARKET BENCHMARK: No ${ctx.cruiseLine} market data available`;

  const cabinCatInfo = ctx.cabinCategories && ctx.cabinCategories.length > 0
    ? `CABIN CATEGORIES: ${ctx.cabinCategories.join(', ')}`
    : `CABIN CATEGORIES: Standard categories (Inside, Oceanview, Balcony, Suite)`;

  const daysUntilDeparture = Math.ceil(
    (new Date(ctx.departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Per-cruise-line gratuity rates
  const gratuitiesPerDay = getGratuityRate(ctx.cruiseLine);
  const totalGratuities = Math.round(gratuitiesPerDay * ctx.durationDays * 2);
  const wifiCost = Math.round(12 * ctx.durationDays * 2); // 2 passengers
  const realTotalCost = Math.round(Object.values(ctx.currentPricing)[0] || 0) + totalGratuities + wifiCost;

  // Per-cabin value breakdown
  const insidePrice = ctx.currentPricing['Inside'] ?? ctx.currentPricing['Oceanview'] ?? 0;
  const perNightPrices: Record<string, number> = {};
  for (const [cabin, price] of Object.entries(ctx.currentPricing)) {
    perNightPrices[cabin] = Math.round(price / ctx.durationDays / 2);
  }

  const itineraryStr = Array.isArray(ctx.itinerary) ? ctx.itinerary.join(' \u2192 ') : (ctx.itinerary || 'N/A');
  const portCount = Array.isArray(ctx.itinerary) ? ctx.itinerary.filter((p: string) => p !== 'at sea').length : 0;
  const costPerPort = portCount > 0 ? Math.round(realTotalCost / portCount) : 0;

  // Personalization context
  const tripTypeHint = ctx.tripType ? `Traveler profile: ${ctx.tripType}` : '';
  const cabinPriorityHint = ctx.cabinPriorities && ctx.cabinPriorities.length > 0
    ? `Preferred cabins (in order): ${ctx.cabinPriorities.join(', ')}`
    : '';

  const promptParts: string[] = [];
  promptParts.push(`You are analyzing this EXACT cruise sailing. The traveler is a ${ctx.tripType || 'leisure'} traveler`);
  if (ctx.cabinPriorities && ctx.cabinPriorities.length > 0) {
    promptParts.push(`who prefers these cabin types: ${ctx.cabinPriorities.join(', ')}.`);
  } else {
    promptParts.push('.');
  }
  promptParts.push('Your analysis must be specific to THIS EXACT sailing - never generic.');
  promptParts.push('');

  promptParts.push(`THIS SAILING: ${ctx.cruiseLine} ${ctx.shipName}`);
  promptParts.push(`- Duration: ${ctx.durationDays} nights | Route: ${itineraryStr}`);
  promptParts.push(`- Departure: ${ctx.departurePort} on ${ctx.departureDate} (${daysUntilDeparture} days from now)`);
  promptParts.push(`- Destination: ${ctx.destinationRegion || 'N/A'} | Ports: ${portCount}`);
  promptParts.push(`- Cost per port: $${costPerPort}`);
  promptParts.push('');

  if (pricingLines) {
    promptParts.push('CURRENT PRICING (per cabin, 2 passengers):');
    promptParts.push(pricingLines);
    promptParts.push('');
  }

  if (ctx.priceHistory.length > 0) {
    promptParts.push(`PRICING HISTORY (last ${Math.min(ctx.priceHistory.length, 15)} snapshots):`);
    promptParts.push(historyLines);
    promptParts.push('');
  }

  promptParts.push(shipInfo);
  promptParts.push(destInfo);
  promptParts.push(marketInfo);
  promptParts.push('');
  promptParts.push(`HIDDEN COSTS (NOT included in listed price):`);
  promptParts.push(`- Gratuities: $${gratuitiesPerDay}/day x ${ctx.durationDays} days x 2 = $${totalGratuities}`);
  promptParts.push(`- Wi-Fi: ~$${wifiCost} for ${ctx.durationDays} nights (2 passengers)`);
  promptParts.push(`- Real total (Inside cabin): $${realTotalCost.toLocaleString()}`);
  promptParts.push(`- Cost per port: $${costPerPort}`);
  promptParts.push('');

  promptParts.push('Generate exactly this JSON. EVERY field MUST be specific to THIS sailing:');
  promptParts.push('');
  promptParts.push('{');
  promptParts.push(`  "dealScore": 0-100,`);
  promptParts.push(`  "pricingDeepDive": "3-4 sentences analyzing THIS sailing with actual $ amounts and % from data.",`);
  promptParts.push(`  "priceTrend": "rising|falling|stable",`);
  promptParts.push(`  "justification": "Single comprehensive paragraph explaining the deal score. Include: PPD analysis, price trend, cabin variety signal, destination context, cruise line strategy. Make it compelling for a traveler.",`);
  promptParts.push(`  "inventoryIntelligence": "Which cabins on THIS sailing sell fast/slow? Reference ${daysUntilDeparture} days until departure.",`);
  promptParts.push(`  "pricingStrategy": "What strategy is ${ctx.cruiseLine} using on THIS sailing? Reference actual numbers.",`);
  promptParts.push(`  "shipValueScore": 0-100,`);
  promptParts.push(`  "itineraryValue": "Cost-per-port for THIS route. Which ports add value? $${costPerPort}/port.",`);
  promptParts.push(`  "hiddenCosts": {`);
  promptParts.push(`    "mandatoryGratuities": ${totalGratuities},`);
  promptParts.push(`    "wifiCost": ${wifiCost},`);
  promptParts.push(`    "resortFees": 0,`);
  promptParts.push(`    "realTotalCost": ${realTotalCost}`);
  promptParts.push(`  },`);
  promptParts.push(`  "cabinValueBreakdown": {`);
  promptParts.push(`    "Inside": { "perNight": ${perNightPrices['Inside'] || 0}, "valueRating": "Fair|Good|Great|Excellent|Overpriced" },`);
  if (perNightPrices['Oceanview']) promptParts.push(`    "Oceanview": { "perNight": ${perNightPrices['Oceanview']}, "valueRating": "Fair|Good|Great|Excellent|Overpriced" },`);
  if (perNightPrices['Balcony']) promptParts.push(`    "Balcony": { "perNight": ${perNightPrices['Balcony']}, "valueRating": "Fair|Good|Great|Excellent|Overpriced" },`);
  if (perNightPrices['Suite']) promptParts.push(`    "Suite": { "perNight": ${perNightPrices['Suite']}, "valueRating": "Fair|Good|Great|Excellent|Overpriced" },`);
  promptParts.push(`  },`);
  promptParts.push(`  "insiderTips": [`);
  promptParts.push(`    "Specific cabin recommendation for THIS ship (which decks to avoid/request)",`);
  promptParts.push(`    "Timing advice specific to THIS route and departure month",`);
  promptParts.push(`    "One lesser-known fact about THIS ship or cruise line"`);
  promptParts.push(`  ],`);
  promptParts.push(`  "verdict": "Bottom-line: would YOU book? Why or why not? Be opinionated."`);
  promptParts.push(`}`);
  promptParts.push('');
  promptParts.push('CRITICAL RULES:');
  promptParts.push('- ALL fields must be specific to THIS EXACT sailing - no generic cruise advice');
  promptParts.push('- justification MUST explain the score in plain language with numbers from the data');
  promptParts.push('- cabinValueBreakdown MUST rate each cabin type based on per-night value vs destination benchmarks');
  promptParts.push('- hiddenCosts MUST use the actual calculated amounts provided above');
  promptParts.push('- insiderTips MUST mention THIS ship by name and be specific to the route/date');
  promptParts.push('- All numbers must be derived from the data provided, not invented');
  promptParts.push('');
  promptParts.push('Return ONLY the JSON object - no other text.');

  return promptParts.join('');
};

/**
 * Generate enhanced deal analysis for a single sailing.
 * Uses OpenCode AI with heuristic fallback.
 */
export async function generateEnhancedDealAnalysis(
  sailingContext: SailingContext,
  forceRefresh = false
): Promise<EnhancedDealAnalysisResult> {
  const pool = getPool();
  const id = sailingContext.sailingId;

  if (!forceRefresh) {
    const cached = await pool.query(
      'SELECT deal_analysis FROM sailings WHERE id = $1 AND deal_analysis IS NOT NULL',
      [id]
    );
    if (cached.rows.length > 0 && cached.rows[0].deal_analysis) {
      try {
        const parsed = JSON.parse(cached.rows[0].deal_analysis);
        if (parsed.dealScore !== undefined && !isDealAnalysisStale(parsed)) {
          console.log(`[ENHANCED] Using valid cached deal analysis for sailing ${id}`);
          return parsed as EnhancedDealAnalysisResult;
        } else {
          console.log(`[ENHANCED] Cached deal analysis for sailing ${id} is stale/degraded, regenerating...`);
        }
      } catch {
        // Fall through to regeneration
      }
    }
  }

  console.log(`[ENHANCED] Generating deal analysis for sailing ${id} (${sailingContext.cruiseLine} - ${sailingContext.shipName})...`);

  try {
    const userPrompt = ENHANCED_DEAL_USER_TEMPLATE(sailingContext);

    const result = await callOpenRouter(
      [
        { role: 'system', content: ENHANCED_DEAL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { max_tokens: 2048, temperature: 0.2 }
    );

    const parsed = parseEnhancedDealJson(result);
    const sanitized = sanitizeDealAnalysisObject(parsed as unknown as Record<string, unknown>) as unknown as EnhancedDealAnalysisResult;

    await pool.query(
      'UPDATE sailings SET deal_analysis = $1, deal_analysis_generated_at = NOW() WHERE id = $2',
      [JSON.stringify(sanitized), id]
    );

    console.log(`[ENHANCED] Deal analysis generated for sailing ${id}: score=${sanitized.dealScore}, heuristic=${sanitized.is_heuristic}`);
    return sanitized;

  } catch (err: any) {
    console.warn(`[ENHANCED] AI call failed for sailing ${id}: ${err.message}. Using heuristic fallback.`);
    const heuristic = generateHeuristicEnhancedDeal(sailingContext);
    const repaired = repairHeuristicOutput(heuristic as unknown as Record<string, unknown>);
    const sanitizedHeuristic = sanitizeDealAnalysisObject(repaired) as unknown as EnhancedDealAnalysisResult;

    await pool.query(
      'UPDATE sailings SET deal_analysis = $1, deal_analysis_generated_at = NOW() WHERE id = $2',
      [JSON.stringify(sanitizedHeuristic), id]
    );

    return sanitizedHeuristic as EnhancedDealAnalysisResult;
  }
}

function parseEnhancedDealJson(raw: string): EnhancedDealAnalysisResult {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    const parsed = JSON.parse(cleaned);
    
    const justificationRaw = String(parsed.justification || 'Analysis unavailable');
    const insiderTipsRaw = Array.isArray(parsed.insiderTips) ? parsed.insiderTips.slice(0, 5) : [];
    
    return {
      dealScore: Math.max(0, Math.min(100, Number(parsed.dealScore) || 50)),
      pricingDeepDive: String(parsed.pricingDeepDive || 'Analysis unavailable'),
      priceTrend: ['rising', 'falling', 'stable'].includes(parsed.priceTrend) ? parsed.priceTrend : 'stable',
      inventoryIntelligence: String(parsed.inventoryIntelligence || ''),
      pricingStrategy: String(parsed.pricingStrategy || ''),
      shipValueScore: typeof parsed.shipValueScore === 'number' ? Math.max(0, Math.min(100, parsed.shipValueScore)) : undefined,
      itineraryValue: String(parsed.itineraryValue || ''),
      justification: formatJustification(justificationRaw),
      cabinValueBreakdown: parsed.cabinValueBreakdown as EnhancedDealAnalysisResult['cabinValueBreakdown'] | undefined,
      hiddenCosts: parsed.hiddenCosts as EnhancedDealAnalysisResult['hiddenCosts'] | undefined,
      insiderTips: formatInsiderTips(insiderTipsRaw),
      verdict: String(parsed.verdict || 'Manual review recommended'),
      is_heuristic: false,
    };
  } catch {
    return generateHeuristicEnhancedDeal({} as SailingContext);
  }
}

export function generateHeuristicEnhancedDeal(ctx: SailingContext): EnhancedDealAnalysisResult {
  const duration = ctx.durationDays;
  const daysUntilDeparture = Math.ceil((new Date(ctx.departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Guard: priceHistory and currentPricing may be undefined when called with empty context
  const priceHistory = ctx.priceHistory ?? [];
  const currentPricing = ctx.currentPricing ?? {};

  // Compute per-cabin trends from price history
  const cabinTrends: Array<{direction: 'rising' | 'falling' | 'stable'; magnitude: number}> = [];
  for (const historyEntry of priceHistory) {
    const price = historyEntry.price;
    if (!historyEntry.price) continue;
    // Simple trend based on price history
    const isFirst = historyEntry === priceHistory[0];
    const isLast = historyEntry === priceHistory[priceHistory.length - 1];
    if (priceHistory.length >= 2) {
      const first = priceHistory[0].price;
      const last = priceHistory[priceHistory.length - 1].price;
      const mag = Math.abs(((last - first) / first) * 100);
      const direction = last > first ? 'rising' : last < first ? 'falling' : 'stable';
      if (mag > 3) cabinTrends.push({ direction, magnitude: mag });
    }
  }

  // Determine overall price trend
  let priceTrend: 'rising' | 'falling' | 'stable' = 'stable';
  let trendMagnitude = 0;
  if (cabinTrends.length > 0) {
    const risingCount = cabinTrends.filter(t => t.direction === 'rising').length;
    const fallingCount = cabinTrends.filter(t => t.direction === 'falling').length;
    const dominant = risingCount > fallingCount ? 'rising' : fallingCount > risingCount ? 'falling' : 'stable';
    const matching = cabinTrends.filter(t => t.direction === dominant);
    trendMagnitude = matching.reduce((sum, t) => sum + t.magnitude, 0) / matching.length;
    priceTrend = dominant;
  }

  // Get current prices and PPD
  const insidePrice = currentPricing['Inside'] ?? currentPricing['Oceanview'] ?? currentPricing['Balcony'] ?? 150;
  const ppd = insidePrice / 2 / duration;
  const itinerary = Array.isArray(ctx.itinerary) ? ctx.itinerary : [];
  const portCount = itinerary.filter((p: string) => p !== 'at sea').length;

  // Destination classification
  const destLower = (ctx.destinationRegion || '').toLowerCase();
  let destType = 'standard';
  if (destLower.includes('east caribbean') || destLower.includes('bahamas') || destLower.includes('balearic') || destLower.includes('iceland')) {
    destType = 'short_caribbean';
  } else if (destLower.includes('west caribbean') || destLower.includes('central americas')) {
    destType = 'west_caribbean';
  } else if (destLower.includes('alaska')) {
    destType = 'alaska';
  } else if (destLower.includes('med') || destLower.includes('greek islands') || destLower.includes('patmos') || destLower.includes('marseille') || destLower.includes('barcelona') || destLower.includes('italy') || destLower.includes('romania') || destLower.includes('greece')) {
    destType = 'mediterranean';
  } else {
    destType = 'premium';
  }

  // Factor 1: Price-per-day (40 points)
  const scoreFactors: string[] = [];
  let ppdFactor = 50;
  if (destType === 'short_caribbean' || destType === 'west_caribbean') {
    if (ppd < 100) { ppdFactor = Math.min(90, Math.round((ppd / 100) * 100)); scoreFactors.push('price below regional average'); }
    else if (ppd < 150) { ppdFactor = Math.min(75, 50 + Math.round((ppd - 100) / 50 * 25)); scoreFactors.push('price at regional average'); }
    else if (ppd < 200) { ppdFactor = Math.min(60, 50 + Math.round((ppd - 150) / 50 * 10)); scoreFactors.push('price slightly above regional average'); }
    else { ppdFactor = Math.min(40, 50 - 10); scoreFactors.push('price above regional average'); }
  } else if (destType === 'alaska') {
    if (ppd < 180) { ppdFactor = Math.min(85, 50 + Math.round((ppd - 180) / 20 * 35)); scoreFactors.push('price well below Alaska average'); }
    else if (ppd < 250) { ppdFactor = Math.min(70, 50 + Math.round((ppd - 225) / 25 * 20)); scoreFactors.push('price near Alaska average'); }
    else if (ppd < 300) { ppdFactor = Math.min(55, 50 + Math.round((ppd - 275) / 25 * 5)); scoreFactors.push('price slightly above Alaska average'); }
    else { ppdFactor = Math.min(35, 50 - 15); scoreFactors.push('price significantly above Alaska average'); }
  } else if (destType === 'mediterranean') {
    if (ppd < 150) { ppdFactor = Math.min(75, 50 + Math.round((ppd - 150) / 50 * 25)); scoreFactors.push('price below Mediterranean average'); }
    else if (ppd < 200) { ppdFactor = Math.min(65, 50 + Math.round((ppd - 175) / 25 * 15)); scoreFactors.push('price at Mediterranean average'); }
    else if (ppd < 250) { ppdFactor = Math.min(55, 50 + Math.round((ppd - 225) / 25 * 10)); scoreFactors.push('price slightly above Mediterranean average'); }
    else { ppdFactor = Math.min(40, 50 - 10); scoreFactors.push('price above Mediterranean average'); }
  } else {
    if (ppd < 120) { ppdFactor = Math.min(95, 50 + Math.round((ppd - 120) / 60 * 45)); scoreFactors.push('price well below average'); }
    else if (ppd < 180) { ppdFactor = Math.min(80, 50 + Math.round((ppd - 150) / 30 * 30)); scoreFactors.push('price at average'); }
    else if (ppd < 250) { ppdFactor = Math.min(65, 50 + Math.round((ppd - 200) / 50 * 15)); scoreFactors.push('price slightly above average'); }
    else { ppdFactor = Math.min(45, 50 - 5); scoreFactors.push('price above average'); }
  }

  // Factor 2: Price trend direction (30 points)
  let trendFactor = 50;
  const trendNotes: string[] = [];
  if (daysUntilDeparture > 90) {
    if (priceTrend === 'falling') { trendFactor = Math.min(80, 50 + Math.round(trendMagnitude * 3)); trendNotes.push('falling prices early in booking window'); }
    else if (priceTrend === 'rising') { trendFactor = Math.min(65, 50 + Math.round(trendMagnitude * 1.5)); trendNotes.push('rising prices early in booking window'); }
    else { trendFactor = 55; trendNotes.push('stable - prices still finding equilibrium'); }
  } else if (daysUntilDeparture < 14) {
    if (priceTrend === 'falling') { trendFactor = Math.min(40, 50 + Math.round(trendMagnitude * 0.5)); trendNotes.push('falling - rare last-minute drop'); }
    else if (priceTrend === 'rising') { trendFactor = Math.min(85, 50 + Math.round(trendMagnitude * 2)); trendNotes.push('prices climbing - last-minute surge common'); }
    else { trendFactor = 65; trendNotes.push('stable at last-minute'); }
  } else {
    if (priceTrend === 'falling') { trendFactor = Math.min(90, 50 + Math.round(trendMagnitude * 2.5)); trendNotes.push('prices dropping - strong signal to book'); }
    else if (priceTrend === 'rising') { trendFactor = Math.min(35, 50 - Math.round(trendMagnitude * 1.5)); trendNotes.push('prices rising - likely to climb further'); }
    else { trendFactor = 50; trendNotes.push('stable - no clear trend direction'); }
  }

  // Factor 3: Cabin variety (10 points)
  const cabinVarietyFactor = Object.keys(currentPricing).length >= 4 ? 90 :
                              Object.keys(currentPricing).length >= 3 ? 75 :
                              Object.keys(currentPricing).length >= 2 ? 60 : 40;

  // Factor 4: Duration value (10 points)
  let durationFactor = 50;
  if (duration >= 10) { durationFactor = Math.min(80, 50 + Math.round((duration - 7) / 3 * 30)); scoreFactors.push(`extended ${duration}-night voyage`); }
  else if (duration === 7) { durationFactor = 55; scoreFactors.push('classic 7-night itinerary'); }
  else if (duration >= 5 && duration <= 9) { durationFactor = 60; scoreFactors.push(`solid ${duration}-night duration`); }
  else if (duration >= 3 && duration <= 4) { durationFactor = 40; scoreFactors.push(`${duration}-night short cruise`); }
  else { durationFactor = 35; scoreFactors.push(`${duration}-night brief sailing`); }

  // Factor 5: Destination context (15 points)
  let destinationFactor = 50;
  if (destType === 'short_caribbean' || destType === 'west_caribbean') {
    destinationFactor = ppd < 140 ? 90 : ppd < 180 ? 75 : ppd < 220 ? 60 : 45;
    scoreFactors.push(`Caribbean at ${ppd < 160 ? 'good' : 'average'} value (${duration}-night)`);
  } else if (destType === 'alaska') {
    destinationFactor = ppd < 220 ? 95 : ppd < 280 ? 80 : ppd < 340 ? 65 : 50;
    scoreFactors.push(`Alaska at ${ppd < 250 ? 'good' : 'average'} value (${duration}-night)`);
  } else if (destType === 'mediterranean') {
    destinationFactor = ppd < 180 ? 85 : ppd < 220 ? 70 : ppd < 260 ? 55 : 40;
    scoreFactors.push(`Mediterranean at ${ppd < 200 ? 'good' : 'average'} value (${duration}-night)`);
  } else {
    destinationFactor = ppd < 250 ? 80 : ppd < 300 ? 65 : 50;
    scoreFactors.push(`Premium/standard at ${ppd < 275 ? 'good' : 'average'} value (${duration}-night)`);
  }

  // Factor 6: Cruise line strategy (15 points)
  const cruiseLine = (ctx.cruiseLine || '').toLowerCase();
  let cruiseLineStrategyFactor = 50;
  if (cruiseLine.includes('royal caribbean') || cruiseLine.includes('celebrity')) {
    cruiseLineStrategyFactor = 60; scoreFactors.push('premium brand - quality-to-price ratio favorable at lower PPD');
  } else if (cruiseLine.includes('carnival') || cruiseLine.includes('norwegian')) {
    cruiseLineStrategyFactor = 55; scoreFactors.push('mainstream brand - aggressive discounting creates value signals');
  } else {
    scoreFactors.push('standard cruise line - typical market dynamics');
  }

  // Combine factor scores with weights
  let rawScore =
    ppdFactor * 0.40 +
    trendFactor * 0.30 +
    cabinVarietyFactor * 0.10 +
    durationFactor * 0.10 +
    destinationFactor * 0.15 +
    cruiseLineStrategyFactor * 0.15;

  // Cruise line bonus
  let cruiseLineBonus = 0;
  if (cruiseLine.includes('royal caribbean') || cruiseLine.includes('celebrity') || cruiseLine.includes('regent')) {
    cruiseLineBonus = 5;
  } else if (cruiseLine.includes('carnival') || cruiseLine.includes('norwegian')) {
    cruiseLineBonus = 3;
  }

  let dealScore = Math.round(rawScore + cruiseLineBonus);
  dealScore = Math.max(0, Math.min(100, dealScore));

  const verdict = dealScore >= 80 ? 'Excellent deal - book now before inventory disappears' :
                  dealScore >= 70 ? 'Strong buy - very good value for this route' :
                  dealScore >= 60 ? 'Good deal - solid value, consider booking soon' :
                  dealScore >= 50 ? 'Fair value - average pricing, monitor for drops' :
                  'Below average - prices are elevated, wait for sales';

  // Hidden costs
  const gratuitiesPerDay = getGratuityRate(cruiseLine);
  const totalGratuities = Math.round(gratuitiesPerDay * duration * 2);
  const wifiCostCalc = Math.round(12 * duration * 2);
  const realTotal = insidePrice + totalGratuities + wifiCostCalc;

  // Per-cabin value breakdown
  const cabinValueBreakdown: Record<string, { perNight: number; valueRating: string }> = {};
  for (const [cabinType, price] of Object.entries(currentPricing)) {
    const perNight = Math.round(price / duration / 2);
    let rating: string;
    if (perNight < 100) rating = 'Excellent';
    else if (perNight < 150) rating = 'Great';
    else if (perNight < 200) rating = 'Good';
    else if (perNight < 250) rating = 'Fair';
    else rating = 'Overpriced';
    cabinValueBreakdown[cabinType] = { perNight, valueRating: rating };
  }

  // Insider tips — data-driven
  const insiderTipsRaw: string[] = [];
  if (priceTrend === 'falling' && trendMagnitude > 5) {
    insiderTipsRaw.push(`Prices have dropped ${trendMagnitude.toFixed(1)}% - this trend typically continues until ~45 days before departure; book now for best rates`);
  }
  if (priceTrend === 'rising' && trendMagnitude > 3) {
    insiderTipsRaw.push(`Prices climbing ${trendMagnitude.toFixed(1)}% - lock in now before the climb accelerates`);
  }
  if (cabinValueBreakdown['Inside'] && cabinValueBreakdown['Balcony']) {
    const insidePPN = cabinValueBreakdown['Inside'].perNight;
    const balconyPPN = cabinValueBreakdown['Balcony'].perNight;
    const upgradeCost = balconyPPN - insidePPN;
    if (upgradeCost < 40) {
      insiderTipsRaw.push(`Upgrading from Inside to Balcony costs just $${upgradeCost.toFixed(0)}/night - exceptional upgrade value on this sailing`);
    } else {
      insiderTipsRaw.push(`Inside cabins at $${insidePPN}/night offer the best base value; Balcony upgrade adds $${upgradeCost.toFixed(0)}/night`);
    }
  }
  if (duration >= 7 && realTotal > 0) {
    insiderTipsRaw.push(`Real total cost with gratuities ($${totalGratuities}) and Wi-Fi ($${wifiCostCalc}) adds $${totalGratuities + wifiCostCalc} - your actual out-the-door price is $${realTotal.toLocaleString()}, not the listed $${insidePrice.toLocaleString()}`);
  }
  if (insiderTipsRaw.length === 0) {
    const ppdLabel = destType === 'premium' ? 'premium per-day rate' : 'competitive per-day rate';
    insiderTipsRaw.push(`At $${ppd.toFixed(0)}/person/night (${ppdLabel} for ${duration}-night ${ctx.destinationRegion || 'this destination'}), this is a reasonable entry point; monitor for sales`);
    insiderTipsRaw.push(`Historical pattern: ${ctx.cruiseLine || 'this cruise line'} typically runs promotions every 4-8 weeks - check back for drops`);
  }

  // Justification (formatted into structured sections)
  const rawJustification = `Score of ${dealScore}/100 based on weighted factors: ${scoreFactors.join('; ')}. ` +
    `Inside cabin at $${insidePrice.toLocaleString()} total ($${(insidePrice / 2).toFixed(0)}/person, $${ppd.toFixed(0)}/person/day). ` +
    `Price trend: ${priceTrend} (${trendNotes.length > 0 ? trendNotes.join(', ') : 'no trend data available'}). ` +
    `In ${Object.keys(currentPricing).length} cabin types tracked. Duration: ${duration} nights. ` +
    `Destination: ${ctx.destinationRegion || 'this destination'}. ` +
    `Cruise line: ${ctx.cruiseLine}. ` +
    `Port count: ${portCount > 0 ? portCount : 'N/A'}. ` +
    `Real total cost with gratuities and Wi-Fi: $${realTotal.toLocaleString()}.`;
  const justificationSections = formatJustification(rawJustification);

  // Pricing deep dive
  const pricingDeepDiveEntries = Object.entries(currentPricing).map(([k, v]) => {
    const perPerson = Math.round(v / 2);
    const perNight = Math.round(v / 2 / duration);
    return `${k}: $${v.toLocaleString()} ($${perPerson}/person, $${perNight}/night)`;
  }).join('; ');

  const pricingDeepDive = `${ctx.cruiseLine} ${ctx.shipName} ${duration}-night ${ctx.destinationRegion || ''} sailing from ${ctx.departurePort || 'homeport'}. ` +
    `${pricingDeepDiveEntries}. ` +
    `Price trend: ${priceTrend} (${priceTrend === 'falling' ? 'dropping' : priceTrend === 'rising' ? 'rising' : 'stable'}) based on ${cabinTrends.length} cabin-type trend points.`;

  // Inventory intelligence
  const inventoryIntelligence = `${Object.keys(currentPricing).length} cabin types available. ${daysUntilDeparture > 90 ? 'Plenty of time to find the best rate - prices typically drop 30-60 days before departure.' : daysUntilDeparture < 14 ? 'Last-minute availability - prices may be elevated or at a discount depending on occupancy.' : 'Moderate booking window - book soon for best selection.'}`;

  // Pricing strategy
  const pricingStrategy = `${ctx.cruiseLine} is pricing this ${duration}-night ${ctx.destinationRegion || 'cruise'} at $${ppd.toFixed(0)}/person/day. ${destinationFactor > 70 ? 'This represents good value compared to regional averages.' : 'Prices are near market average for this route.'} ${cruiseLine.includes('royal') || cruiseLine.includes('celebrity') ? 'Premium line with quality amenities to justify the price.' : 'Standard line with competitive pricing strategy.'}`;

  // Ship value score (simplified)
  const shipValueScore = 65 + (ctx.shipDetails ? 10 : 0) + (destType === 'premium' ? 5 : 0);

  // Itinerary value
  const costPerPort = portCount > 0 ? Math.round(realTotal / portCount) : Math.round(realTotal / 4);
  const itineraryValue = `Cost-per-port: $${costPerPort} (based on ${portCount > 0 ? portCount : 4} ports). ${costPerPort < 400 ? 'Excellent value per port stop.' : costPerPort < 600 ? 'Good value per port stop.' : 'Average value per port stop.'}`;

  return {
    justification: justificationSections,
    dealScore,
    pricingDeepDive,
    priceTrend,
    inventoryIntelligence,
    pricingStrategy,
    shipValueScore,
    itineraryValue,
    hiddenCosts: {
      mandatoryGratuities: totalGratuities,
      wifiCost: wifiCostCalc,
      resortFees: 0,
      realTotalCost: realTotal,
    },
    insiderTips: formatInsiderTips(insiderTipsRaw),
    verdict,
    cabinValueBreakdown,
    is_heuristic: true,
  };
}

/* ====================================================================== */
/*  ENHANCED PRICE FORECAST                                                */
/* ====================================================================== */

const ENHANCED_FORECAST_SYSTEM_PROMPT =
  'You are TripTide\'s senior price forecasting analyst. You predict where cruise prices are headed for a specific sailing, ' +
  'using historical volatility, seasonal patterns, cruise line pricing behavior, and competing sailings. ' +
  'Your forecasts are cabin-specific with confidence levels and multi-window trend context. ' +
  'You assess whether prices are likely to rise, fall, or stabilize, and by how much. ' +
  'You also identify optimal booking windows, seasonal timing signals, and rate-lock urgency. ' +
  'IMPORTANT FORMATTING RULES: ' +
  'Do NOT use em dashes (—) or en dashes (–). Use commas, colons, or periods instead. ' +
  'Every sentence must begin with a capital letter. ' +
  'Write in a conversational, human tone. Use proper capitalization for all names and destinations. ' +
  'Every forecast must reference the specific ship name, cruise line, and destination region. ' +
  'Do NOT say "the sailing" — name the ship and cruise line. ' +
  'Respond ONLY with valid JSON. No markdown, no code fences, no explanation.';

const ENHANCED_FORECAST_USER_TEMPLATE = (ctx: SailingContext, competitors: CompetingSailingData[]) => {
  const pricingLines = Object.entries(ctx.currentPricing)
    .map(([cabin, price]) => `  - ${cabin}: $${price.toLocaleString()} (2 passengers)`)
    .join('\n');

  const historyLines = ctx.priceHistory.length > 0
    ? ctx.priceHistory.slice(0, 15).map(h => `  - ${h.cabinType}: $${h.price.toLocaleString()} on ${h.date}`).join('\n')
    : '  No pricing history available';

  const daysUntilDeparture = Math.ceil(
    (new Date(ctx.departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Seasonal classification based on departure month
  const depMonth = new Date(ctx.departureDate).getMonth();
  const peakMonths = [5, 6, 7, 8]; // Summer
  const shoulderMonths = [4, 9, 10];
  const lowMonths = [0, 1, 2, 11]; // Winter
  const region = (ctx.destinationRegion || '').toLowerCase();
  let seasonalLabel = 'shoulder';
  if (region.includes('caribbean') || region.includes('bahamas')) {
    if (peakMonths.includes(depMonth)) seasonalLabel = 'peak';
    else if (shoulderMonths.includes(depMonth)) seasonalLabel = 'shoulder';
    else seasonalLabel = 'low';
  } else if (region.includes('mediterranean')) {
    if (peakMonths.includes(depMonth)) seasonalLabel = 'peak';
    else if (shoulderMonths.includes(depMonth) || depMonth === 10) seasonalLabel = 'shoulder';
    else seasonalLabel = 'low';
  } else if (region.includes('alaska')) {
    if (peakMonths.includes(depMonth)) seasonalLabel = 'peak';
    else if (shoulderMonths.includes(depMonth)) seasonalLabel = 'shoulder';
    else seasonalLabel = 'low';
  } else {
    seasonalLabel = 'unknown';
  }

  const competitorLines = competitors.length > 0
    ? competitors.map(c => {
        const delta = ctx.currentPricing['Balcony'] ? Math.round(c.balconyPrice - ctx.currentPricing['Balcony']) : 0;
        return `  - ${c.cruiseLine} ${c.shipName} (${c.departureDate}): Balcony $${c.balconyPrice.toLocaleString()} (delta: ${delta > 0 ? '+' : ''}$${delta.toLocaleString()})`;
      }).join('\n')
    : '  No competing sailings found';

  const tripTypeHint = ctx.tripType ? `\nThe traveler is a ${ctx.tripType} traveler.` : '';
  const cabinPriorityHint = ctx.cabinPriorities && ctx.cabinPriorities.length > 0
    ? ` Preferred cabins: ${ctx.cabinPriorities.join(', ')}.` : '';

  return `Forecast prices for this EXACT sailing. Use the historical data, seasonal patterns, and competing sailings to make data-driven predictions.

THIS SAILING:
- Cruise Line: ${ctx.cruiseLine}
- Ship: ${ctx.shipName}
- Duration: ${ctx.durationDays} nights
- Route: ${Array.isArray(ctx.itinerary) ? ctx.itinerary.join(' \u2192 ') : ctx.itinerary}
- Departure: ${ctx.departurePort} on ${ctx.departureDate} (${daysUntilDeparture} days from now)
- Destination: ${ctx.destinationRegion || 'N/A'}
- Season: ${seasonalLabel}
${tripTypeHint}${cabinPriorityHint}

CURRENT PRICING (2 passengers):
${pricingLines}

PRICING HISTORY (last ${Math.min(ctx.priceHistory.length, 15)} snapshots):
${historyLines}

COMPETING SAILINGS (same route, \u00b114 days):
${competitorLines}

Generate exactly this JSON structure:

{
  "cabinForecasts": [
    {
      "cabinType": "Inside|Oceanview|Balcony|Suite",
      "currentPrice": number,
      "forecast7d": number,
      "forecast30d": number,
      "confidence": 0-1,
      "trend": "rising|falling|stable"
    }
  ],
  "optimalBookingWindow": "string (e.g., '4-6 months before departure' or 'Now \u2014 prices rising')",
  "competingSailings": [
    {
      "sailingId": number,
      "cruiseLine": "string",
      "shipName": "string",
      "departureDate": "YYYY-MM-DD",
      "balconyPrice": number
    }
  ],
  "alerts": [
    {
      "cabinType": "string",
      "triggerPrice": number,
      "currentPrice": number,
      "savings": number
    }
  ],
  "trendContext": {
    "direction": "rising|falling|stable",
    "magnitude": "percentage move",
    "windows": [
      { "period": "4-week", "direction": "rising|falling|stable", "magnitude": "percent", "snapshots": number },
      { "period": "12-week", "direction": "rising|falling|stable", "magnitude": "percent", "snapshots": number },
      { "period": "24-week", "direction": "rising|falling|stable", "magnitude": "percent", "snapshots": number }
    ]
  },
  "seasonalIndicator": "peak|shoulder|low|unknown",
  "rateLock": {
    "urgency": "critical|high|moderate|low",
    "expiresAt": "ISO timestamp or null",
    "minutesRemaining": number or null
  },
  "is_heuristic": false
}

RULES:
- forecast7d and forecast30d MUST be based on historical volatility and seasonal patterns
- confidence MUST reflect data quality (more snapshots = higher confidence)
- optimalBookingWindow MUST be specific to THIS destination, THIS departure month, and current trend
- alerts SHOULD flag prices 15% below current as flash-sale thresholds
- competingSailings MUST include actual rival sailings with price deltas (computed from current pricing)
- trendContext MUST include 4-week, 12-week, and 24-week windows with direction and magnitude
- seasonalIndicator MUST reflect the departure month relative to destination patterns
- rateLock urgency: critical (<7 days), high (7-14), moderate (14-30), low (>30)

Return ONLY the JSON object \u2014 no other text.`;
};



/**
 * Generate enhanced price forecast for a single sailing.
 */
export async function generateEnhancedPriceForecast(
  sailingContext: SailingContext,
  competitors: CompetingSailingData[],
  forceRefresh = false
): Promise<EnhancedPriceForecastResult> {
  const pool = getPool();
  const id = sailingContext.sailingId;
  console.log('[GEN_FORECAST] Starting for sailing', id, 'forceRefresh=', forceRefresh);

  if (!forceRefresh) {
    const cached = await pool.query(
      'SELECT price_forecast FROM sailings WHERE id = $1 AND price_forecast IS NOT NULL',
      [id]
    );
    if (cached.rows.length > 0 && cached.rows[0].price_forecast) {
      try {
        const parsed = JSON.parse(cached.rows[0].price_forecast);
        if (parsed.cabinForecasts) {
          return parsed as EnhancedPriceForecastResult;
        }
      } catch {
        // Fall through to regeneration
      }
    }
  }

  console.log(`[ENHANCED] Generating price forecast for sailing ${id} (${sailingContext.cruiseLine} - ${sailingContext.shipName})...`);

  try {
    const userPrompt = ENHANCED_FORECAST_USER_TEMPLATE(sailingContext, competitors);

    const result = await callOpenRouter(
      [
        { role: 'system', content: ENHANCED_FORECAST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { max_tokens: 2048, temperature: 0.2 }
    );

    const parsed = parseEnhancedForecastJson(result);
    const sanitized = sanitizeDealAnalysisObject(parsed as unknown as Record<string, unknown>) as unknown as EnhancedPriceForecastResult;

    // Store in database
    await pool.query(
      'UPDATE sailings SET price_forecast = $1, price_forecast_generated_at = NOW() WHERE id = $2',
      [JSON.stringify(sanitized), id]
    );

    console.log(`[ENHANCED] Price forecast generated for sailing ${id}: ${sanitized.cabinForecasts.length} cabin types, heuristic=${sanitized.is_heuristic}`);
    return sanitized;

  } catch (err: any) {
    console.warn(`[ENHANCED] AI forecast call failed for sailing ${id}: ${err.message}. Using heuristic fallback.`);
    const heuristic = generateHeuristicEnhancedForecast(sailingContext, competitors);
    const sanitizedHeuristic = sanitizeDealAnalysisObject(heuristic as unknown as Record<string, unknown>) as unknown as EnhancedPriceForecastResult;

    await pool.query(
      'UPDATE sailings SET price_forecast = $1, price_forecast_generated_at = NOW() WHERE id = $2',
      [JSON.stringify(sanitizedHeuristic), id]
    );

    return heuristic;
  }
}

/**
 * Parse and validate enhanced price forecast JSON from AI response.
 */
function parseEnhancedForecastJson(raw: string): EnhancedPriceForecastResult {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      parsed = JSON.parse(arrayMatch[0]);
    } else {
      throw new Error('Could not parse enhanced price forecast JSON');
    }
  }

  // Normalize cabin forecasts
  const cabinForecasts: EnhancedPriceForecastResult['cabinForecasts'] = [];
  
  if (Array.isArray(parsed.cabinForecasts)) {
    for (const cf of parsed.cabinForecasts) {
      cabinForecasts.push({
        cabinType: String(cf.cabinType || 'Unknown'),
        currentPrice: Number(cf.currentPrice) || 0,
        forecast7d: Number(cf.forecast7d) || 0,
        forecast30d: Number(cf.forecast30d) || 0,
        confidence: Math.max(0, Math.min(1, Number(cf.confidence) || 0.5)),
        trend: ['rising', 'falling', 'stable'].includes(cf.trend) ? cf.trend : 'stable',
      });
    }
  }

  // Normalize competing sailings
  const competingSailings: CompetingSailingData[] = [];
  if (Array.isArray(parsed.competingSailings)) {
    for (const cs of parsed.competingSailings) {
      competingSailings.push({
        sailingId: Number(cs.sailingId) || 0,
        cruiseLine: String(cs.cruiseLine),
        shipName: String(cs.shipName),
        departureDate: String(cs.departureDate),
        balconyPrice: Number(cs.balconyPrice) || 0,
        priceDifference: typeof cs.priceDifference === 'number' ? cs.priceDifference : undefined,
      });
    }
  }

  // Normalize alerts
  const alerts: EnhancedPriceForecastResult['alerts'] = [];
  if (Array.isArray(parsed.alerts)) {
    for (const a of parsed.alerts) {
      alerts.push({
        cabinType: String(a.cabinType),
        triggerPrice: Number(a.triggerPrice) || 0,
        currentPrice: Number(a.currentPrice) || 0,
        savings: Number(a.savings) || 0,
      });
    }
  }

  // Normalize trend context
  let trendContext: EnhancedPriceForecastResult['trendContext'];
  if (parsed.trendContext && typeof parsed.trendContext === 'object') {
    const tc = parsed.trendContext;
    trendContext = {
      direction: ['rising', 'falling', 'stable'].includes(tc.direction) ? tc.direction : 'stable',
      magnitude: Number(tc.magnitude) || 0,
      windows: Array.isArray(tc.windows) ? tc.windows.map((w: any) => ({
        period: String(w.period || 'unknown'),
        direction: ['rising', 'falling', 'stable'].includes(w.direction) ? w.direction : 'stable',
        magnitude: Number(w.magnitude) || 0,
        snapshots: Number(w.snapshots) || 0,
      })) : [],
    };
  }

  return {
    cabinForecasts,
    optimalBookingWindow: typeof parsed.optimalBookingWindow === 'string' ? parsed.optimalBookingWindow : undefined,
    competingSailings: competingSailings.length > 0 ? competingSailings : undefined,
    alerts: alerts.length > 0 ? alerts : undefined,
    trendContext,
    seasonalIndicator: ['peak', 'shoulder', 'low', 'unknown'].includes(parsed.seasonalIndicator) ? parsed.seasonalIndicator : undefined,
    rateLock: parsed.rateLock && typeof parsed.rateLock === 'object' ? {
      expiresAt: typeof parsed.rateLock.expiresAt === 'string' ? parsed.rateLock.expiresAt : undefined,
      minutesRemaining: typeof parsed.rateLock.minutesRemaining === 'number' ? parsed.rateLock.minutesRemaining : undefined,
      urgency: ['critical', 'high', 'moderate', 'low'].includes(parsed.rateLock.urgency) ? parsed.rateLock.urgency : 'low',
    } : undefined,
    is_heuristic: parsed.is_heuristic === true ? true : false,
  };
}

/**
 * Heuristic fallback for enhanced price forecast when OpenCode AI is rate-limited.
 */
/**
 * Compute trend context with multi-window analysis (4/12/24 week windows).
 */
function computeTrendContext(ctx: SailingContext): {
  direction: 'rising' | 'falling' | 'stable';
  magnitude: number;
  windows: Array<{
    period: string;
    direction: string;
    magnitude: number;
    snapshots: number;
  }>;
} {
  const priceHistory = ctx.priceHistory;
  const now = Date.now();
  
  // Calculate windows
  const week4 = now - 4 * 7 * 24 * 60 * 60 * 1000;
  const week12 = now - 12 * 7 * 24 * 60 * 60 * 1000;
  const week24 = now - 24 * 7 * 24 * 60 * 60 * 1000;

  // Filter history by window
  const recent4 = priceHistory.filter(h => new Date(h.date).getTime() > week4);
  const recent12 = priceHistory.filter(h => new Date(h.date).getTime() > week12);
  const recent24 = priceHistory.filter(h => new Date(h.date).getTime() > week24);

  const computeWindowTrend = (history: Array<{price: number; date: string}>) => {
    if (history.length < 2) return { direction: 'stable', magnitude: 0 };
    const first = history[0].price;
    const last = history[history.length - 1].price;
    const mag = Math.abs(((last - first) / first) * 100);
    const direction = last > first ? 'rising' : last < first ? 'falling' : 'stable';
    return { direction, magnitude: Math.round(mag * 10) / 10 };
  };

  const window4 = computeWindowTrend(recent4);
  const window12 = computeWindowTrend(recent12);
  const window24 = computeWindowTrend(recent24);

  // Overall direction from longest window
  const { direction, magnitude } = computeWindowTrend(recent24.length > 0 ? recent24 : recent12.length > 0 ? recent12 : recent4);

  return {
    direction: direction as 'rising' | 'falling' | 'stable',
    magnitude,
    windows: [
      { period: '4 weeks', direction: window4.direction, magnitude: window4.magnitude, snapshots: recent4.length },
      { period: '12 weeks', direction: window12.direction, magnitude: window12.magnitude, snapshots: recent12.length },
      { period: '24 weeks', direction: window24.direction, magnitude: window24.magnitude, snapshots: recent24.length },
    ].filter(w => w.snapshots > 0), // Only include windows with data
  };
}

export function generateHeuristicEnhancedForecast(
  ctx: SailingContext,
  competitors: CompetingSailingData[]
): EnhancedPriceForecastResult {
  const cabinTypes = Object.keys(ctx.currentPricing);
  const daysUntil = Math.ceil(
    (new Date(ctx.departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Volatility increases as departure approaches
  const baseVolatility = 0.08;
  const urgencyMultiplier = daysUntil < 14 ? 1.5 : daysUntil < 30 ? 1.2 : daysUntil < 60 ? 1.0 : 0.8;
  const volatility = baseVolatility * urgencyMultiplier;

  // Trend factor: prices generally rise as departure approaches
  const trendFactor = daysUntil < 30 ? 1.15 : daysUntil < 60 ? 1.08 : daysUntil < 90 ? 1.04 : 1.02;

  // Confidence: higher for shorter forecasts, lower for less common cabin types
  const getConfidence = (cabinType: string): number => {
    const baseConfidence = daysUntil < 14 ? 0.6 : daysUntil < 30 ? 0.5 : daysUntil < 60 ? 0.4 : 0.3;
    // Suite has less data → lower confidence
    if (cabinType.toLowerCase().includes('suite')) return Math.max(0.2, baseConfidence - 0.1);
    // Inside has most data → higher confidence  
    if (cabinType.toLowerCase().includes('inside')) return Math.min(0.85, baseConfidence + 0.1);
    return baseConfidence;
  };

  const cabinForecasts: Array<{cabinType: string; currentPrice: number; forecast7d: number; forecast30d: number; confidence: number; trend: 'rising' | 'falling' | 'stable'}> = cabinTypes.map(cabinType => {
    const currentPrice = ctx.currentPricing[cabinType] || 1000;
    const cabinFactor = cabinType.toLowerCase().includes('suite') ? 1.2 : 
                       cabinType.toLowerCase().includes('balcony') ? 1.1 : 
                       cabinType.toLowerCase().includes('oceanview') ? 1.05 : 1.0;
    
    const forecast7d = Math.round(currentPrice * (1 + volatility * 0.5 * cabinFactor));
    const forecast30d = Math.round(currentPrice * trendFactor * cabinFactor);
    const confidence = getConfidence(cabinType);
    const trend: 'rising' | 'falling' | 'stable' = forecast7d > currentPrice * 1.03 ? 'rising' : forecast7d < currentPrice * 0.97 ? 'falling' : 'stable';

    return {
      cabinType,
      currentPrice,
      forecast7d,
      forecast30d,
      confidence,
      trend,
    };
  });

  // Generate price drop alerts
  const alerts = cabinForecasts.map(cf => ({
    cabinType: cf.cabinType,
    triggerPrice: Math.round(cf.currentPrice * 0.85), // Alert if price drops 15% below current
    currentPrice: cf.currentPrice,
    savings: Math.round(cf.currentPrice - Math.round(cf.currentPrice * 0.85)),
  })).filter(a => a.savings > 50); // Only show meaningful alerts

  // Determine optimal booking window based on days until departure and region
  const region = (ctx.destinationRegion || '').toLowerCase();
  let optimalWindow = '3-5 months before departure';
  if (region.includes('antarctica') || region.includes('galapagos')) optimalWindow = '12-18 months before departure';
  else if (region.includes('alaska') || region.includes('transatlantic')) optimalWindow = '6-9 months before departure';
  else if (region.includes('caribbean') || region.includes('bahamas')) optimalWindow = '4-6 months before departure';
  else if (region.includes('mediterranean')) optimalWindow = '5-7 months before departure';

  // Adjust based on days until departure
  if (daysUntil < 30) optimalWindow = 'Last-minute deals possible, monitor daily';
  else if (daysUntil < 60) optimalWindow = 'Booking window closing, prices likely rising';

  const competingSailings = competitors.map(c => ({
    sailingId: c.sailingId,
    cruiseLine: c.cruiseLine,
    shipName: c.shipName,
    departureDate: c.departureDate,
    balconyPrice: c.balconyPrice,
  }));

  // Rate lock calculation
  const minutesUntilRateLock = daysUntil < 14 ? 
    Math.max(60, daysUntil * 24 * 60) : 
    1440; // 24 hours otherwise
  const minutesRemaining = Math.round(minutesUntilRateLock);
  const rateLockUrgency = minutesRemaining < 720 ? 'critical' : 
                          minutesRemaining < 1440 ? 'high' : 
                          minutesRemaining < 2880 ? 'moderate' : 'low';
  const rateLockExpiresAt = new Date(Date.now() + minutesRemaining * 60000).toISOString();

  // Trend context with multi-window analysis
  const trendContext = computeTrendContext(ctx);

  // Seasonal indicator
  const depMonth = new Date(ctx.departureDate).getMonth();
  let seasonalIndicator: 'peak' | 'shoulder' | 'low' | 'unknown' = 'unknown';
  if (region.includes('caribbean') || region.includes('bahamas')) {
    seasonalIndicator = depMonth >= 5 && depMonth <= 8 ? 'peak' : depMonth === 4 || depMonth === 9 || depMonth === 10 ? 'shoulder' : 'low';
  } else if (region.includes('mediterranean')) {
    seasonalIndicator = depMonth >= 5 && depMonth <= 8 ? 'peak' : depMonth === 4 || depMonth === 9 || depMonth === 10 ? 'shoulder' : 'low';
  } else if (region.includes('alaska')) {
    seasonalIndicator = depMonth >= 5 && depMonth <= 8 ? 'peak' : depMonth === 4 || depMonth === 9 || depMonth === 10 ? 'shoulder' : 'low';
  } else if (region.includes('europe') || region.includes('norwegian fjords')) {
    seasonalIndicator = depMonth >= 5 && depMonth <= 8 ? 'peak' : depMonth >= 3 && depMonth <= 4 || depMonth >= 9 && depMonth <= 10 ? 'shoulder' : 'low';
  }

  return {
    cabinForecasts,
    optimalBookingWindow: optimalWindow,
    competingSailings: competingSailings.length > 0 ? competingSailings : undefined,
    alerts: alerts.length > 0 ? alerts : undefined,
    trendContext,
    seasonalIndicator,
    rateLock: {
      expiresAt: rateLockExpiresAt,
      minutesRemaining,
      urgency: rateLockUrgency,
    },
    is_heuristic: true,
  };
}

/* ====================================================================== */
/*  BATCH OPERATIONS                                                       */
/* ====================================================================== */

/**
 * Batch-generate enhanced deal analyses for multiple sailings.
 * Used by the sync engine and admin regenerate endpoints.
 */
export async function batchGenerateEnhancedDealAnalyses(
  sailingContexts: SailingContext[],
  closePool = false
): Promise<string> {
  const pool = getPool();
  try {
    const total = sailingContexts.length;
    if (total === 0) return 'No sailings to analyze.';

    console.log(`[ENHANCED] Batch-generating deal analysis for ${total} sailings...`);
    const startTime = Date.now();
    let generated = 0;
    let failed = 0;

    const CHUNK_SIZE = 5; // Smaller chunks for enhanced (more data per call)

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = sailingContexts.slice(i, i + CHUNK_SIZE);

      for (const ctx of chunk) {
        try {
          await generateEnhancedDealAnalysis(ctx, true);
          generated++;
        } catch (err: any) {
          console.error(`[ENHANCED] Failed for sailing ${ctx.sailingId}: ${err.message}`);
          failed++;
        }
        // Rate-limit awareness: small delay between calls
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`[ENHANCED] Progress: ${generated} generated, ${failed} failed (${i + chunk.length}/${total}, ${elapsed}s)`);
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const msg = `${generated} enhanced deal analyses generated, ${failed} failed (${total} total, ${totalElapsed}s).`;
    console.log(`[ENHANCED] Batch complete: ${msg}`);
    return msg;
  } catch (err: any) {
    console.error(`[ENHANCED] Batch error: ${err.message}`);
    throw err;
  } finally {
    if (closePool) await pool.end();
  }
}

/**
 * Batch-generate enhanced price forecasts for multiple sailings.
 */
export async function batchGenerateEnhancedPriceForecasts(
  sailingContexts: SailingContext[],
  competitorsMap: Map<number, CompetingSailingData[]>,
  closePool = false
): Promise<string> {
  const pool = getPool();
  try {
    const total = sailingContexts.length;
    if (total === 0) return 'No sailings to forecast.';

    console.log(`[ENHANCED] Batch-generating price forecasts for ${total} sailings...`);
    const startTime = Date.now();
    let generated = 0;
    let failed = 0;

    for (const ctx of sailingContexts) {
      try {
        const competitors = competitorsMap.get(ctx.sailingId) || [];
        await generateEnhancedPriceForecast(ctx, competitors, true);
        generated++;
      } catch (err: any) {
        console.error(`[ENHANCED] Forecast failed for sailing ${ctx.sailingId}: ${err.message}`);
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const msg = `${generated} enhanced price forecasts generated, ${failed} failed (${total} total, ${totalElapsed}s).`;
    console.log(`[ENHANCED] Batch complete: ${msg}`);
    return msg;
  } catch (err: any) {
    console.error(`[ENHANCED] Batch forecast error: ${err.message}`);
    throw err;
  } finally {
    if (closePool) await pool.end();
  }
}
