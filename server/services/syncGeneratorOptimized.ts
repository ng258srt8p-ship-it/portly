/**
 * TripTide — Optimized Sync Generator (via OpenCode)
 *
 * Merges schedule + pricing generation into a single OpenCode call.
 * Uses a prioritized single-worker queue with strict 2.5s spacing
 * and delta-based caching to avoid redundant AI calls.
 */

import { getPool } from '../db/pool';
import { getGlobalLimiter } from '../utils/nimRateLimiter';
import { callOpenRouter } from '../lib/openRouterClient';

// ---- Types ----

export interface CabinCategory {
  tier: string;
  count: number;
  sqFt: number;
  maxOccupancy: number;
}

export interface SailingRecord {
  cruiseLine: string;
  shipName: string;
  shipClass?: string;
  departureDate: string;
  durationDays: number;
  departurePort: string;
  departureRegion?: string;
  itinerary: string[];
  destinationRegion?: string;
  totalCabins?: number;
  cabinCategories?: CabinCategory[];
  isRepositioning?: boolean;
  bookingUrl?: string;
  // Optional pricing data (populated when available for AI analysis)
  pricing?: Record<string, {
    base: number;
    fees: number;
    taxes: number;
    gratuities: number;
    total: number;
  }>;
  // Optional price history for trend analysis
  priceHistory?: Array<{ total: number; captured_at: string }>;
}

export interface CheckoutResult {
  sailingIndex: number;
  cabinType: 'Inside' | 'Oceanview' | 'Balcony' | 'Suite' | 'Solo';
  passengerCount: number;
  baseFareUsd: number;
  portFeesUsd: number;
  gratuitiesUsd: number;
  isSoloSupplementWaived: boolean;
  rawCheckoutPayload: Record<string, unknown>;
}

export interface UnifiedSailingRecord extends SailingRecord {
  pricing: Record<string, {
    base: number;
    fees: number;
    taxes: number;
    gratuities: number;
    total: number;
  }>;
}

// For delta caching
export interface SailingHash {
  sailingId: number;
  contentHash: string;
  lastAiAnalysisAt: Date | null;
  lastPricePpd: number | null;
}

// ---- Cabin Tier Normalization ----

const CABIN_TIER_MAP: Record<string, string> = {
  'inside': 'Inside', 'interior': 'Inside',
  'ocean view': 'Oceanview', 'oceanview': 'Oceanview',
  'outside': 'Oceanview', 'window': 'Oceanview',
  'ocean view stateroom': 'Oceanview',
  'balcony': 'Balcony', 'veranda': 'Balcony',
  'verandah': 'Balcony', 'veranda suite': 'Suite',
  'verandah suite': 'Suite', 'balcony stateroom': 'Balcony',
  'suite': 'Suite', 'junior suite': 'Suite', 'junior': 'Suite',
  'mini suite': 'Suite', 'mini': 'Suite',
  'penthouse suite': 'Suite', 'penthouse': 'Suite',
  'grand suite': 'Suite', 'grand': 'Suite',
  "owner's suite": 'Suite', 'owner suite': 'Suite',
  'owners suite': 'Suite', 'family suite': 'Suite',
  'family': 'Suite', 'deluxe suite': 'Suite',
  'deluxe': 'Suite', 'premium suite': 'Suite',
  'solo': 'Solo', 'single': 'Solo',
  'single cabin': 'Solo', 'studio': 'Solo', 'studio cabin': 'Solo',
};

function normalizeCabinTier(tier: string): string {
  const key = tier.toLowerCase().trim();
  return CABIN_TIER_MAP[key] || 'Inside';
}

// ---- Hash Computation for Delta Detection ----

