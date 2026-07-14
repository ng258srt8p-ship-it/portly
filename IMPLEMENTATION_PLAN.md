# Implementation Plan: OpenCode Rate-Limiting & Resilience Hardening

## Context
- **Migration**: NVIDIA NIM (40 RPM, 5 keys) → OpenCode `mimo-v2.5-free` (free tier, strict 429 limits)
- **Problem**: Sync Cycle (Phases 3-4) exhausts rate limits → `price_forecasts` & `deal_analysis` = 0 records
- **Current**: Token bucket (30 RPM, burst 5), 3 retries (1s→2s→4s), UnifiedWorker (2 concurrent)

---

## Phase 1: Strict Rate Limiting & Aggressive Backoff (Files: `openCodeClient.ts`, `nimRateLimiter.ts`)

### 1.1 Update `openCodeClient.ts` → Use Global Limiter Exclusively
- Remove local `MAX_RETRIES`, `INITIAL_BACKOFF_MS` constants
- Call `limiter.acquireToken(model)` → then `limiter.executeWithRetry(fn, { model, maxRetries: 5, baseBackoffMs: 2000, maxBackoffMs: 45000, jitterFactor: 0.5 })`
- Add `mimo-v2.5-free` to `DEFAULT_MODEL_LIMITS` at **30 RPM** (empirically safe for free tier)
- **Result**: All backoff/retry logic centralized in `nimRateLimiter.ts`

### 1.2 Tighten `nimRateLimiter.ts` Token Bucket → Strict 2.5s Spacing
- Change `DEFAULTS.rpm` from 36 → **30** (OpenCode free tier safe limit)
- Change `DEFAULTS.burstSize` from 5 → **1** (eliminate burst entirely)
- Change `DEFAULTS.jitterFactor` from 0.2 → **0.5** (full decorrelated jitter)
- Verify `refillIntervalMs = ceil(60000 / rpm)` = 2000ms → with burst=1, enforces ≥2s spacing
- Add `model: 'mimo-v2.5-free'` → `30` RPM in `DEFAULT_MODEL_LIMITS`

### 1.3 Update Backoff Parameters
- `baseBackoffMs`: 2000 → **2000** (keep)
- `maxBackoffMs`: 60000 → **45000** (45s cap)
- `maxRetries`: 5 → **5** (already 5, good)
- `jitterFactor`: 0.2 → **0.5** (full jitter)

---

## Phase 2: Delta-Based Sync Caching (`syncGeneratorOptimized.ts`)

### 2.1 Add Change Detection Helpers
```typescript
// Before calling AI, check if sailing data actually changed
async function hasSailingChanged(sailingId: number, lastSyncHash: string): Promise<boolean>
async function computeSailingHash(sailing: SailingRecord): Promise<string>
```

### 2.2 Implement Price Delta Threshold
- In `generateDealAnalysis` / `generateSailingsWithPricing`:
  - Fetch latest `pricing_snapshots` for the sailing
  - Compare current price vs last AI-analyzed price
  - If `|Δ| < 1%` → **skip AI call**, reuse cached `deal_analysis` + `price_forecast`
  - Update `last_ai_analysis_at` timestamp only when AI actually runs

### 2.3 Add Heuristic Fallback Flag
- New column (or JSON field): `is_heuristic: boolean`
- When all 5 retries exhausted → generate deterministic fallback locally (see Phase 5)

---

## Phase 3: Request Batching in Analytics Generators (`analyticsGenerators.ts`)

### 3.1 Batch Ship Details (30 → 3 calls)
```typescript
// Before: 30 individual calls for 30 ships
// After: 3 calls × 10 ships each
const BATCH_SIZE = 10;
for (let i = 0; i < ships.length; i += BATCH_SIZE) {
  const batch = ships.slice(i, i + BATCH_SIZE);
  const result = await callOpenCode([
    { role: 'system', content: BATCH_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify({ ships: batch }) }
  ], { max_tokens: 8192, temperature: 0.3 });
}
```

### 3.2 Batch Destination Insights / Booking Insights
- Same pattern: 15 regions → 2 calls (8+7), 12 regions → 2 calls (6+6)

### 3.3 Update Prompt Schemas
- System prompt: "Output JSON array of N objects matching schema X"
- User prompt: Pass `{ items: [...] }` array
- Parser: Handle both array and wrapped object responses

---

## Phase 4: Prioritized Queue in UnifiedWorker (`syncGeneratorOptimized.ts`)

### 4.1 Define Priority Tiers
```typescript
enum JobPriority {
  CRITICAL = 1,    // deal_analysis, generateSailingsWithPricing
  HIGH = 2,        // generatePriceForecast
  BACKGROUND = 3,  // destination/market/booking insights, agent tasks
}
```

