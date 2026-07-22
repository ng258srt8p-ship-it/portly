# Plan: Jina AI Reader Integration into TripTide Architecture

**Status:** POC Complete ✅  
**Next:** Full Architecture Integration  
**Date:** 2026-07-15

---

## Executive Summary

**Goal:** Replace Firecrawl with **Jina AI Reader** (free, unlimited) for real cruise data extraction, while retaining **OpenCode** for analytics generation.

**Architecture:**
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Jina Reader    │ ────▶│  TripTide DB     │ ────▶│  OpenCode AI    │
│  (Scraping)     │      │  (Raw Data)      │      │  (Analytics)    │
│  FREE           │      │  Sailings        │      │  Deal Analysis  │
│  Unlimited      │      │  Pricing         │      │  Forecasts      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
         ▲                       │                        │
         │                       ▼                        ▼
         │              ┌──────────────────┐      ┌─────────────────┐
         └──────────────│  Hybrid Engine   │◀─────│  Frontend API   │
                        │  (Sync Orchestrator)     │  (Deals Page)   │
                        └──────────────────┘      └─────────────────┘
```

**Data Flow:**
1. **Jina Reader** scrapes real cruise lines (Royal Caribbean, Carnival, Norwegian, etc.)
2. **Parser** extracts: ship, date, itinerary, prices (Inside/Oceanview/Balcony/Suite)
3. **DB Upsert** → `sailings` + `pricing_snapshots` tables
4. **OpenCode** generates: deal analysis, price forecasts, insider commentary
5. **Frontend** displays enriched deals to users

**Cost:** $0.00/month (Jina is free, OpenCode is free)  
**Volume:** ~300-600 real sailings/month + AI analytics on all

---

## Phase 1: Core Infrastructure (2-3 hours)

### 1.1: Jina Reader Service (Status: ✅ Complete)

**File:** `server/services/jinaReader.ts`

**Features:**
- Single URL scraping with markdown extraction
- Batch scraping with rate limiting (500ms delay)
- Automatic price detection (`$[\d,]+` regex)
- Ship name/date/itinerary extraction (heuristic parsing)

**Tested:** ✅ Extracted 22 prices from Royal Caribbean

**Improvements Needed:**
- Better ship name parsing (currently detects "Utopia" for all RCL ships)
- Date format normalization (convert "Sep 7, 2026" → "2026-09-07")
- Itinerary port extraction (find "ports: Miami, Nassau, CocoCay")

### 1.2: Jina Sync Service (Status: ✅ Complete)

**File:** `server/services/jinaSync.ts`

**Features:**
- Predefined URL list (7 cruise lines)
- Parses markdown → `ParsedSailing[]`
- Upserts to `sailings` + `pricing_snapshots`
- Marks source as `cron_source = 'jina-reader'`

**Tested:** ✅ Upserted 6 sailings (48 pricing snapshots)

**Improvements Needed:**
- URL rotation (don't scrape same ship every cycle)
- Deduplication logic (skip if price unchanged from last scrape)
- Error handling (retry failed scrapes)

### 1.3: Enhanced Parser Module (Status: ⏳ To Do)

**File:** `server/services/jinaParser.ts` (NEW)

**Purpose:** Dedicated parser for Jina markdown → structured data

**Functions:**
```typescript
interface ParsedCruise {
  cruiseLine: string;
  ship: string;
  sailDate: string; // ISO 8601
  duration: number;
  departurePort: string;
  destination: string;
  itinerary: string[];
  cabinPricing: {
    inside: number;
    oceanview: number;
    balcony: number;
    suite: number;
  };
  rawMarkdown: string;
}

function extractShipName(markdown: string): string | null;
function extractSailDate(markdown: string): string | null;
function extractItinerary(markdown: string): string[];
function extractCabinPricing(markdown: string): CabinPricing | null;
function validateCruise(data: ParsedCruise): boolean;
```

**Heuristics:**
- **Ship name:** Look for "X of the Seas", "Carnival X", "Norwegian X"
- **Dates:** Regex `\w+ \d{1,2}, \d{4}` → convert to ISO
- **Ports:** Look for "Ports:", "Itinerary:", "Visiting"
- **Prices:** Sort all `$` values, assign to cabins by tier logic

---

## Phase 2: Architecture Integration (3-4 hours)

### 2.1: Update Hybrid Engine (Status: ⏳ To Do)

**File:** `server/services/hybridEngine.ts`

**Current Flow:**
```
OpenCode AI → Analysis → DB
```

**New Flow:**
```
Jina Reader → Raw Data → DB → OpenCode AI → Analytics → DB
```

**Changes:**
1. Add `Phase 0: Data Collection (Jina)` before existing Phase 1
2. Only run OpenCode on **new/updated** sailings (skip if data unchanged)
3. Add skip logic: if `sailing.scraped_at < 24h ago`, skip OpenCode regeneration

**Code Changes:**
```typescript
// Add before Phase 1
async function phase0_dataCollection() {
  console.log('[Phase 0] Running Jina Reader sync...');
  const { runJinaSync } = await import('./jinaSync');
  await runJinaSync();
  console.log('[Phase 0] Complete');
}

