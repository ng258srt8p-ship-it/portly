# Plan: Firecrawl Integration for Cruise Data Scraping

**Execution Status:** Phase 1 POC complete. Firecrawl client and cron sync implemented. Ready for API key + manual test.

**Update (2026-07-14):**
- ✅ Created `server/services/firecrawlClient.ts` — HTTP wrapper with rate limiting
- ✅ Created `server/runFirecrawlSync.ts` — Sync job generator, 65-min interval cron
- ✅ Configured to scrape 10 Royal Caribbean URLs per run (stays within ~100 req/hr free tier)
- ⏳ Awaiting FIRECRAWL_API_KEY for POC testing

---

## Problem Statement

**Current state:** All 507 sailings use NIM-generated (synthetic) data. No real cruise inventory, pricing, or sailing schedules.

**Goal:** Use Firecrawl to scrape real cruise data from public booking sites (Royal Caribbean, Carnival, Norwegian, etc.) and populate the database with authentic inventory.

---

## Firecrawl Overview

Firecrawl is a general-purpose web scraping service that:
- Crawls HTML pages and returns structured JSON
- Supports multi-page scraping with pagination
- Extracts text, tables, and DOM elements via CSS selectors
- Handles anti-bot bypass (rotating proxies, JavaScript rendering)
- Returns clean markdown or structured JSON

**Key endpoints:**
```
POST https://api.firecrawl.dev/v1/scrape     — Single URL extraction
POST https://api.firecrawl.dev/v1/crawl      — Multi-page crawl job
GET  https://api.firecrawl.dev/v1/crawl/:id  — Check job status
```

**Auth:** API key header `Authorization: Bearer $FIRECRAWL_API_KEY`

---

## Data Sources to Scrape

| Cruise Line | Price Range | Sites to Target | Scraping Difficulty |
|-------------|-------------|-----------------|---------------------|
| **Royal Caribbean** | Public | `royalcaribbean.com/cruises` → `/cruises/{ship}?departureDate={date}&departurePort={port}` | Medium (React SPA) |
| **Carnival** | Public | `carnival.com/cruises` → search results | Medium (React SPA) |
| **Norwegian** | Public | `ncl.com/cruises` → search results | Medium (React SPA) |
| **Princess** | Public | `princess.com/cruises` → search results | Medium (React SPA) |
| **Holland America** | Public | `hollandamerica.com/cruises` → search results | Medium (React SPA) |

**Why not API?** As documented in `cruise-apis-2026-07.md`:
- Most cruise line APIs require B2B partner agreements
- No public JSON APIs exist for real-time pricing
- Firecrawl bypasses the need for direct API access
- Output can be normalized to match our existing schema

---

## Feasibility Assessment

### What Firecrawl Can Extract

| Data Element | Firecrawl Capability | Confidence |
|--------------|----------------------|------------|
| **Ship name** | CSS selector (e.g., `h2.ship-name`) | 95% |
| **Sailing date** | URL param or page content | 95% |
| **Duration** | Page content (e.g., "7-night cruise") | 90% |
| **Departure port** | Page content or itinerary section | 90% |
| **Cabin categories** | Price card grid or table rows | 85% |
| **Base fare per cabin** | Price text elements | 85% |
| **Port fees/taxes** | Fine print or breakdown section | 70% |
| **Availability count** | "Only X left at this price" patterns | 60% |
| **Itinerary ports** | Itinerary section or map | 90% |

### Known Challenges

