# Mega-Scaling Cruise Data Collection Plan

> **For Hermes:** Follow this plan task-by-task. Verify each gate before proceeding.

**Goal:** Scale TripTide's tracked sailings from 6 to **500+ within a week**, then **5,000+ within a month**, using a phased approach of parallelized NIM generation + Firecrawl scraping.

**Architecture:** Three co-existing data pipelines pipe into the `sailings` table via the `uq_sailing` upsert constraint. NIM handles synthetic volume, Firecrawl handles real-world scraping from aggregators, and pricing comes from NIM. A `sync_source` column (`'nim'`, `'firecrawl'`, `'cruise_api'`) tracks provenance. Every 4-hour cycle runs all active pipelines and merges fresh data.

**Current baseline:**
- 6 sailings, 50 pricing snapshots (all NIM-generated, nemotron-3-ultra-550b)
- 6 NIM API keys, 40 RPM each → 240 requests/min total throughput
- Current model: `nvidia/nemotron-3-ultra-550b-a55b` (large, slow per-call)
- 4-hour sync interval, 2 API calls per cycle (1 sailing gen + 1 pricing gen)

---

## Investigation Phase 0 (Research Findings)

### State of the Union

| Aspect | Current | Target |
|---|---|---|
| Tracked sailings | 6 | 500+ (week 1), 5,000+ (month 1) |
| NIM calls per cycle | 2 | 14+ (parallelized) |
| NIM model | nemotron-3-ultra-550b (slow) | llama-3.1-8b + nemotron-3 |
| Data sources | NIM only | NIM + Firecrawl + optional cruise APIs |
| Sync interval | 4h | 4h (unchanged) |
| Pricing records | ~50/cycle | ~4,000+/cycle |

### Data Source Analysis

| Source | Access Method | Sailings Available | Real Data | Cost | Priority |
|---|---|---|---|---|---|
| **NIM (scaled)** | Direct API (llama-3.1-8b) | 150-300/cycle | ❌ Synthetic | Free (credits) | **P0** |
| **VacationsToGo** | Firecrawl scrape | ~5,000+ | ✅ Real | Firecrawl credits | **P0** |
| **Carnival.com** | Direct curl/Firecrawl | ~500 | ✅ Real | Free | **P1** |
| **Cruise Critic** | Firecrawl scrape | ~3,000+ | ✅ Real | Firecrawl credits | **P1** |
| **CruiseCompete** | Firecrawl scrape (WAF) | ~10,000+ | ✅ Real | Firecrawl credits | **P2** |

### NIM Scaling Math

| Parameter | Current | With llama-3.1-8b |
|---|---|---|
| Sailing records per call | 5-9 | 25-35 |
| Output token limit | 8,192 | 8,192 (same) |
| Parallel calls (all keys) | 1 | 6 |
| **Sailings per cycle** | 5-9 | **150-210** |
| Pricing records per sailing | 8 | 8 |
| Pricing parallel calls | 1 | 6 |
| **Pricing records per cycle** | ~50 | **~4,000+** |
| Total API calls per cycle | 2 | 14+ |
| Estimated cycle duration | 15s | 2-3 min |

---

## Implementation Plan

### Phase 0: NIM Generator Optimization (Day 1)

**Goal:** Immediately boost sailing count using faster model + parallelism, with zero infrastructure changes.

#### Task 0.1: Add model-switching to NIM client

**Files:**
- Create: `server/utils/nimModels.ts`
- Modify: `server/utils/nimClient.ts`
- Modify: `server/services/nimSyncGenerator.ts`

**Step 1:** Create a model registry file:

```
server/utils/nimModels.ts
```

```typescript
/**
 * NIM model registry — maps model names to their capabilities.
 * Use faster models for bulk generation, slower models for high-quality pricing.
 */
export const NIM_MODELS = {
  /** Fast, cheap — ideal for bulk sailing generation */
  FAST: 'meta/llama-3.1-8b-instruct',
  /** Balanced — good for structured JSON with moderate quality */
  BALANCED: 'mistralai/mixtral-8x22b-v0.1',
  /** High quality — for pricing and checkout data */
  PREMIUM: 'nvidia/nemotron-3-ultra-550b-a55b',
} as const;
```

**Step 2:** Update `nimSyncGenerator.ts` to accept model override in each generator function:

```typescript
// Add model param to generateSailings
export async function generateSailings(
  count: number = 25 + Math.floor(Math.random() * 10),
  model: string = NIM_MODELS.FAST  // Default to fast model
): Promise<SailingRecord[]> {
  // ... existing code but pass model to callNim
  const response = await callNim([...], { 
    temperature: 0.5, 
    max_tokens: 8192,
    model  // pass the model override
  });
```