// Modify Phase 1
async function phase1_analytics() {
  // Only analyze sailings scraped in last 24h that lack analysis
  const newSailings = await pool.query(`
    SELECT id FROM sailings 
    WHERE cron_source = 'jina-reader'
      AND scraped_at > NOW() - INTERVAL '24 hours'
      AND (deal_analysis IS NULL OR deal_analysis = '')
  `);
  
  if (newSailings.rows.length === 0) {
    console.log('[Phase 1] No new sailings to analyze. Skipping.');
    return;
  }
  
  // ... existing OpenCode logic
}
```

### 2.2: Cron Job Orchestration (Status: ⏳ To Do)

**Current Cron:** OpenCode deterministic generator (every 6h)

**New Cron Schedule:**
```yaml
# ~/.hermes/cron.yaml (or via cronjob tool)

# Job 1: Jina Reader Sync (real data)
- name: "Jina Reader Sync"
  schedule: "0 */6 * * *"  # Every 6 hours (00:00, 06:00, 12:00, 18:00)
  command: "npx ts-node server/services/jinaSync.ts"
  workdir: "/Users/georgetozer/Development/Portly"

# Job 2: OpenCode Analytics (AI enrichment)
- name: "OpenCode Analytics"
  schedule: "30 */6 * * *"  # Every 6 hours, 30 min offset
  command: "RUN_OPENCODE_ONLY=true npx ts-node server/index.ts"
  workdir: "/Users/georgetozer/Development/Portly"
```

**Rationale:**
- Jina runs first → populates DB with real data
- OpenCode runs 30 min later → analyzes new sailings
- No overlap, no rate limit conflicts

### 2.3: Environment Variables (Status: ⏳ To Do)

**File:** `.env` (or `server/.env`)

```bash
# Jina Reader Configuration
JINA_READER_ENABLED=true
JINA_READER_BASE_URL=https://r.jina.ai
JINA_READER_MAX_URLS_PER_RUN=10
JINA_READER_RATE_LIMIT_MS=500

# OpenCode Configuration
OPENCODE_API_BASE=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free  # or big-pickle if reliable
OPENCODE_MAX_TOKENS=2048

# Sync Configuration
SYNC_CYCLE_HOURS=6
SYNC_SOURCE_PRIORITY=jina,opencode-fallback
```

---

## Phase 3: URL Strategy & Coverage (2-3 hours)

### 3.1: Cruise Line URL Matrix (Status: ⏳ To Do)

**File:** `server/data/cruiseUrls.ts` (NEW)

**Target Cruise Lines:**
```typescript
export const CRUISE_URLS = {
  'Royal Caribbean': [
    'https://www.royalcaribbean.com/cruises/icon-of-the-seas',
    'https://www.royalcaribbean.com/cruises/wonder-of-the-seas',
    'https://www.royalcaribbean.com/cruises/symphony-of-the-seas',
    'https://www.royalcaribbean.com/cruises/utopia-of-the-seas',
    'https://www.royalcaribbean.com/cruises/allure-of-the-seas',
    'https://www.royalcaribbean.com/cruises/oasis-of-the-seas',
  ],
  'Carnival': [
    'https://www.carnival.com/cruises/carnival-mardi-gras',
    'https://www.carnival.com/cruises/carnival-celebration',
    'https://www.carnival.com/cruises/carnival-jubilee',
  ],
  'Norwegian': [
    'https://www.ncl.com/cruise-ships/norwegian-prima',
    'https://www.ncl.com/cruise-ships/norwegian-viva',
  ],
  // Add more: Princess, MSC, Celebrity, etc.
};
```

**Rotation Strategy:**
- Run 1: Royal Caribbean (6 ships)
- Run 2: Carnival + Norwegian (5 ships)
- Run 3: Princess + MSC (5 ships)
- Run 4: Royal Caribbean repeat (check for price changes)
- Cycle repeats

**Volume:** ~16 ships/cycle × 4 cycles/day = **~64 scrapes/day** = **~1,920/month**

### 3.2: Ship-Specific Parsing Rules (Status: ⏳ To Do)

**File:** `server/services/jinaParser.rules.ts` (NEW)

**Purpose:** Cruise lines have different HTML structures; need custom parsers.

**Example:**
```typescript
const PARSING_RULES = {
  'royalcaribbean.com': {
    shipNamePattern: /([A-Z][a-z]+\s+of\s+the\s+Seas)/i,
    pricePattern: /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    datePattern: /(\w+\s+\d{1,2},\s+\d{4})/g,
    itinerarySection: /ports?:?\s*[:\-]?\s*([^\n]+)/i,
  },
  'carnival.com': {
    shipNamePattern: /Carnival\s+([A-Z][a-zA-Z]+)/i,
    pricePattern: /from\s+\$(\d{1,3}(?:,\d{3})*)(?:\s+per\s+person)?/i,
    // ... different patterns
  },
};
```

---

## Phase 4: Analytics Pipelines (3-4 hours)

### 4.1: OpenCode Analytics Prompt Engineering (Status: ⏳ To Do)

**File:** `server/services/analyticsPrompts.ts` (NEW)

**Goal:** Generate insider-sounding deal analysis using real scraped data.

**Prompt Template:**
```
You are a cruise industry insider with 20 years of pricing experience.

