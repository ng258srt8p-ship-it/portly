# Updated Plan: Firecrawl Integration + OpenCode AI Coexistence

## Key Decision: Firecrawl ≠ AI Replacement

**Firecrawl's role:** Data extraction only (harvest real cruise inventory from public websites)  
**OpenCode's role:** Deal analysis, price forecasting, market commentary (AI intelligence layer)

**Architecture remains:**
```
┌─────────────────────────────────────────────────────────────┐
│ PHYSICAL LAYER (Firecrawl)                                   │
│ - Scrape Royal Caribbean, Carnival, Norwegian, etc.         │
│ - Extract: ship, dates, cabin prices, itinerary             │
│ - Output: Structured JSON → database                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ INTELLIGENCE LAYER (OpenCode)                               │
│ - Parse firecrawl markdown → deal quality scores           │
│ - Generate price forecasts (trends, reversions, patterns)   │
│ - Write insider analysis ("cruise expert" tone)             │
│ - Output: deal_analysis, price_forecast fields              │
└─────────────────────────────────────────────────────────────┘
```

**Cost model:**
- **Firecrawl:** ~$0 (free tier: 100 req/hr, 10 URLs/run × 26 runs/day × 30 days = 7,800 URLs/mo, still under most paid tiers)
- **OpenCode:** Free tier (deepseek-v4-flash-free), no cost for analysis

**Sync Pipeline (updated):**
```
Phase 1: FIRECRAWL (data collection)
  → Scrape 10 URLs → parse → insert sailings + pricing_snapshots

Phase 2: OPENCODE (AI analysis)
  → Read new sailings → generate deal_analysis + price_forecast
  → Update sailings.deal_analysis field only

Phase 3: RULES-BASED (optional)
  → Simple heuristics: "price dropped >15% = buy signal"
  → Fallback to rules if OpenCode 429s
```

---

## Implementation Changes from Original Plan

### Files Modified

| File | Change |
|------|--------|
| `server/runFirecrawlSync.ts` | **RETAINED** — Data extraction layer only |
| `server/services/hybridEngineOptimized.ts` | **PRESERVED** — OpenCode analysis runs AFTER firecrawl completes |
| `server/services/hybridEngineOptimized.ts` | **MODIFIED** — Phase 1 now calls firecrawl sync, Phase 2 calls OpenCode |

### Sync Flow (revised)

```typescript
// server/services/hybridEngineOptimized.ts
export async function runOptimizedSyncCycle() {
  // PHASE 1: Data collection (Firecrawl)
  const firecrawlResult = await runFirecrawlSync(); // <-- NEW
  
  if (firecrawlResult.status === 'failed') {
    console.warn('[SYNC] Firecrawl failed, using cached data + NIM fallback');
    // Don't abort entire cycle, just mark data as stale
  }
  
  // PHASE 2: AI analysis (OpenCode — PRESERVED)
  const analysisResult = await generateDealAnalysis(
    // Only analyze sailings that are NEW or have CHANGED
    firecrawlResult.newSailingIds
  );
  
  // PHASE 3: Rules-based fallback (optional)
  // Run if OpenCode returns 429s or times out
  
  return {
    status: 'completed',
    firecrawl: firecrawlResult,
    openCode: analysisResult,
  };
}
```

---

## Firecrawl 65-Minute Interval (Updated Rationale)

**Original constraint:** Stay within free tier (~100 req/hr)  
**New constraint:** Don't conflict with OpenCode's 4-hour sync cycle

**Solution:**
- **Firecrawl runs every 65 minutes** → ~23 runs/day → ~138 days on free tier
- **OpenCode runs every 4 hours** → 6 times/day → analyzes results from last firecrawl batch
- **Alignment:** OpenCode triggers *after* each successful firecrawl batch (not on its own schedule)

**Hybrid sync timeline:**
```
06:00 — Firecrawl (10 URLs) → insert sailings 001-010
06:02 — OpenCode analysis  → write deal_analysis for sailings 001-010

07:05 — Firecrawl (10 URLs) → insert sailings 011-020
07:07 — OpenCode analysis  → write deal_analysis for sailings 011-020

08:10 — Firecrawl (10 URLs) → insert sailings 021-030
08:12 — OpenCode analysis  → write deal_analysis for sailings 021-030

... repeat every 65 minutes ...

12:30 — OpenCode batch analysis → re-scan ALL sailings for trend shifts
```

---

## OpenCode Integration Points (Preserved)

These OpenCode capabilities **remain unchanged**:

| Feature | OpenCode Call Location | Firecrawl Impact |
|---------|------------------------|------------------|
| **Deal Analysis** | `server/services/hybridEngineOptimized.ts` → Phase 2 | Firecrawl feeds data, OpenCode writes analysis |
| **Price Forecast** | `server/services/hybridEngineOptimized.ts` → Phase 2 | Firecrawl gives baseline, OpenCode adds prediction |
| **Market Commentary** | `server/services/analyticsGenerators.ts` | No change |
| **Ship Enrichment** | `server/services/analyticsGenerators.ts` | No change |
| **Destination Insights** | `server/services/analyticsGenerators.ts` | No change |

---

## Risk Mitigation (Dual-Source Safety)