**Step 3:** Add `batchSailings` function — generates sailings in parallel across all 6 keys:

```typescript
export async function batchGenerateSailings(
  total: number = 180,
  batchSize: number = 30,
): Promise<SailingRecord[]> {
  const batches = Math.ceil(total / batchSize);
  const promises: Promise<SailingRecord[]>[] = [];
  
  for (let i = 0; i < batches; i++) {
    const actualCount = Math.min(batchSize, total - i * batchSize);
    // Vary the prompt slightly each batch for diversity
    const seed = `batch_${i}_${Date.now()}`;
    promises.push(generateSailings(actualCount, NIM_MODELS.FAST));
  }
  
  const results = await Promise.allSettled(promises);
  const allSailings: SailingRecord[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allSailings.push(...r.value);
    else console.error('[NIM] Batch generation failed:', r.reason);
  }
  return allSailings;
}
```

**Step 4:** Update `hybridEngine.ts` to use `batchGenerateSailings` instead of `generateSailings` in Phase 1.

**Step 5:** Parallelize pricing generation with batch approach too.

**Step 6:** Test:
- Run `npx tsc --noEmit` — 0 errors
- Start server, wait for sync cycle
- Verify: `curl -s http://localhost:3001/api/stats` — `trackedSailings` should be 150+
- Verify: `psql -d triptide -c "SELECT COUNT(*) FROM sailings WHERE sync_source='nim' AND sync_status='active';"` — 150+

#### Task 0.2: Add sync_log performance tracking

**Modify:** `server/services/hybridEngine.ts`

Add timing columns to the sync_log UPDATE so we know:
- `duration_seconds` (existing, fix to compute correctly)
- `nim_calls` — count of NIM API calls made in this cycle
- `pipeline_details` — JSONB with breakdown per phase

*Note: This is optional but helpful for monitoring scaling progress.*

---

### Phase 1: Firecrawl Integration (Day 2-3)

**Goal:** Add real cruise data from VacationsToGo and Carnival.com using Firecrawl's LLM extraction mode, producing 1,000+ real sailings per cycle.

#### Prerequisites (before implementation)

1. Sign up for Firecrawl (free tier: 500 pages/month, Hobby: $19/mo for 1,500 pages, Growth: $79/mo for 5,000 pages)
2. Get Firecrawl API key
3. Add `FIRECRAWL_API_KEY` to `app.env`

#### Task 1.1: Create Firecrawl service wrapper

**Create:** `server/services/firecrawlScraper.ts`

```typescript
/**
 * TripTide — Firecrawl Scraper
 * 
 * Scrapes cruise aggregator websites using Firecrawl's LLM extraction mode
 * to extract structured sailing data.
 */

import { getPool } from '../db/pool';
import { SailingRecord } from './hybridEngine';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1';
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || '';

interface ScrapeTarget {
  name: string;
  url: string;
  /** Firecrawl extract schema prompt describing what to extract */
  schemaDescription: string;
  /** How many pages to scrape (automated pagination) */
  maxPages?: number;
  /** JS rendering needed? */
  waitForJs?: boolean;
}
```

The scraper should:
1. Accept a target config (URL, schema description)
2. Call Firecrawl's `/v1/scrape` with `extract` mode
3. Parse the returned structured data into `SailingRecord[]`
4. Handle pagination by following "Next" links or numbered pages
5. Return an array of records

**Target 1: VacationsToGo**

```
Name: VacationsToGo
URL: https://www.vacationstogo.com/cruise_specials.cfm
Schema description:
  Extract cruise sailing data from each listing card. Each card has:
  - cruiseLine: cruise line name
  - shipName: ship name
  - departureDate: departure date
  - durationDays: number of nights
  - departurePort: city where cruise departs
  - destinationRegion: Caribbean, Alaska, Europe, etc.
  - itinerary: list of port stops
  - cabinPricing: object with Inside, Oceanview, Balcony, Suite prices
Max pages: 50 (VacationsToGo has ~100 pages of results)
```

**Target 2: Carnival.com**

```
Name: Carnival
URL: https://www.carnival.com/cruise-ships.aspx
Schema description:
  Extract cruise sailing data from Carnival's cruise listing grid...
```

#### Task 1.2: Add Firecrawl phase to the sync cycle

**Modify:** `server/services/hybridEngine.ts`

Add Phase 1b after NIM generation:

```typescript
// ── PHASE 1b: Firecrawl scraping ──
if (process.env.FIRECRAWL_API_KEY) {
  console.log('');
  console.log('── PHASE 1b: FIRECRAWL SCRAPING ──');
  const { scrapeCruiseData } = await import('./firecrawlScraper');
  const firecrawlRecords = await scrapeCruiseData();
  console.log(`[FIRECRAWL] Scraped ${firecrawlRecords.length} sailings`);
  // Merge with nimRecords, upsert to DB
  ...
}
```