DATA:
- Ship: {ship}
- Sail Date: {date}
- Duration: {nights} nights
- Itinerary: {ports}
- Current Prices:
  - Inside: ${inside}
  - Oceanview: ${oceanview}
  - Balcony: ${balcony}
  - Suite: ${suite}
- Historical Context: {optional: avg_price_last_30_days}

TASK:
Write a 2-3 sentence deal analysis in a conversational, expert tone. Include:
1. Whether this is a good/bad/average deal (based on price per night)
2. One insider tip (e.g., "book now" or "wait 2 weeks")
3. A specific detail about the ship or itinerary

Tone: Friendly expert, not AI. Use contractions. Avoid generic phrases.

EXAMPLE GOOD OUTPUT:
"At $1,077/night, this Icon of the Seas sailing is priced about 15% below the 
August average. The 7-night Eastern Caribbean route hits CocoCay on Day 3—book 
now before the balcony cabins sell out. Pro tip: Deck 8 Oceanviews have the best 
views without the wind noise of higher decks."

EXAMPLE BAD OUTPUT:
"This is a great deal for a wonderful cruise experience. Book now for the best 
prices. The itinerary includes many exciting ports."
```

### 4.2: Conditional Analytics Generation (Status: ⏳ To Do)

**Logic:**
```typescript
async function shouldGenerateAnalytics(sailing: Sailing): Promise<boolean> {
  // Skip if already analyzed in last 7 days
  if (sailing.deal_analysis && sailing.analyzed_at > NOW() - 7 days) {
    return false;
  }
  
  // Skip if price hasn't changed >5% since last analysis
  const lastPrice = await getLastPrice(sailing.id);
  const priceChange = Math.abs(sailing.price - lastPrice) / lastPrice;
  if (priceChange < 0.05 && sailing.deal_analysis) {
    return false;
  }
  
  // Generate if: new sailing, price dropped >5%, or analysis is stale
  return true;
}
```

### 4.3: Analytics Quality Scoring (Status: ⏳ Future Enhancement)

**File:** `server/services/analyticsQuality.ts`

**Purpose:** Score generated analytics to filter out generic/AI-sounding content.

**Metrics:**
- Specificity score (mentions ship name, port names, deck numbers)
- Actionability score (includes "book now", "wait", "avoid cabin X")
- Uniqueness score (compared to other analyses, avoids repetition)

**Usage:**
- If score < threshold, regenerate with different prompt
- If score < threshold × 2, flag for manual review
- Log low-scoring outputs for prompt tuning

---

## Phase 5: Frontend Integration (2-3 hours)

### 5.1: API Response Enrichment (Status: ⏳ To Do)

**File:** `server/routes/cruises.ts`

**Current Response:**
```json
{
  "id": 1049,
  "ship": "Icon of the Seas",
  "price": 2021,
  "deal_analysis": null
}
```

**New Response:**
```json
{
  "id": 1049,
  "ship": "Icon of the Seas",
  "price": 2021,
  "deal_analysis": "At $1,077/night, this Icon sailing is 15% below August average...",
  "price_forecast": "Expected to rise 10-15% as August approaches",
  "last_scraped": "2026-07-15T10:30:00Z",
  "source": "jina-reader",
  "price_history": [1150, 1120, 1095, 1077],
  "insider_tip": "Book Deck 8 Oceanview for best views without wind noise"
}
```

### 5.2: Price Change Indicators (Status: ⏳ Future Enhancement)

**UI Component:** `src/components/deals/PriceChangeIndicator.tsx`

**Display:**
- 📉 Green down arrow: "Price dropped $50 (4%) in last 7 days"
- 📈 Red up arrow: "Price increased $100 (8%) in last 14 days"
- ➖ Gray dash: "Price stable (unchanged in 30 days)"

**Data Source:**
```sql
SELECT 
  sailing_id,
  AVG(base_fare_usd) FILTER (WHERE captured_at > NOW() - '7 days'::interval) as avg_7d,
  AVG(base_fare_usd) FILTER (WHERE captured_at BETWEEN NOW() - '14 days' AND NOW() - '7 days') as avg_prev_7d
