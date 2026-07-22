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
import { getGratuityRate, WIFI_COST_PER_DAY } from "../utils/cruiseConstants";
import { sanitizeDealContent } from '../utils/contentFormatter';

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
  justification: string;
  hiddenCosts?: {
    mandatoryGratuities: number;
    wifiCost: number;
    realTotalCost: number;
  };
  cabinValueBreakdown?: Record<string, { perNight: number; valueRating: string }>;
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
export function heuristicDealAnalysis(sailingData: any): HeuristicDealAnalysis {
  // Null guard - prevent crashes when data is incomplete
  if (!sailingData) {
    return {
      dealScore: 50,
      pricingDeepDive: 'Insufficient data available for analysis',
      priceTrend: 'stable',
      shipExperience: 'Limited data',
      insiderTips: ['Monitor for more data'],
      verdict: 'Fair value — insufficient data to determine',
      justification: 'Insufficient data for full analysis',
      hiddenCosts: { mandatoryGratuities: 0, wifiCost: 0, realTotalCost: 0 },
      cabinValueBreakdown: {},
      is_heuristic: true,
    };
  }

  const cabinPrices = sailingData.pricing
    ?.filter((p: any) => p.passenger_count === 2)
    .reduce((acc: any, p: any) => {
      if (!acc[p.cabin_type] || new Date(p.captured_at) > new Date(acc[p.cabin_type].captured_at)) {
        acc[p.cabin_type] = p;
      }
      return acc;
    }, {}) ?? {};

  const departureDateRaw = sailingData?.departureDate;
  const duration = sailingData.durationDays || 7;

  // Null-guard: use a far-future date as fallback if departureDate is missing/invalid
  let daysUntilDeparture: number;
  try {
    const departureMs = new Date(departureDateRaw).getTime();
    if (!isNaN(departureMs)) {
      daysUntilDeparture = Math.ceil(
        (departureMs - Date.now()) / (1000 * 60 * 60 * 24)
      );
    } else {
      daysUntilDeparture = 365; // fallback: ~1 year out
    }
  } catch {
    daysUntilDeparture = 365; // fallback on parse error
  }

  // Compute per-cabin trends from price history
  const history: any[] = sailingData.priceHistory || [];
  const cabinTrends: Array<{direction: 'rising' | 'falling' | 'stable'; magnitude: number}> = [];
  for (const [cabinKey, snaps] of Object.entries(history)) {
    const doubles = (snaps as any[]).filter((s: any) => s.passenger_count === 2);
    if (doubles.length < 2) continue;
    const sorted = doubles.slice().sort((a: any, b: any) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
    const prices = sorted.map((s: any) => parseFloat(s.total_out_the_door_usd));
    const first = prices[0];
    const latest = prices[prices.length - 1];
    const mag = ((latest - first) / first * 100).toFixed(1);
    const magnitude = parseFloat(mag);
    const direction: 'rising' | 'falling' | 'stable' = magnitude > 3 ? 'rising' : magnitude < -3 ? 'falling' : 'stable';
    cabinTrends.push({ direction, magnitude });
  }

  // Determine overall price trend (majority of cabin types)
  let priceTrend: 'rising' | 'falling' | 'stable' = 'stable';
  let trendMagnitude = 0;
  if (cabinTrends.length > 0) {
    const risingCount = cabinTrends.filter((t) => t.direction === 'rising').length;
    const fallingCount = cabinTrends.filter((t) => t.direction === 'falling').length;
    const dominant = risingCount > fallingCount ? 'rising' : fallingCount > risingCount ? 'falling' : 'stable';
    const matching = cabinTrends.filter((t) => t.direction === dominant);
    trendMagnitude = Math.abs(matching.reduce((sum, t) => sum + t.magnitude, 0) / matching.length);
    priceTrend = dominant;
  }
  const trendDesc = sailingData.pricingTrend || '';
  if ((trendDesc.includes('UP') || trendDesc.includes('rising')) && priceTrend === 'stable') {
    const mag = trendDesc.match(/(\d+\.?\d*)%/);
    if (mag) { trendMagnitude = parseFloat(mag[1]); priceTrend = 'rising'; }
  } else if ((trendDesc.includes('DOWN') || trendDesc.includes('falling') || trendDesc.includes('dropping')) && priceTrend === 'stable') {
    const mag = trendDesc.match(/(\d+\.?\d*)%/);
    if (mag) { trendMagnitude = parseFloat(mag[1]); priceTrend = 'falling'; }
  }

  // Get current prices and PPD
  const cabinCurrentPrices: Record<string, number> = {};
  for (const [cabinKey, snap] of Object.entries(cabinPrices)) {
    const typedSnap = snap as { total_out_the_door_usd: string };
    cabinCurrentPrices[cabinKey] = parseFloat(typedSnap.total_out_the_door_usd);
  }
  const insidePrice = cabinCurrentPrices['Inside'] ?? cabinCurrentPrices['Oceanview'] ?? cabinCurrentPrices['Balcony'] ?? 150;
  const ppd = insidePrice / 2 / duration;
  const itinerary = Array.isArray(sailingData.itinerary) ? sailingData.itinerary : [];
  const portCount = itinerary.filter((p: string) => p !== 'at sea').length;

  // Destination classification
  const destLower = (sailingData.destinationRegion || '').toLowerCase();
  let destType = 'standard';
  if (destLower.includes('east caribbean') || destLower.includes('bahamas') || destLower.includes('balearic') || destLower.includes('iceland')) {
    destType = 'short_caribbean';
  } else if (destLower.includes('west caribbean') || destLower.includes('central americas')) {
    destType = 'west_caribbean';
  } else if (destLower.includes('alaska')) {
    destType = 'alaska';
  } else if (destLower.includes('med') || destLower.includes('greek islands') || destLower.includes('patmos') || destLower.includes('marseille') || destLower.includes('barcelona') || destLower.includes('italy') || destLower.includes('romania') || destLower.includes('greece')) {
    destType = 'mediterranean';
  } else if (destLower.includes('antarctica') || destLower.includes('galapagos') || destLower.includes('south pacific') || destLower.includes('tanzania') || destLower.includes('kenya') || destLower.includes('ghana')) {
    destType = 'premium';
  }

  // --- Factor 1: Price-per-day (weighted 40 points) ---
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

  // --- Factor 2: Price trend direction (weighted 30 points) ---
  let trendFactor = 50;
  const trendNotes: string[] = [];
  if (daysUntilDeparture > 90) {
    if (priceTrend === 'falling') { trendFactor = Math.min(80, 50 + Math.round(trendMagnitude * 3)); trendNotes.push('falling prices early in booking window'); }
    else if (priceTrend === 'rising') { trendFactor = Math.min(65, 50 + Math.round(trendMagnitude * 1.5)); trendNotes.push('rising prices early in booking window'); }
    else { trendFactor = 55; trendNotes.push('stable — prices still finding equilibrium'); }
  } else if (daysUntilDeparture < 14) {
    if (priceTrend === 'falling') { trendFactor = Math.min(40, 50 + Math.round(trendMagnitude * 0.5)); trendNotes.push('falling — rare last-minute drop'); }
    else if (priceTrend === 'rising') { trendFactor = Math.min(85, 50 + Math.round(trendMagnitude * 2)); trendNotes.push('prices climbing — last-minute surge common'); }
    else { trendFactor = 65; trendNotes.push('stable at last-minute'); }
  } else {
    if (priceTrend === 'falling') { trendFactor = Math.min(90, 50 + Math.round(trendMagnitude * 2.5)); trendNotes.push('prices dropping — strong signal to book'); }
    else if (priceTrend === 'rising') { trendFactor = Math.min(35, 50 - Math.round(trendMagnitude * 1.5)); trendNotes.push('prices rising — likely to climb further'); }
    else { trendFactor = 50; trendNotes.push('stable — no clear trend direction'); }
  }

  // --- Factor 3: Cabin variety (weighted 10 points) ---
  const cabinVarietyFactor = Object.keys(cabinCurrentPrices).length >= 4 ? 90 :
                              Object.keys(cabinCurrentPrices).length >= 3 ? 75 :
                              Object.keys(cabinCurrentPrices).length >= 2 ? 60 : 40;

  // --- Factor 4: Duration value (weighted 10 points) ---
  let durationFactor = 50;
  if (duration >= 10) { durationFactor = Math.min(80, 50 + Math.round((duration - 7) / 3 * 30)); scoreFactors.push(`extended ${duration}-night voyage`); }
  else if (duration === 7) { durationFactor = 55; scoreFactors.push('classic 7-night itinerary'); }
  else if (duration >= 5 && duration <= 9) { durationFactor = 60; scoreFactors.push(`solid ${duration}-night duration`); }
  else if (duration >= 3 && duration <= 4) { durationFactor = 40; scoreFactors.push(`${duration}-night short cruise`); }
  else { durationFactor = 35; scoreFactors.push(`${duration}-night brief sailing`); }

  // --- Factor 5: Destination context (weighted 15 points) ---
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

  // --- Factor 6: Cruise line strategy (weighted 15 points) ---
  const cruiseLine = (sailingData.cruiseLine || '').toLowerCase();
  let cruiseLineStrategyFactor = 50;
  if (cruiseLine.includes('royal caribbean') || cruiseLine.includes('celebrity')) {
    cruiseLineStrategyFactor = 60; scoreFactors.push('premium brand — quality-to-price ratio favorable at lower PPD');
  } else if (cruiseLine.includes('carnival') || cruiseLine.includes('norwegian')) {
    cruiseLineStrategyFactor = 55; scoreFactors.push('mainstream brand — aggressive discounting creates value signals');
  } else {
    scoreFactors.push('standard cruise line — typical market dynamics');
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

  const verdict = dealScore >= 80 ? 'Excellent deal — book now before inventory disappears' :
                  dealScore >= 70 ? 'Strong buy — very good value for this route' :
                  dealScore >= 60 ? 'Good deal — solid value, consider booking soon' :
                  dealScore >= 50 ? 'Fair value — average pricing, monitor for drops' :
                  'Below average — prices are elevated, wait for sales';

  // Hidden costs
  const gratuitiesPerDay = getGratuityRate(sailingData.cruiseLine || "");
  const totalGratuities = Math.round(gratuitiesPerDay * duration * 2);
  const wifiCost = Math.round(12 * duration * 2);
  const realTotal = insidePrice + totalGratuities + wifiCost;

  // Per-cabin value breakdown
  const cabinValueBreakdown: Record<string, { perNight: number; valueRating: string }> = {};
  for (const [cabinType, cabinData] of Object.entries(cabinPrices) as [string, any][]) {
    const price = parseFloat(cabinData.total_out_the_door_usd);
    const perNight = price / 2 / duration;
    let rating: string;
    if (perNight < 100) rating = 'Excellent';
    else if (perNight < 150) rating = 'Great';
    else if (perNight < 200) rating = 'Good';
    else if (perNight < 250) rating = 'Fair';
    else rating = 'Overpriced';
    cabinValueBreakdown[cabinType] = { perNight: Math.round(perNight), valueRating: rating };
  }

  // Insider tips — data-driven, NOT generic
  const insiderTips: string[] = [];
  if (priceTrend === 'falling' && trendMagnitude > 5) {
    insiderTips.push(`Prices have dropped ${trendMagnitude.toFixed(1)}% — this trend typically continues until ~45 days before departure; book now for best rates`);
  }
  if (priceTrend === 'rising' && trendMagnitude > 3) {
    insiderTips.push(`Prices climbing ${trendMagnitude.toFixed(1)}% — lock in now before the climb accelerates`);
  }
  if (cabinValueBreakdown['Inside'] && cabinValueBreakdown['Balcony']) {
    const insidePPN = cabinValueBreakdown['Inside'].perNight;
    const balconyPPN = cabinValueBreakdown['Balcony'].perNight;
    const upgradeCost = balconyPPN - insidePPN;
    if (upgradeCost < 40) {
      insiderTips.push(`Upgrading from Inside to Balcony costs just $${upgradeCost.toFixed(0)}/night — exceptional upgrade value on this sailing`);
    } else {
      insiderTips.push(`Inside cabins at $${insidePPN}/night offer the best base value; Balcony upgrade adds $${upgradeCost.toFixed(0)}/night`);
    }
  }
  if (duration >= 7 && realTotal > 0) {
    insiderTips.push(`Real total cost with gratuities ($${totalGratuities}) and Wi-Fi ($${wifiCost}) adds $${totalGratuities + wifiCost} — your actual out-the-door price is $${realTotal.toLocaleString()}, not the listed $${insidePrice.toLocaleString()}`);
  }
  if (insiderTips.length === 0) {
    const ppdLabel = destType === 'premium' ? 'premium per-day rate' : 'competitive per-day rate';
    insiderTips.push(`At $${ppd.toFixed(0)}/person/night (${ppdLabel} for ${duration}-night ${sailingData.destinationRegion || 'this destination'}), this is a reasonable entry point; monitor for sales`);
    insiderTips.push(`Historical pattern: ${cruiseLine || 'this cruise line'} typically runs promotions every 4-8 weeks — check back for drops`);
  }

  // Justification
  const justification = `Score of ${dealScore}/100 based on weighted factors: ${scoreFactors.join('; ')}. ` +
    `Inside cabin at $${insidePrice.toLocaleString()} total ($${(insidePrice / 2).toFixed(0)}/person, $${ppd.toFixed(0)}/person/day). ` +
    `Price trend: ${priceTrend} (${trendNotes.length > 0 ? trendNotes.join(', ') : 'no trend data available'}). ` +
    `In ${Object.keys(cabinCurrentPrices).length} cabin types tracked. Duration: ${duration} nights. ` +
    `Destination: ${sailingData.destinationRegion || 'this destination'}. ` +
    `Cruise line: ${sailingData.cruiseLine || 'unknown'}. ` +
    `Port count: ${portCount > 0 ? portCount : 'N/A'}. ` +
    `Real total cost with gratuities and Wi-Fi: $${realTotal.toLocaleString()}.`;

  const shipExperience = `Based on ${Object.keys(cabinCurrentPrices).length} cabin types and ${duration}-night duration for ${sailingData.destinationRegion || 'this destination'}. Ship: ${sailingData.shipName || 'unknown'}.`;

  // Build pricing deep dive
  const pricingDeepDiveEntries = Object.entries(cabinCurrentPrices).map(([k, v]: [string, number]) => {
    const perPerson = Math.round(v / 2);
    const perNight = Math.round(v / 2 / duration);
    return `${k}: $${v.toLocaleString()} ($${perPerson}/person, $${perNight}/night)`;
  }).join('; ');

  const pricingDeepDive = `${sailingData.cruiseLine || 'This cruise line'} ${sailingData.shipName || ''} ${duration}-night ${sailingData.destinationRegion || ''} sailing from ${sailingData.departurePort || 'homeport'}. ` +
    `${pricingDeepDiveEntries}. ` +
    `Price trend: ${priceTrend} (${priceTrend === 'falling' ? 'dropping' : priceTrend === 'rising' ? 'rising' : 'stable'}) based on ${cabinTrends.length} cabin-type trend points.`;

  return {
    dealScore,
    pricingDeepDive,
    priceTrend,
    shipExperience,
    insiderTips,
    verdict,
    justification,
    hiddenCosts: {
      mandatoryGratuities: totalGratuities,
      wifiCost,
      realTotalCost: realTotal,
    },
    cabinValueBreakdown,
    is_heuristic: true,
  };
}

/**
 * Deterministic price forecast based on days until departure and volatility.
 * Used when OpenCode API is rate-limited and all retries exhausted.
 */
export function heuristicPriceForecast(currentPrice: number, daysUntil: number, priceHistory?: Array<{price: number; date: string}>): HeuristicPriceForecast {
  // Calculate actual volatility from price history if available
  let observedVolatility = 0.08; // default
  let priceDirection = 0;
  let dataPointCount = 0;

  if (priceHistory && priceHistory.length >= 2) {
    dataPointCount = priceHistory.length;
    const prices = priceHistory.map(h => h.price);
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    // Volatility = standard deviation of returns
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    observedVolatility = Math.sqrt(variance) * 100; // as percentage

    // Direction = average return
    priceDirection = mean * returns.length;
  }

  // Urgency multiplier based on days until departure
  const urgencyMultiplier = daysUntil < 14 ? 1.5 : daysUntil < 30 ? 1.2 : daysUntil < 60 ? 1.0 : 0.8;
  const volatility = observedVolatility * urgencyMultiplier / 100;

  // Trend factor: combine observed direction with historical pattern
  // observedTrend is the total price change as a decimal; scale it appropriately
  const seasonalTrend = daysUntil < 30 ? 0.05 : daysUntil < 60 ? 0.03 : 0.01;
  const observedTrend = priceDirection; // already scaled: mean * count
  const trendFactor = 1 + seasonalTrend + observedTrend * 0.3;

  const forecast7d = Math.round(currentPrice * (1 + volatility * 0.4 + observedTrend * 0.2));
  const forecast30d = Math.round(currentPrice * trendFactor);

  // Confidence based on data points and time horizon
  const dataConfidence = Math.min(0.8, 0.3 + dataPointCount * 0.1);
  const horizonPenalty = daysUntil > 90 ? 0.7 : daysUntil > 60 ? 0.8 : daysUntil > 30 ? 0.9 : 1.0;
  const confidence = Math.round(dataConfidence * horizonPenalty * 100) / 100;

  const pct7d = ((forecast7d - currentPrice) / currentPrice * 100);
  const pct30d = ((forecast30d - currentPrice) / currentPrice * 100);

  const assessment = pct7d > 3 ? 'above market' :
                     pct7d < -3 ? 'below market' : 'at market';

  const recommendation = pct30d > 8 ? 'buy now before prices climb' :
                         pct30d > 4 ? 'book within 2 weeks to lock current rate' :
                         pct30d > 1 ? 'current price is fair — no urgency either way' :
                         'prices may dip further — patient buyers could save';

  const directionWord = pct7d > 1 ? 'rising' : pct7d < -1 ? 'falling' : 'stable';

  return {
    currentPriceAssessment: `${assessment} — $${currentPrice.toLocaleString()} ${dataPointCount > 0 ? `(${dataPointCount} data points, ${observedVolatility.toFixed(1)}% observed volatility)` : '(estimated)'}`,
    shortTermForecast: `7-day forecast: ${forecast7d > currentPrice ? '+' : ''}${pct7d.toFixed(1)}% → $${forecast7d.toLocaleString()} (${directionWord}, ${Math.round(confidence * 100)}% confidence, ${dataPointCount} snapshots)`,
    mediumTermForecast: `30-day forecast: ${forecast30d > currentPrice ? '+' : ''}${pct30d.toFixed(1)}% → $${forecast30d.toLocaleString()} (seasonal trend ${daysUntil < 30 ? 'accelerating' : daysUntil < 60 ? 'moderate' : 'gradual'}, ${Math.round(confidence * 80 / 100 * 100) / 100}% confidence)`,
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

  return sanitizeDealContent(result);
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
        const capturedAt = dates[i];
        // Guard against null/undefined captured_at (DB NULL values)
        if (!capturedAt) {
          return `$${p}(${'unknown'})`;
        }
        const dateStr = String(capturedAt);
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

  return sanitizeDealContent(result);
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
        const capturedAt = dates[i];
        // Guard against null/undefined captured_at (DB NULL values)
        if (!capturedAt) {
          return `$${p}(${'unknown'})`;
        }
        const dateStr = String(capturedAt);
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

    const sanitizedResult = sanitizeDealContent(result);

    await pool.query(
      'UPDATE sailings SET price_forecast = $1, price_forecast_generated_at = NOW() WHERE id = $2',
      [sanitizedResult, id]
    );

    return sanitizedResult;
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
          
          const analysis = sanitizeDealContent(await analyzeSailingDealOptimized(String(sid), {
            ...sailing,
            pricing: pricingResult.rows
          }, true));
          
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