Firecrawl records should:
1. Be upserted into sailings with `sync_source = 'firecrawl'`
2. Take priority over NIM records (when matching on cruise_line + ship_name + departure_date)
3. If Firecrawl provides pricing data, insert into pricing_snapshots with `captured_by = 'firecrawl'`

#### Task 1.3: Rate limit and retry handling

Firecrawl has rate limits depending on tier. The wrapper should:
- Cap concurrent scraping at 2 pages (to stay under Hobby/Growth limits)
- Retry with exponential backoff on 429
- Track per-scrape-page success/failure in sync_log

#### Task 1.4: Verification

After implementation:
1. Run `npx tsc --noEmit` — 0 errors
2. Trigger a manual sync: `curl -X POST http://localhost:3001/api/engine/sync`
3. Check: `curl -s http://localhost:3001/api/stats` — expect `trackedSailings` to be 1,000+
4. Query: `psql -d triptide -c "SELECT sync_source, COUNT(*) FROM sailings WHERE sync_status='active' GROUP BY sync_source;"`
5. Verify real data exists (cruise_line, ship_name should reflect actual cruise lines)

---

### Phase 2: NIM + Firecrawl Fusion Pipeline (Day 4-5)

**Goal:** Optimize the merged pipeline — NIM fills data gaps that Firecrawl can't provide (pricing, cabin categories, ship class), and Firecrawl provides real schedule data with accurate dates/ports.

#### Task 2.1: Firecrawl → NIM pricing enrichment

When Firecrawl scrapes a sailing that has no pricing data, the pipeline should:
1. Firecrawl returns partial records (schedule fields only, no cabin pricing)
2. NIM pricing generator runs against Firecrawl-sourced sailings (using ship_name, cruise_line, duration to generate realistic pricing)
3. Pricing records get `captured_by = 'nim_fallback'`

This ensures every sailing has pricing, whether scraped or generated.

**Modify:** `server/services/hybridEngine.ts`

After Firecrawl scraping, if some sailings lack pricing:
```typescript
const sailingsNeedingPricing = firecrawlRecords.filter(s => !s.hasCabinPricing);
if (sailingsNeedingPricing.length > 0) {
  const nimPricing = await batchGeneratePricing(sailingsNeedingPricing);
  // Write to pricing_snapshots with captured_by='nim_fallback'
}
```

#### Task 2.2: Deduplication strategy

The `uq_sailing` index on `(cruise_line, ship_name, departure_date)` already prevents duplicates. But tie-breaking logic:

| Source Priority | Source | Reason |
|---|---|---|
| 1 (highest) | firecrawl | Real data, accurate dates/ports |
| 2 | cruise_api | Direct API, most accurate |
| 3 | nim | Synthetic, lowest priority |

Implement in `syncB2BSchedules`:
- When upserting, set `sync_source = 'firecrawl'` if Firecrawl has the record
- NIM records only fill in when no Firecrawl record exists for that (cruise_line, ship_name, departure_date)

Current upsert logic already skips NIM on conflict — extend to give Firecrawl higher priority.

#### Task 2.3: Stale data cleanup

Add a TTL-based cleanup:
- NIM records older than 7 days → `sync_status = 'stale'` → deleted
- Firecrawl records older than 14 days → stale → deleted
- This keeps the database at a manageable size (target: 5,000-10,000 active sailings)

---

### Phase 3: Performance & Scale Optimization (Day 6-7)

**Goal:** Ship fast, efficient, and reliable at 5,000+ sailings.

#### Task 3.1: Paginated /api/deals endpoint

Current `/api/deals` returns all active sailings. With 5,000+ sailings, this endpoint will be slow and the UI will be overwhelmed. Add:
- Pagination (page, limit params, defaults to page=1, limit=20)
- Server-side sorting (by date, price, duration)
- Cursor-based navigation for infinite scroll
- Indexed query: `WHERE sync_status='active' ORDER BY departure_date LIMIT $1 OFFSET $2`

#### Task 3.2: Homepage stat badge

The hero stat "Live price intelligence · X sailings tracked" already fetches from `/api/stats`. Ensure the stats endpoint can handle the load with a cached query (cache for 60 seconds, serve stale on miss).

#### Task 3.3: Sync cycle monitoring

Add monitoring to the `/api/health` endpoint:
- `activeSailings` — current count
- `lastSyncDuration` — in seconds
- `nimCallsLastCycle` — number of NIM API calls
- `firecrawlPagesLastCycle` — number of Firecrawl scrape pages