FROM pricing_snapshots
GROUP BY sailing_id;
```

### 5.3: "Last Updated" Badge (Status: ⏳ To Do)

**UI Component:** Add to `src/components/deals/DealCard.tsx`

**Display:**
- "🔄 Updated 2 hours ago" (if scraped < 24h)
- "📅 Updated 3 days ago" (if scraped 1-7 days)
- "⚠️ Stale data (14 days)" (if scraped > 7 days)

**Purpose:** Builds user trust by showing data freshness.

---

## Phase 6: Monitoring & Observability (2-3 hours)

### 6.1: Scrape Logging (Status: ⏳ To Do)

**File:** `server/services/jinaLogger.ts` (NEW)

**Log Structure:**
```typescript
interface ScrapeLog {
  url: string;
  timestamp: string;
  status: 'success' | 'failed' | 'partial';
  pricesFound: number;
  sailingsParsed: number;
  durationMs: number;
  errorMessage?: string;
}
```

**Storage:**
- In-DB table: `jina_scrape_logs`
- Retention: 30 days
- Query: `SELECT * FROM jina_scrape_logs WHERE status = 'failed' ORDER BY timestamp DESC`

### 6.2: Success Rate Dashboard (Status: ⏳ Future Enhancement)

**Endpoint:** `GET /api/admin/jina-stats`

**Metrics:**
- Total scrapes (24h, 7d, 30d)
- Success rate (%): `success / (success + failed)`
- Average prices extracted per scrape
- Top-performing cruise lines (by successful scrapes)
- Failed URLs (for debugging)

**Example Response:**
```json
{
  "last_24h": {
    "total_scrapes": 16,
    "success_rate": 0.875,
    "prices_extracted": 312,
    "sailings_added": 18
  },
  "top_urls": [
    { "url": "royalcaribbean.com/...", "success_count": 8 },
    { "url": "carnival.com/...", "success_count": 6 }
  ],
  "recent_failures": [
    { "url": "ncl.com/...", "error": "timeout", "timestamp": "2026-07-15T08:00:00Z" }
  ]
}
```

### 6.3: Alerting (Status: ⏳ Future Enhancement)

**Triggers:**
- Success rate < 50% for 3 consecutive runs → Send alert
- 0 sailings added in 24h → Send alert
- Jina Reader downtime (all scrapes fail) → Send alert

**Delivery:**
- Console log (immediate)
- Optional: Email/Slack/Telegram webhook (configurable)

---

## Phase 7: Testing & Validation (2-3 hours)

### 7.1: Unit Tests (Status: ⏳ To Do)

**File:** `server/services/__tests__/jinaParser.test.ts`

**Test Cases:**
```typescript
describe('jinaParser', () => {
  test('extracts ship name from Royal Caribbean markdown', () => {
    const markdown = '...Wonder of the Seas cruise deals...';
    expect(extractShipName(markdown)).toBe('Wonder of the Seas');
  });
  
  test('converts date formats correctly', () => {
    expect(normalizeDate('Sep 7, 2026')).toBe('2026-09-07');
    expect(normalizeDate('August 15, 2026')).toBe('2026-08-15');
  });
  
  test('extracts cabin pricing tiers', () => {
    const markdown = '...prices from $376...balcony $1,200...';
    const pricing = extractCabinPricing(markdown);
    expect(pricing.inside).toBe(376);
    expect(pricing.balcony).toBe(1200);
  });
  
  test('validates cruise data completeness', () => {
    const cruise = { ship: 'Test', sailDate: '2026-08-01', pricing: {...} };
    expect(validateCruise(cruise)).toBe(true);
  });
});
```

### 7.2: Integration Tests (Status: ⏳ To Do)

**File:** `server/__tests__/jinaSync.integration.test.ts`

**Test Flow:**
1. Run `jinaSync` against test URLs
2. Query DB for inserted sailings
3. Verify `sailings` table has correct structure
4. Verify `pricing_snapshots` has 4 rows per sailing
5. Verify `cron_source = 'jina-reader'`

### 7.3: End-to-End Test (Status: ⏳ To Do)

**Manual Test Script:**
```bash
# 1. Clear test data
psql triptide -c "DELETE FROM sailings WHERE cron_source = 'jina-reader';"