| Challenge | Mitigation |
|-----------|------------|
| **JavaScript rendering** | Firecrawl supports `wait` and `mobile` options for SPA pages |
| **Dynamic pricing** | Scrape multiple times per day; store historically |
| **Anti-scraping measures** | Firecrawl handles proxy rotation and UA spoofing |
| **Variable DOM structures** | Build per-cruise-line scrapers with custom selectors |
| **Missing fee breakdown** | If not visible on page, fallback to industry averages |
| **Rate limits** | Firecrawl has tiered limits (100 req/hr free, customizable paid) |
| **Cost per scrape** | Free tier ~100 credits/hour; paid plans start at ~$49/mo |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FIRECRAWL SYNCHRONIZATION                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Trigger: Manual or scheduled (e.g., daily at 6am)             │
│                                                                 │
│  ┌────────────────────┐    ┌─────────────────────────────────┐ │
│  │  1. Build URLs     │ -> │  Generate URLs per ship/route   │ │
│  │  (search queries)  │    │  e.g., RCL-Icon-of-the-Seas-7nt │ │
│  └────────────────────┘    └─────────────────────────────────┘ │
│                              ↓                                  │
│  ┌────────────────────┐    ┌─────────────────────────────────┐ │
│  │  2. Firecrawl      │ -> │  Batch scrape 10-20 URLs at a   │ │
│  │     Batch Crawl    │    │  time (ffmsql job queue)  │ │
│  └────────────────────┘    └─────────────────────────────────┘ │
│                              ↓                                  │
│  ┌────────────────────┐    ┌─────────────────────────────────┐ │
│  │  3. Parse &        │ -> │  Extract cabin_price, fee_break-│ │
│  │     Normalize      │    │  down, availability from HTML   │ │
│  └────────────────────┘    └─────────────────────────────────┘ │
│                              ↓                                  │
│  ┌────────────────────┐    ┌─────────────────────────────────┐ │
│  │  4. Upsert to DB   │ -> │  INSERT/UPDATE sailings,        │ │
│  │     Hybrid Engine  │    │  pricing_snapshots              │ │
│  └────────────────────┘    └─────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Firecrawl Setup & Single-URL Proof of Concept (2-3 hrs)

**Goal:** Verify Firecrawl can extract cruise pricing from one Royal Caribbean page.

**Tasks:**
1. Register for Firecrawl account (free tier)
2. Get API key
3. Install `firecrawl-node` SDK or use raw HTTP calls
4. Write `server/services/firecrawlClient.ts` — wrapper client
5. Create test script `server/testing/firecrawl-POC.ts`
   - Target: `https://www.royalcaribbean.com/cruises/icon-of-the-seas`
   - Expected output: Page title, h1, price cards, itinerary list
6. Manually inspect rendered HTML on Royal Caribbean site
7. Define CSS selectors for:
   - Ship name: `h1, h2.ship-name`
   - Cabin prices: `.price-card .price`, `.cabin-row .total-price`
   - Duration: `.itinerary .duration`
   - Departure port: `.departure-port`
8. Run POC and document what was extracted vs what was missed

**Success criteria:**
- Firecrawl returns JSON with at least `shipName`, `sailDate`, `cabinPrices[]`
- Response includes fee breakdown (or at least total price)
- Extractions match manual inspection of the webpage

---

### Phase 2: Multi-URL Crawl Job + Parsing Logic (4-6 hrs)

**Goal:** Extract data from 10+ sailings across multiple cruise lines.

**Tasks:**
1. Create `server/services/firecrawlSynchronizer.ts`
   - Generates search URLs per cruise line
   - Batches Firecrawl crawl jobs
   - Polls job status + collects results
2. Write per-cruise-line parsers in `server/utils/cruiseLineParsers.ts`
   - `parseRoyalCaribbean(html): SailingData`
   - `parseCarnival(html): SailingData`
   - `parseNorwegian(html): SailingData`
   - etc.
3. Create normalizer: `server/utils/normalizeCruiseData.ts`
   - Map HTML extractions → `SailingRecord` schema
   - Handle missing fields with fallbacks
   - Resolve cabin category codes (IS/OB/BA/SU)
4. Add Firecrawl rate limiter in `server/utils/firecrawlLimiter.ts`
   - Token bucket with per-campaign limits
   - Retry on 429s with exponential backoff
5. Test with 10 URLs across 3 cruise lines
6. Validate DB rows match expected schema