---

### Phase 4: Additional Data Sources (Week 2+)

**Optional expansions once core pipeline is stable:**

1. **Cruise Critic reviews scraping** — extract ship ratings, cabin recommendations
2. **Port/Harbor schedules** — get real departure times for each port (adds `departureTime`, `arrivalTime` to schema)
3. **Historical pricing** — NIM generates price trends across 12-month window (enables sparkline graphs)
4. **Air+Sea packages** — scrape flight+hotel+cruise combos from aggregators

---

## Definition of Done

### Phase 0 Gates
- [ ] `npx tsc --noEmit` passes with 0 errors after all Phase 0 changes
- [ ] `npx vitest run` — 27/27 passes
- [ ] `npx playwright test` — 18/18 passes
- [ ] Manual sync produces 150+ sailings (verify via `/api/stats`)
- [ ] Pricing generation produces 1,000+ records per cycle
- [ ] All 6 NIM keys utilized during sync (verify via server logs)
- [ ] Sync cycle completes in under 5 minutes

### Phase 1 Gates
- [ ] Firecrawl API key validated (endpoint responds)
- [ ] VacationsToGo scrape produces 200+ real sailings in a single run
- [ ] Firecrawl records have `sync_source = 'firecrawl'` in DB
- [ ] Upsert deduplication works (no duplicate cruise_line+ship_name+departure_date combos)
- [ ] 500+ total active sailings in DB across all sources
- [ ] Sync cycle completes in under 15 minutes

### Phase 2 Gates
- [ ] Firecrawl-sourced sailings without pricing get NIM-generated fallback pricing
- [ ] priority field matches expected behavior (Firecrawl > NIM)
- [ ] Stale NIM records older than 7 days cleaned up
- [ ] 5,000+ active sailings maintained long-term

### Phase 3 Gates
- [ ] `/api/deals` responds in <200ms with 5,000+ sailings
- [ ] Pagination working in frontend (page controls, infinite scroll)
- [ ] Stats endpoint cached, responds in <50ms
- [ ] Health endpoint shows sync metrics

---

## Files-Touched Summary

| Phase | Files | Action |
|---|---|---|
| 0 | `server/utils/nimModels.ts` | Create |
| 0 | `server/utils/nimClient.ts` | Modify (accept model override) |
| 0 | `server/services/nimSyncGenerator.ts` | Modify (add batch funcs, model param) |
| 0 | `server/services/hybridEngine.ts` | Modify (use batch generation, parallel pricing) |
| 1 | `server/services/firecrawlScraper.ts` | Create |
| 1 | `server/services/hybridEngine.ts` | Modify (add Firecrawl phase) |
| 1 | `app.env` | Modify (add FIRECRAWL_API_KEY) |
| 2 | `server/services/hybridEngine.ts` | Modify (priority logic, stale cleanup) |
| 3 | `server/routes/cruises.ts` | Modify (pagination, indexing) |
| 3 | `server/index.ts` | Modify (stats caching) |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| NIM rate limit exhaustion (240 req/min) | Medium | High | Use fast model; stagger parallel calls with 500ms delay; cap at 12 concurrent |
| Firecrawl blocks VacationsToGo | Low | High | Rotate to alternate aggregator; try direct curl as fallback |
| VacationsToGo changes page structure | Medium | Medium | Use LLM extraction (resilient to layout changes) |
| 5,000+ sailings slow down `/api/deals` | High | High | Pagination + indexing are P0 for Phase 3 |
| Pricing generation becomes bottleneck | Medium | Medium | Model size tradeoff: fast model for pricing too, accept less realistic numbers |
| 6 NIM keys exhaust free credits | Low | Low | Estimated $0 at current usage — NV credits sufficient for 10K+ calls/mo |

---

## Execution Order

```
Phase 0 (Day 1)
├── Task 0.1: NIM model registry + batch generation
├── Task 0.2: Sync_log performance tracking
└── Verify: 150+ sailings

Phase 1 (Day 2-3)
├── Task 1.1: Firecrawl service wrapper
├── Task 1.2: Integrate into sync cycle
├── Task 1.3: Rate limit handling
└── Verify: 500+ sailings

Phase 2 (Day 4-5)
├── Task 2.1: Pricing enrichment for scraped sailings
├── Task 2.2: Dedup priority logic
├── Task 2.3: Stale data cleanup
└── Verify: 5,000+ sailings

Phase 3 (Day 6-7)
├── Task 3.1: Paginated deals endpoint
├── Task 3.2: Stats caching
├── Task 3.3: Sync monitoring
└── Verify: All gates pass
```