### 4.2 Refactor Queue Processing
- Single processing loop: always pop highest-priority available job
- **Strict spacing**: after each job completes, `await sleep(2500)` before next (enforces 2.5s minimum)
- Priority 3 jobs **only** run when queue has no P1/P2 jobs waiting
- Add `jobType` metadata to each queued item for observability

### 4.3 Remove Concurrency > 1
- `WORKER_POOL_SIZE = 1` (single worker, strict spacing does the rate limiting)
- Token bucket already enforces spacing; multiple workers would fight for tokens

---

## Phase 5: Deterministic Heuristic Fallbacks

### 5.1 `deal_analysis` Fallback (`analyticsOptimized.ts`)
```typescript
function heuristicDealAnalysis(sailing: SailingRecord): DealAnalysis {
  const ppd = sailing.pricing[0]?.perPersonPerDay ?? 150;
  const trend = sailing.priceHistory?.slice(-2) ?? [];
  const priceChange = trend.length === 2 
    ? (trend[1].total - trend[0].total) / trend[0].total 
    : 0;
  
  return {
    dealScore: priceChange < -0.05 ? 85 : priceChange > 0.05 ? 35 : 55,
    pricingDeepDive: `Heuristic: PPD $${ppd}, trend ${priceChange > 0 ? 'rising' : 'falling'} ${(Math.abs(priceChange)*100).toFixed(1)}%`,
    priceTrend: priceChange > 0.02 ? 'rising' : priceChange < -0.02 ? 'falling' : 'stable',
    shipExperience: 'AI analysis unavailable — based on fleet averages',
    insiderTips: ['Book early for best cabin selection', 'Monitor price drops 60-90 days out'],
    verdict: priceChange < -0.05 ? 'Strong buy signal' : 'Fair value',
    is_heuristic: true  // MARKER FLAG
  };
}
```

### 5.2 `price_forecast` Fallback
```typescript
function heuristicPriceForecast(current: number, daysUntil: number): PriceForecast {
  const volatility = 0.08; // 8% typical cruise volatility
  const trend = daysUntil < 30 ? 1.15 : daysUntil < 60 ? 1.08 : 1.03;
  return {
    currentPriceUsd: current,
    forecast7d: Math.round(current * (1 + volatility * 0.5)),
    forecast30d: Math.round(current * trend),
    confidenceScore: daysUntil < 14 ? 0.6 : 0.3,
    trendDirection: 'rising',
    is_heuristic: true
  };
}
```

### 5.3 Integration Points
- In `openCodeClient.ts` / `nimRateLimiter.ts`: catch `AllRetriesExhaustedError`
- Call fallback, log warning `[HEURISTIC] Using fallback for sailing ${id}`, return heuristic result
- Store with `is_heuristic: true` so UI can badge it

---

## File Modification Checklist

| File | Changes |
|------|---------|
| `server/utils/nimRateLimiter.ts` | DEFAULTS: rpm=30, burstSize=1, jitterFactor=0.5, maxBackoffMs=45000; add `mimo-v2.5-free: 30` to MODEL_LIMITS |
| `server/utils/openCodeClient.ts` | Remove local retry logic; delegate to `limiter.executeWithRetry` with OpenCode-specific options; add model to limits |
| `server/services/syncGeneratorOptimized.ts` | Add delta-checking before AI calls; refactor UnifiedWorker: priority queue, single worker, 2.5s spacing, P3 starvation prevention |
| `server/services/analyticsGenerators.ts` | Batch generators (ships, destinations, booking insights) into 5-10 item prompts; update parsers |
| `server/services/analyticsOptimized.ts` | Add heuristic fallback functions; wrap AI calls to catch exhaustion and fall back |

---

## Verification Steps

1. **TypeScript**: `cd server && npx tsc --noEmit` → 0 errors
2. **Unit Tests**: `cd server && npm test` → all pass (esp. `nimModelLimiter.test.ts`)
3. **Dry-run Sync**: `cd server && RUN_SYNC_ONLY=true npm run sync:build 2>&1 | head -100`
   - Expect: no 429s, jobs spaced ≥2.5s, P1/P2 complete before P3
4. **Rate Limit Simulation**: Hammer endpoint locally → verify token bucket enforces spacing
5. **Fallback Test**: Mock 429 on all retries → verify heuristic data written with `is_heuristic: true`

---

## Rollback Plan
```bash
git checkout server/utils/nimRateLimiter.ts server/utils/openCodeClient.ts server/services/syncGeneratorOptimized.ts server/services/analyticsGenerators.ts server/services/analyticsOptimized.ts
```