function computeSailingHash(sailing: SailingRecord & { pricing?: SailingRecord['pricing'] }): string {
  // Hash the fields that affect AI analysis: pricing, itinerary, dates
  const relevant = {
    cruiseLine: sailing.cruiseLine,
    shipName: sailing.shipName,
    departureDate: sailing.departureDate,
    durationDays: sailing.durationDays,
    departurePort: sailing.departurePort,
    itinerary: sailing.itinerary,
    destinationRegion: sailing.destinationRegion,
    pricing: sailing.pricing ? Object.entries(sailing.pricing)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ tier: k, total: (v as any).total })) : undefined,
  };
  // Simple deterministic hash
  return Buffer.from(JSON.stringify(relevant)).toString('base64').slice(0, 32);
}

function computePricePpd(sailing: SailingRecord & { pricing?: SailingRecord['pricing'] }): number | null {
  if (!sailing.pricing) return null;
  const inside = sailing.pricing['Inside'];
  if (!inside) return null;
  return inside.total / sailing.durationDays;
}

// ---- Delta Cache Check ----

async function shouldRunAiAnalysis(sailingId: number, currentHash: string, currentPpd: number | null): Promise<{
  shouldRun: boolean;
  reason: string;
  cachedAnalysis?: any;
  cachedForecast?: any;
}> {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT deal_analysis, price_forecast, price_forecast_generated_at,
            last_ai_analysis_hash, last_ai_price_ppd
     FROM sailings 
     WHERE id = $1`,
    [sailingId]
  );
  
  if (result.rows.length === 0) {
    return { shouldRun: true, reason: 'sailing not found' };
  }
  
  const row = result.rows[0];
  
  // No previous analysis → run AI
  if (!row.deal_analysis && !row.price_forecast) {
    return { shouldRun: true, reason: 'no previous analysis' };
  }
  
  // Hash changed → data mutated, re-run
  if (row.last_ai_analysis_hash !== currentHash) {
    return { shouldRun: true, reason: 'content hash changed', cachedAnalysis: row.deal_analysis, cachedForecast: row.price_forecast };
  }
  
  // Price per day shifted >1% → re-run
  if (currentPpd !== null && row.last_ai_price_ppd !== null) {
    const delta = Math.abs(currentPpd - parseFloat(row.last_ai_price_ppd)) / parseFloat(row.last_ai_price_ppd);
    if (delta > 0.01) {
      return { shouldRun: true, reason: `price delta ${(delta * 100).toFixed(2)}% > 1%`, cachedAnalysis: row.deal_analysis, cachedForecast: row.price_forecast };
    }
  }
  
  // No significant change → reuse cached
  return { 
    shouldRun: false, 
    reason: 'unchanged (hash match, price delta < 1%)',
    cachedAnalysis: row.deal_analysis,
    cachedForecast: row.price_forecast 
  };
}

async function updateSailingCache(
  sailingId: number, 
  hash: string, 
  ppd: number | null,
  dealAnalysis?: any,
  priceForecast?: any
): Promise<void> {
  const pool = getPool();
  const updates: string[] = [
    'last_ai_analysis_hash = $2',
    'last_ai_price_ppd = $3',
    'last_ai_analysis_at = NOW()'
  ];
  const params: any[] = [sailingId, hash, ppd];
  
  if (dealAnalysis) {
    params.push(dealAnalysis);
    updates.push(`deal_analysis = $${params.length}`);
  }
  if (priceForecast) {
    params.push(priceForecast);
    updates.push(`price_forecast = $${params.length}`);
    updates.push(`price_forecast_generated_at = NOW()`);
  }
  
  await pool.query(
    `UPDATE sailings SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}

// ---- Prompts ----