**Success criteria:**
- Successfully scrape 10+ unique sailings
- Each sailing has: cruiseLine, shipName, sailDate, duration, departurePort, destinationRegion, itinerary, cabinPrices[]
- At least 80% of extracted rows pass schema validation
- Rate limiter prevents over-usering

---

### Phase 3: Database Upsert + Sync Pipeline Integration (3-4 hrs)

**Goal:** Wire Firecrawl sync into the existing hybrid engine sync cycle.

**Tasks:**
1. Create `server/services/firecrawlSyncCycle.ts`
   - New sync phase: "Firecrawl Data Collection"
   - Runs before NIM generation (optional) or replaces NIM entirely
2. Modify `server/services/hybridEngineOptimized.ts`
   - Add Firecrawl sync as Phase 1 (inventory + pricing source)
   - NIM generation becomes Phase 2 (analysis only)
3. Create idempotent upsert logic:
   - `UPSERT sailings ON CONFLICT (cruise_line, ship_name, departure_date, itinerary_hash)`
   - `UPSERT pricing_snapshots ON CONFLICT (sailing_id, cabin_type, captured_at)`
4. Add telemetry:
   - Count of sailings scraped per cruise line
   - Mean extraction confidence score
   - Failure rate by selector

**Success criteria:**
- Sync cycle runs end-to-end with Firecrawl
- Database has real sailings from Firecrawl
- NIM is only used for analysis (not inventory/pricing)
- Telemetry logs show extraction quality metrics

---

### Phase 4: Automated Scheduling & Monitoring (2-3 hrs)

**Goal:** Make Firecrawl sync run automatically with observability.

**Tasks:**
1. Add cron job in `server/services/firecrawlScheduler.ts`
   - Daily at 6am (low traffic window)
   - Or trigger-based (when NIM-generated data ages >24h)
2. Create admin endpoint `POST /api/firecrawl/dump`
   - Triggers manual sync on demand
   - Returns job ID for status tracking
3. Build `GET /api/firecrawl/status/:jobId`
   - Returns progress: "scraping 12/20 URLs", "parsing", "upserting"
4. Add logging to `server/logs/firecrawl-sync.log`
   - Per-job summary: "Extracted 20 sailings, 85% success rate"
   - Alert on <50% success rate or cost > threshold
5. Update `.env.example` with Firecrawl config:
   ```
   FIRECRAWL_API_KEY=fc-xxx
   FIRECRAWL_BASE_URL=https://api.firecrawl.dev/v1
   FIRECRAWL_RATE_LIMIT=100  # reqs/hour
   FIRECRAWL_ENABLED=true
   ```

**Success criteria:**
- Cron job runs daily without manual intervention
- Admin UI can trigger manual sync
- Logs show extraction quality + cost metrics
- Alerts trigger on extraction failure spikes

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `server/services/firecrawlClient.ts` | CREATE | HTTP wrapper for Firecrawl API |
| `server/services/firecrawlSynchronizer.ts` | CREATE | Multi-URL batch scraper + parser |
| `server/utils/cruiseLineParsers.ts` | CREATE | Per-cruise-line HTML extractors |
| `server/utils/normalizeCruiseData.ts` | CREATE | Standardize to `SailingRecord` |
| `server/services/firecrawlSyncCycle.ts` | CREATE | Firecrawl as sync phase |
| `server/services/firecrawlScheduler.ts` | CREATE | Daily cron job |
| `server/routes/firecrawl.ts` | CREATE | Admin endpoints |
| `server/services/hybridEngineOptimized.ts` | MODIFY | Wire Firecrawl as Phase 1 |
| `server/routes/cruises.ts` | MODIFY | Add Firecrawl source flag |
| `server/db/migration_v2.sql` | MODIFY | Add `firecrawl_source` flag |
| `.env.example` | MODIFY | Add Firecrawl env vars |
| `server/logs/firecrawl-sync.log` | CREATE | Sync telemetry log |