| Failure Mode | Firecrawl Fallback | OpenCode Fallback |
|--------------|--------------------|-------------------|
| API downtime | Use cached DB rows (last 24h) | Use cached analysis (last 7 days) |
| Rate limiting (429) | Wait 5 minutes, retry | Queue for next cycle |
| Scraper breakage | Disable cruise line, alert | N/A (OpenCode unaffected) |
| Data gap | Use NIM-synthetic as temp fallback | Use rules-based heuristics |

---

## Updated Implementation Checklist

### Phase 1: Firecrawl POC (2-3 hrs) ✅ STARTED
- [x] Create `firecrawlClient.ts`
- [x] Create `runFirecrawlSync.ts` with 65-min logic
- [x] Configure 10 URLs per run
- [ ] **Get FIRECRAWL_API_KEY**
- [ ] Run manual test: `npx ts-node server/runFirecrawlSync.ts`
- [ ] Verify extraction output (markdown vs JSON)
- [ ] **Document DOM selectors per cruise line**

### Phase 2: Data Parsing + DB Upsert (4-6 hrs)
- [ ] Create `server/utils/cruiseLineParsers.ts`
  - `parseRoyalCaribbean(markdown): SailingRecord[]`
  - Extract: ship, dates, itinerary, cabinPrices[], fees
- [ ] Implement `upsertScrapedData()` in `runFirecrawlSync.ts`
- [ ] Add `firecrawl_source` flag to `sailings.firecrawl_source` (boolean, default false)
- [ ] Add `scraped_at` timestamp to `pricing_snapshots`
- [ ] Write parser test suite (5 cruise line DOMs)

### Phase 3: Hybrid Sync Integration (3-4 hrs)
- [ ] Modify `hybridEngineOptimized.ts`:
  - Call `runFirecrawlSync()` as Phase 1
  - Pass `firecrawlResult.newSailingIds` to OpenCode analyzer
  - Skip OpenCode if firecrawl returns 0 new sailings (efficiency)
- [ ] Add telemetry:
  - `firecrawl_success_rate` (valid_extractions / total_urls)
  - `firecrawl_credits_used` (daily total)
  - `opencode_wasted_calls` (0 if no new data = no analysis calls)

### Phase 4: Cron Scheduling + Monitoring (2-3 hrs)
- [ ] Add cron job: `server/services/firecrawlScheduler.ts`
  - Every 65 minutes: `node -e "require('./server/runFirecrawlSync').run()"`
  - OR: integrate into existing sync engine (if already has scheduler)
- [ ] Admin endpoint: `POST /api/firecrawl/dump` (manual trigger)
- [ ] Status endpoint: `GET /api/firecrawl/status/:jobId`
- [ ] Log rotation: `server/logs/firecrawl-sync.log` (daily, 30-day retention)
- [ ] Alert rule: Firecrawl success rate < 50% → Slack/email

---

## API Key Requirements

| Service | API Key | Environment Var | Required? |
|---------|---------|-----------------|-----------|
| **Firecrawl** | `fc-xxx` (from firecrawl.dev) | `FIRECRAWL_API_KEY` | **Yes** — Data collection |
| **OpenCode** | Free tier (auto-rotating) | `OPENCODE_API_KEY` (optional) | **Yes** — Analysis layer |

**Do NOT mix up endpoints:**
- Firecrawl: `https://api.firecrawl.dev/v1/scrape`
- OpenCode: `https://opencode.ai/zen/v1` (existing in `openCodeClient.ts`)

---

## Testing Checklist (Post-Integration)

| Test | Expected Result |
|------|-----------------|
| Run Firecrawl POC (`npx ts-node server/runFirecrawlSync.ts`) | 10 URLs scraped, 8+ success, markdown output |
| Run hybrid sync (`npm run server:sync`) | Firecrawl → insert sailings, OpenCode → analyze only new sailings |
| Load `/deals` page | Mix of firecrawl data (new) + OpenCode analysis (fresh) |
| Load sailing detail | Real data with insider analysis |
| Check 65-min interval | Cron runs every 65 min, not conflicting with OpenCode |
| Verify cost | Firecrawl ~0 credits/day (free tier), OpenCode ~6 calls/day (free tier) |

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| **Firecrawl ≠ OpenCode replacement** | Keep AI intelligence layer separate from data extraction |
| **65-min Firecrawl interval** | Maximize free tier coverage without impacting OpenCode |
| **Hybrid sync orchestration** | Firecrawl → insert data, OpenCode → write analysis (sequential) |
| **Start with Royal Caribbean only** | Best DOM consistency, lowest risk |
| **Preserve OpenCode free tier** | No cost for analysis, no need to upgrade |
| **Cron in scheduler vs standalone** | Integrate into existing sync engine to avoid duplicate cron management |

---

## Next Steps (Immediate)

1. **Get Firecrawl API key** — Sign up at firecrawl.dev (free)
2. **Run manual test** — `npx ts-node server/runFirecrawlSync.ts`
3. **Inspect output** — What did Firecrawl extract? (markdown, structure, gaps)
4. **Implement parser** — `parseRoyalCaribbean()` handles extracted content
5. **Wire into hybrid engine** — Phase 1 → Phase 2 flow

---

**Status:** Phase 1 POC files created. Awaiting API key for testing.

**Plan updated:** 2026-07-14T18:58:00Z (Firecrawl ≠ OpenCode replacement, 65-min interval)