const UNIFIED_SYNC_PROMPT = `
You are a cruise data provider API. Generate exactly {COUNT} realistic cruise sailings WITH COMPLETE PRICING as a single JSON array.

Each object MUST have ALL these fields:

- "cruiseLine": cruise line name (mix: Royal Caribbean, Princess Cruises, Norwegian Cruise Line, Carnival Cruise Line, Celebrity Cruises, MSC Cruises, Holland America, Disney Cruise Line)
- "shipName": real ship name that sails for that cruise line
- "shipClass": ship class (e.g. "Oasis-class", "Royal-class", "Vista-class", "Spirit-class", "Edge-class", "Meraviglia-class", "Pinnacle-class", "Wish-class")
- "departureDate": future date 2026-08-01 to 2027-06-30 (YYYY-MM-DD)
- "durationDays": 3-14 (mix: 3-5 short, 7-8 medium, 10-14 long)
- "departurePort": real port with state/country ("Miami, FL", "Barcelona, ES", "Vancouver, BC")
- "departureRegion": geographic region ("Florida", "Western Europe", "Pacific Northwest", "Mediterranean", "Gulf Coast", "Northeast", "California", "Asia", "UK")
- "itinerary": array of 3-6 port names (start/end at departurePort, real destinations)
- "destinationRegion": one of: "Caribbean", "Alaska", "Mediterranean", "Bahamas", "Mexico", "Europe", "Asia", "South America", "Hawaii", "Panama Canal", "Transatlantic", "World Cruise"
- "totalCabins": 1000-2800 (proportional to actual ship size)
- "cabinCategories": array of 3-5 objects with: "tier" (Inside/Oceanview/Balcony/Suite/Solo), "count", "sqFt", "maxOccupancy"
- "isRepositioning": boolean (true only for Transatlantic/Panama Canal)
- "bookingUrl": realistic URL

PRICING for each cabin tier (per person, for 2 passengers):
{
  "Inside": {"base": 599, "fees": 189, "taxes": 67, "gratuities": 105, "total": 960},
  "Oceanview": {"base": 749, "fees": 189, "taxes": 67, "gratuities": 105, "total": 1110},
  "Balcony": {"base": 999, "fees": 189, "taxes": 67, "gratuities": 105, "total": 1360},
  "Suite": {"base": 1899, "fees": 189, "taxes": 67, "gratuities": 105, "total": 2260}
}

Scale base fare by (durationDays / 7). Port fees scale slightly. Gratuities = $18-22/night × durationDays.
Only include pricing for cabin tiers that exist in cabinCategories.

Rules:
1. Mix cruise lines — no line more than 2x
2. Use REAL current ship names per line
3. Vary durations (include short, medium, long)
4. Itineraries geographically coherent
5. At least 1 Alaska, 1 Mediterranean sailing
6. At least 1 isRepositioning = true (Transatlantic/Panama Canal)
7. cabinCategories counts sum ≈ totalCabins
8. departureRegion matches departurePort
9. Include bookingUrl for each sailing

CRITICAL: Return ONLY raw JSON array. No markdown, no code fences, no commentary.
`;

const OPTIMIZED_ANALYSIS_PROMPT = `
Analyze this sailing for deal value. Output ONLY this JSON (no markdown, no commentary):

{
  "dealScore": 0-100,
  "pricingDeepDive": "string",
  "priceTrend": "rising|falling|stable",
  "shipExperience": "string",
  "insiderTips": ["tip1", "tip2", "tip3"],
  "verdict": "string"
}

SAILING DATA:
{JSON_DATA}
`;

const PRICE_FORECAST_PROMPT = `
You are TripTide's price forecasting analyst. Based on historical pricing data, predict where prices are headed.

SAILING:
- Cruise Line: {cruiseLine}
- Ship: {shipName}
- Duration: {durationDays} nights
- Destination: {destinationRegion}
- Departure: {departureDate} ({daysUntil} days from now)

PRICING HISTORY BY CABIN:
{cabinSummaries}

Provide forecast as JSON only:
{
  "currentPriceAssessment": "below/at/above market",
  "shortTermForecast": "1-2 week outlook with specific %",
  "mediumTermForecast": "1 month outlook with specific %",
  "recommendation": "buy now / wait / monitor",
  "confidence": 0.0-1.0
}
`;

// ---- Prioritized Job Queue ----