---

## Cost & Scaling Projections

| Metric | Estimate | Cost Model |
|--------|----------|------------|
| **Scrapes per day** | 50-200 URLs | Varies by cruise line count |
| **Pages per scrape** | 1-3 (search results + detail pages) | Firecrawl cost per URL |
| **Firecrawl credits** | 1 per URL scraped | Free tier: ~100 req/hr |
| **Monthly credit need** | 1,500-6,000 credits | 50-200 URLs/day × 30 days |
| **Free tier coverage** | ~1,500 credits/mo | ~50 URLs/day limit |
| **Paid tier (Starter)** | $49/mo for 5,000 credits | If >50 URLs/day needed |
| **Paid tier (Pro)** | $199/mo for 25,000 credits | If real-time updates needed |

**Recommendation:** Start with free tier. If extraction quality is good, upgrade to Starter plan (~$50/mo) for higher volume or more selective scraping.

---

## Technical Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| **Firecrawl rate limits** | High | Implement token bucket, batch in 10-URL chunks |
| **Cruise line DOM changes** | Medium | Keep per-line parsers isolated; monitor failure rates |
| **Missing data fields** | Medium | Fallback to industry averages for fees; log gaps |
| **Cost overages** | Low | Track credit usage per sync; alert at 80% threshold |
| **Anti-scraping blocks** | Medium | Firecrawl handles proxy rotation; add retry logic |
| **Legal/ToS violations** | Low-Medium | Check cruise line ToS; consider B2B relationships for data |

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Extraction accuracy** | >90% valid rows | Schema validation pass rate |
| **Field completeness** | >85% fields filled | Missing field counts per sync |
| **Cost per sailing** | <$0.10/sailing | (credits × $0.01) / successful extract |
| **Sync duration** | <30 min per run | Timing from start to upsert complete |
| **Automated reliability** | >95% cron success | Sync cron job success rate over 30 days |

---

## Next Steps (Immediate)

1. **Create Firecrawl account** — Sign up at firecrawl.dev
2. **Get API key** — `FIRECRAWL_API_KEY`
3. **Pick one cruise line** — Start with Royal Caribbean (most consistent DOM)
4. **Manually inspect one page** — Extract CSS selectors for prices, dates, cabins
5. **Run POC script** — Verify Firecrawl can extract the data
6. **Document findings** — Share which fields were extracted + which failed
7. **Proceed to Phase 2** — Only if POC succeeds above thresholds

---

## Appendix: Sample Firecrawl Request

```typescript
// server/services/firecrawlClient.ts
export async function scrapeUrl(url: string, options: {
  onlyMainContent?: boolean;
  waitFor?: number;
  headers?: Record<string, string>;
  extract?: {
    prompt: string;
    schema: object;
  };
}): Promise<ScrapeResult> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      onlyMainContent: options.onlyMainContent ?? true,
      waitFor: options.waitFor,
      headers: options.headers,
      extract: options.extract
    })
  });
  return res.json();
}
```

**Sample result (expected):**
```json
{
  "success": true,
  "data": {
    "markdown": "# Royal Caribbean - Icon of the Seas\n\n## Cruise Details\n- Ship: Icon of the Seas\n- Duration: 7 nights\n- Departure: Miami, FL (Aug 7, 2026)\n- Destination: Caribbean\n\n## Price Range\n- Interior: $986\n- Oceanview: $1,137\n- Balcony: $2,021\n- Suite: $4,195\n\n## Itinerary\n- Day 1: Miami\n- Day 2: CocoCay\n- Day 3: Nassau\n- Day 4: At Sea\n- ...\n"
  }
}
```

---

## Related Files & References

- `.hermes/research/cruise-apis-2026-07.md` — Existing cruise API research
- `server/db/schema.sql` — Target schema for upserts
- `server/services/hybridEngineOptimized.ts` — Current sync flow to wire into
- `server/types/cruise.ts` — Data model to normalize to