# 2. Run sync
npx ts-node server/services/jinaSync.ts

# 3. Verify DB
psql triptide -c "SELECT COUNT(*) FROM sailings WHERE cron_source = 'jina-reader';"
# Expected: > 0

# 4. Trigger analytics
RUN_OPENCODE_ONLY=true npx ts-node server/index.ts

# 5. Verify analytics generated
psql triptide -c "SELECT COUNT(*) FROM sailings WHERE deal_analysis IS NOT NULL;"
# Expected: > 0

# 6. Check frontend
curl http://localhost:3000/api/deals | jq '.[0].deal_analysis'
# Expected: Non-null string
```

---

## File Manifest

### Existing Files (✅ Complete)
- `server/services/jinaReader.ts` — Jina client wrapper
- `server/services/jinaSync.ts` — Sync orchestration
- `server/test-free-crawlers.js` — Initial test suite

### New Files (⏳ To Do)
- `server/services/jinaParser.ts` — Dedicated parser
- `server/services/jinaParser.rules.ts` — Cruise-line-specific rules
- `server/services/jinaLogger.ts` — Scrape logging
- `server/services/analyticsPrompts.ts` — OpenCode prompt templates
- `server/services/analyticsQuality.ts` — Quality scoring (optional)
- `server/data/cruiseUrls.ts` — URL matrix
- `server/services/__tests__/jinaParser.test.ts` — Unit tests
- `server/__tests__/jinaSync.integration.test.ts` — Integration tests
- `.env.jina` — Environment variables (optional)

### Modified Files (⏳ To Do)
- `server/services/hybridEngine.ts` — Add Phase 0 (Jina)
- `server/routes/cruises.ts` — Enrich API responses
- `src/components/deals/DealCard.tsx` — Add "Last Updated" badge
- `src/components/deals/PriceChangeIndicator.tsx` — NEW component
- `server/index.ts` — Add `RUN_OPENCODE_ONLY` flag support

---

## Timeline Estimate

| Phase | Hours | Cumulative | Status |
|-------|-------|------------|--------|
| 1: Core Infrastructure | 3 | 3 | 33% complete |
| 2: Architecture Integration | 4 | 7 | 0% complete |
| 3: URL Strategy | 3 | 10 | 0% complete |
| 4: Analytics Pipelines | 4 | 14 | 0% complete |
| 5: Frontend Integration | 3 | 17 | 0% complete |
| 6: Monitoring | 3 | 20 | 0% complete |
| 7: Testing | 3 | 23 | 0% complete |
| **Total** | **23 hours** | | |

**Realistic Timeline:**
- Day 1: Phases 1-2 (7 hours) — Core + Architecture
- Day 2: Phases 3-4 (7 hours) — URLs + Analytics
- Day 3: Phases 5-7 (9 hours) — Frontend + Monitoring + Tests

---

## Success Criteria

✅ **Data Quality:**
- 90%+ scrape success rate (≥9/10 URLs work)
- ≥10 prices extracted per cruise page
- Ship names correctly identified ≥95% of time

✅ **Performance:**
- Sync completes in <30 seconds per cycle
- No rate limiting from Jina Reader
- DB upserts in <1 second per sailing

✅ **Analytics:**
- 100% of new sailings get OpenCode analysis within 6 hours
- Analytics sound "insider-like" (no generic AI phrases)
- Forecasts generated for all sailings

✅ **Cost:**
- $0.00/month (Jina free, OpenCode free)
- No API keys required

✅ **Reliability:**
- Cron runs 4×/day without failures
- Automatic retry on transient errors
- Alerts on persistent failures

---

## Next Steps (Immediate)

1. **Phase 1.3:** Build `jinaParser.ts` with better extraction logic (1 hour)
2. **Phase 2.1:** Update `hybridEngine.ts` to run Jina before OpenCode (1 hour)
3. **Phase 3.1:** Create `cruiseUrls.ts` with 20+ cruise URLs (30 min)
4. **Phase 2.2:** Set up cron jobs (30 min)
5. **Test:** Run full cycle and verify data flows end-to-end (1 hour)

**Total for MVP:** 4 hours to production-ready integration.

---

**Ready to execute Phase 1.3 (Enhanced Parser)?** This is the highest-leverage next step—better parsing means better data quality for everything downstream.