enum JobPriority {
  CRITICAL = 1,   // deal_analysis, generateSailingsWithPricing (core UI)
  HIGH = 2,       // generatePriceForecast
  BACKGROUND = 3, // destination/market/booking insights, agent tasks
}

interface QueuedJob<T = any> {
  id: string;
  priority: JobPriority;
  type: string;
  payload: T;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
}

class PrioritizedWorker {
  private queue: QueuedJob[] = [];
  private processing = false;
  private lastRequestAt = 0;
  private readonly MIN_SPACING_MS = 2500; // Enforces ~24 RPM max (strict 2.5s spacing)
  private readonly globalLimiter = getGlobalLimiter();

  async enqueue<T>(job: Omit<QueuedJob<T>, 'id' | 'enqueuedAt' | 'resolve' | 'reject'>): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.queue.push({
        ...job,
        id,
        enqueuedAt: Date.now(),
        resolve,
        reject,
      } as QueuedJob<T>);
      
      // Sort by priority (ascending = CRITICAL first), then FIFO
      this.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Peek at next job
      const job = this.queue[0];
      
      // Starvation prevention: if BACKGROUND job at front but CRITICAL/HIGH waiting behind,
      // let one BACKGROUND job through only if no higher priority has been waiting >30s
      if (job.priority === JobPriority.BACKGROUND) {
        const hasHigherPriorityWaiting = this.queue.some(j => 
          j.priority < JobPriority.BACKGROUND && Date.now() - j.enqueuedAt > 30000
        );
        if (hasHigherPriorityWaiting) {
          // Skip this BACKGROUND job for now, re-queue at end
          this.queue.shift();
          job.enqueuedAt = Date.now(); // reset wait time
          this.queue.push(job);
          this.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
          continue;
        }
      }

      // Enforce strict minimum spacing between requests
      const now = Date.now();
      const elapsed = now - this.lastRequestAt;
      if (elapsed < this.MIN_SPACING_MS) {
        const waitMs = this.MIN_SPACING_MS - elapsed;
        console.log(`[WORKER] Spacing delay: ${waitMs}ms (enforcing 2.5s minimum)`);
        await new Promise(r => setTimeout(r, waitMs));
      }

      // Dequeue and process
      this.queue.shift();
      this.lastRequestAt = Date.now();

      try {
        const result = await this.executeJob(job);
        job.resolve(result);
      } catch (error) {
        console.error(`[WORKER] Job ${job.id} (${job.type}) failed:`, error);
        job.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  private async executeJob(job: QueuedJob): Promise<string> {
    const { type, payload } = job;
    const model = 'mimo-v2.5-free';

    switch (type) {
      case 'generateSailingsWithPricing': {
        const { count } = payload;
        const prompt = UNIFIED_SYNC_PROMPT.replace('{COUNT}', String(count));
        
        return callOpenRouter([
          { role: 'system', content: 'You are a cruise data provider API. Return only valid JSON arrays with no formatting, no markdown, no commentary.' },
          { role: 'user', content: prompt }
        ], { max_tokens: 16384, temperature: 0.5 });
      }

      case 'generateDealAnalysis': {
        const { sailingId, sailingData } = payload;
        const prompt = OPTIMIZED_ANALYSIS_PROMPT.replace('{JSON_DATA}', JSON.stringify(sailingData));
        
        // Check delta cache first
        const currentHash = computeSailingHash(sailingData);
        const currentPpd = computePricePpd(sailingData);
        const cacheCheck = await shouldRunAiAnalysis(sailingId, currentHash, currentPpd);
        
        if (!cacheCheck.shouldRun) {
          console.log(`[CACHE] Skipping AI for sailing ${sailingId}: ${cacheCheck.reason}`);
          if (cacheCheck.cachedAnalysis) {
            return cacheCheck.cachedAnalysis;
          }
        }

        try {
          const content = await callOpenRouter([
            { role: 'system', content: "You are TripTide's deal analyst. Output ONLY the JSON object specified. No markdown, no commentary." },
            { role: 'user', content: prompt }
          ], { max_tokens: 1024, temperature: 0.2 });
          const parsed = JSON.parse(content.trim());
          const normalized = JSON.stringify({
            dealScore: Math.max(0, Math.min(100, Number(parsed.dealScore) || 50)),
            pricingDeepDive: String(parsed.pricingDeepDive || 'Analysis unavailable'),
            priceTrend: ['rising', 'falling', 'stable'].includes(parsed.priceTrend) ? parsed.priceTrend : 'stable',
            shipExperience: String(parsed.shipExperience || 'Experience data unavailable'),
            insiderTips: Array.isArray(parsed.insiderTips) ? parsed.insiderTips.slice(0, 3) : ['Contact agent for details'],
            verdict: String(parsed.verdict || 'Manual review recommended'),
            is_heuristic: false,
          });
          await updateSailingCache(sailingId, currentHash, currentPpd, normalized);
          return normalized;
        } catch {
          console.warn(`[HEURISTIC] Fallback for sailing ${sailingId}`);
          const heuristic = heuristicDealAnalysis(sailingData);
          const heuristicJson = JSON.stringify({ ...heuristic, is_heuristic: true });
          await updateSailingCache(sailingId, currentHash, currentPpd, heuristicJson);
          return heuristicJson;
        }
      }

      case 'generatePriceForecast': {
        const { sailingId, sailingData } = payload;
        const currentHash = computeSailingHash(sailingData);
        const currentPpd = computePricePpd(sailingData);
        const cacheCheck = await shouldRunAiAnalysis(sailingId, currentHash, currentPpd);
        
        if (!cacheCheck.shouldRun) {
          console.log(`[CACHE] Skipping forecast for sailing ${sailingId}: ${cacheCheck.reason}`);
          if (cacheCheck.cachedForecast) {
            return cacheCheck.cachedForecast;
          }
        }

        // Build cabin summaries
        const cabinSummaries = buildCabinSummaries(sailingData);
        const daysUntil = Math.ceil(
          (new Date(sailingData.departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const prompt = PRICE_FORECAST_PROMPT
          .replace('{cruiseLine}', sailingData.cruiseLine)
          .replace('{shipName}', sailingData.shipName)
          .replace('{durationDays}', String(sailingData.durationDays))
          .replace('{destinationRegion}', sailingData.destinationRegion || 'N/A')
          .replace('{departureDate}', sailingData.departureDate)
          .replace('{daysUntil}', String(daysUntil))
          .replace('{cabinSummaries}', cabinSummaries);

        try {
          const content = await callOpenRouter([
            { role: 'system', content: "You are TripTide's price forecasting analyst. Output only valid JSON. No markdown." },
            { role: 'user', content: prompt }
          ], { max_tokens: 1200, temperature: 0.2 });
          JSON.parse(content.trim());
          await updateSailingCache(sailingId, currentHash, currentPpd, undefined, content.trim());
          return content.trim();
        } catch {
          console.warn(`[HEURISTIC] Forecast fallback for sailing ${sailingId}`);
          const currentPrice = extractCurrentPrice(sailingData);
          const heuristic = heuristicPriceForecast(currentPrice, daysUntil);
          const heuristicJson = JSON.stringify({ ...heuristic, is_heuristic: true });
          await updateSailingCache(sailingId, currentHash, currentPpd, undefined, heuristicJson);
          return heuristicJson;
        }
      }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  getStatus() {
    const counts = { critical: 0, high: 0, background: 0 };
    for (const job of this.queue) {
      if (job.priority === JobPriority.CRITICAL) counts.critical++;
      else if (job.priority === JobPriority.HIGH) counts.high++;
      else counts.background++;
    }
    return {
      queueLength: this.queue.length,
      ...counts,
      processing: this.processing,
      lastRequestAgo: Date.now() - this.lastRequestAt,
    };
  }
}

// Singleton worker
let workerInstance: PrioritizedWorker | null = null;

function getWorker(): PrioritizedWorker {
  if (!workerInstance) {
    workerInstance = new PrioritizedWorker();
    console.log('[WORKER] Initialized prioritized single worker (2.5s spacing, 3-tier priority)');
  }
  return workerInstance;
}

// Compatibility exports for hybridEngineOptimized.ts
export function initWorkerPool(): void {
  getWorker(); // Initialize the singleton
  console.log('[WORKER POOL] Initialized (prioritized single worker)');
}

export function getWorkerPoolStatus(): Array<{ queueLength: number; requestsThisMinute: number; processing: boolean }> {
  const status = getWorker().getStatus();
  return [{
    queueLength: status.queueLength,
    requestsThisMinute: 0, // Not tracking per-minute in new implementation
    processing: status.processing,
  }];
}

// ---- Public API ----

export async function generateSailingsWithPricing(
  count: number = 60,
  model: string = 'mimo-v2.5-free'
): Promise<UnifiedSailingRecord[]> {
  const worker = getWorker();
  
  console.log(`[SYNC] Generating ${count} sailings with pricing (unified call)`);
  const startTime = Date.now();

  const response = await worker.enqueue({
    priority: JobPriority.CRITICAL,
    type: 'generateSailingsWithPricing',
    payload: { count },
  });

  const records = parseJsonArray<UnifiedSailingRecord>(response);

  console.log(`[SYNC] Unified generation: ${records.length} sailings in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  return records;
}

export async function generateDealAnalysis(
  sailingId: string,
  sailingData: any,
  model: string = 'mimo-v2.5-free'
): Promise<string> {
  const worker = getWorker();
  const id = parseInt(sailingId, 10);
  if (isNaN(id)) throw new Error(`Invalid sailing ID: ${sailingId}`);

  return worker.enqueue({
    priority: JobPriority.CRITICAL,
    type: 'generateDealAnalysis',
    payload: { sailingId: id, sailingData },
  });
}

export async function generatePriceForecast(
  sailingId: string,
  sailingData: any,
  model: string = 'mimo-v2.5-free'
): Promise<string> {
  const worker = getWorker();
  const id = parseInt(sailingId, 10);
  if (isNaN(id)) throw new Error(`Invalid sailing ID: ${sailingId}`);

  return worker.enqueue({
    priority: JobPriority.HIGH,
    type: 'generatePriceForecast',
    payload: { sailingId: id, sailingData },
  });
}

// ---- Helpers ----

function buildCabinSummaries(sailingData: any): string {
  if (!sailingData.pricing) return '  No pricing data available';
  
  return Object.entries(sailingData.pricing)
    .map(([cabin, p]: [string, any]) => {
      const total = p.total ?? (p.base + p.fees + p.taxes + p.gratuities);
      const ppd = (total / sailingData.durationDays).toFixed(2);
      return `  ${cabin}: $${total} total ($${ppd}/person/day)`;
    })
    .join('\n');
}

function extractCurrentPrice(sailingData: any): number {
  if (!sailingData.pricing) return 1000;
  const inside = sailingData.pricing['Inside'];
  const total = inside?.total ?? (inside?.base + inside?.fees + inside?.taxes + inside?.gratuities);
  const pricingValues = Object.values(sailingData.pricing) as Array<{ total?: number; base?: number; fees?: number; taxes?: number; gratuities?: number }>;
  return total ?? pricingValues[0]?.total ?? 1000;
}

function parseJsonArray<T>(text: string): T[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    const recovered: T[] = [];
    const objPattern = /{[^{}]*}/g;
    let match: RegExpExecArray | null;
    while ((match = objPattern.exec(cleaned)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          recovered.push(obj as T);
        }
      } catch { /* skip partial */ }
    }
    if (recovered.length > 0) return recovered;
    throw new Error(`Failed to parse OpenCode response: ${(e as Error).message}`);
  }
}

// ---- Heuristic Fallbacks ----

interface HeuristicDealAnalysis {
  dealScore: number;
  pricingDeepDive: string;
  priceTrend: 'rising' | 'falling' | 'stable';
  shipExperience: string;
  insiderTips: string[];
  verdict: string;
}

function heuristicDealAnalysis(sailingData: any): HeuristicDealAnalysis {
  const ppd = computePricePpd(sailingData) || 150;
  
  // Estimate trend from price history if available
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  let trendDesc = 'stable';
  if (sailingData.priceHistory && sailingData.priceHistory.length >= 2) {
    const history = sailingData.priceHistory;
    const first = history[0].total;
    const last = history[history.length - 1].total;
    const change = (last - first) / first;
    if (change > 0.02) { trend = 'rising'; trendDesc = `rising ${(change * 100).toFixed(1)}%`; }
    else if (change < -0.02) { trend = 'falling'; trendDesc = `falling ${(Math.abs(change) * 100).toFixed(1)}%`; }
  }

  // Heuristic scoring based on PPD and trend
  let dealScore = 50;
  if (ppd < 100) dealScore = 85;
  else if (ppd < 150) dealScore = 65;
  else if (ppd < 200) dealScore = 45;
  else dealScore = 30;
  
  if (trend === 'falling') dealScore += 10;
  else if (trend === 'rising') dealScore -= 10;
  dealScore = Math.max(0, Math.min(100, dealScore));

  return {
    dealScore,
    pricingDeepDive: `Heuristic: PPD $${ppd.toFixed(0)}, price trend ${trendDesc}. Based on fleet averages for ${sailingData.cruiseLine}.`,
    priceTrend: trend,
    shipExperience: `Heuristic estimate for ${sailingData.shipName} (${sailingData.cruiseLine}) — fleet-average amenities, dining, and entertainment.`,
    insiderTips: [
      'Book 60-90 days out for best cabin selection',
      'Monitor for price drops 30-45 days before departure',
      'Consider travel insurance for hurricane season sailings'
    ],
    verdict: dealScore >= 70 ? 'Good value — consider booking' : dealScore >= 50 ? 'Fair value — monitor for drops' : 'Below average value — wait for promotion',
  };
}

interface HeuristicPriceForecast {
  currentPriceAssessment: string;
  shortTermForecast: string;
  mediumTermForecast: string;
  recommendation: string;
  confidence: number;
}

function heuristicPriceForecast(currentPrice: number, daysUntil: number): HeuristicPriceForecast {
  const volatility = 0.08; // 8% typical
  let trend = 1.0;
  let assessment = 'at market';
  
  if (daysUntil < 14) {
    trend = 1.20; // Last-minute often rises
    assessment = 'above market';
  } else if (daysUntil < 30) {
    trend = 1.12;
    assessment = 'slightly above market';
  } else if (daysUntil < 60) {
    trend = 1.06;
    assessment = 'at market';
  } else {
    trend = 1.03;
    assessment = 'below market';
  }

  const forecast7d = Math.round(currentPrice * (1 + volatility * 0.5));
  const forecast30d = Math.round(currentPrice * trend);
  const confidence = daysUntil < 14 ? 0.6 : daysUntil < 30 ? 0.45 : 0.3;

  return {
    currentPriceAssessment: assessment,
    shortTermForecast: `+${((forecast7d - currentPrice) / currentPrice * 100).toFixed(1)}% in 7 days (heuristic)`,
    mediumTermForecast: `+${((forecast30d - currentPrice) / currentPrice * 100).toFixed(1)}% in 30 days (heuristic)`,
    recommendation: trend > 1.1 ? 'buy now' : trend > 1.03 ? 'buy soon' : 'monitor',
    confidence,
  };
}

export { getWorker, JobPriority };