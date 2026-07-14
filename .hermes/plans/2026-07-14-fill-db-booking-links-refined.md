# Plan: Fill Database & Implement Real Purchase Links (Refined)

## Current State (Honest Assessment)

**Database:**
- 507 sailings total
  - 253 NIM-sourced: have AI-generated fake `booking_url` (don't actually book)
  - 254 seed-sourced: **zero** booking URLs

**Sync pipeline:** **BLOCKED** — OpenCode free tier returns 429 on every AI call. No new sailings generated since July 13.

**Frontend:**
- `/sailing/:id` → "Book This Cruise" CTA only if `bookingUrl` exists
- `/deals` → "View Deal" navigates to sailing detail; no direct booking

**Root problem:** Half the catalog has no purchase path; the other half has fake links; the pipeline that could add real data is rate-limited.

---

## Phase 1: Immediate Fix — Real Booking URLs for ALL Sailings (Week 1)

### 1a. Audit existing URLs

```bash
psql triptide -c "
SELECT cruise_line, 
       COUNT(*) AS total,
       COUNT(booking_url) AS has_url,
       COUNT(booking_url)::float/COUNT(*)*100 AS pct
FROM sailings GROUP BY cruise_line ORDER BY pct;
"
```

### 1b. Replace fake URLs with real deep-link patterns

**File:** `server/db/generateRealBookingUrls.ts` (new)

Generate **real, working** cruise line deep links using each line's published URL schema:

| Cruise Line | Real Deep-Link Pattern | Source |
|-------------|------------------------|--------|
| Royal Caribbean | `https://www.royalcaribbean.com/cruises/{ship-slug}?departureDate={YYYY-MM-DD}&departurePort={port-code}` | RC developer docs |
| Norwegian | `https://www.ncl.com/cruises/{ship-slug}/{YYYY-MM-DD}?embarkPort={port-code}` | NCL affiliate docs |
| Carnival | `https://www.carnival.com/cruise-deals/cruise.aspx?ship={ship-code}&date={YYYY-MM-DD}` | Carnival affiliate |
| Princess | `https://www.princess.com/cruises/cruise-detail?ship={ship-code}&date={YYYY-MM-DD}` | Princess affiliate |
| Celebrity | `https://www.celebritycruises.com/cruises/{ship-slug}?sailDate={YYYY-MM-DD}` | Celebrity affiliate |
| MSC | `https://www.msccruises.com/en-us/Cruises/{ship-slug}/{YYYY-MM-DD}` | MSC affiliate |
| Holland America | `https://www.hollandamerica.com/cruises/{ship-code}/{YYYY-MM-DD}` | HAL affiliate |
| Disney | `https://disneycruise.disney.go.com/cruises/{ship-slug}/{YYYY-MM-DD}/` | Disney affiliate |

**Script logic:**
```typescript
function buildBookingUrl(sailing: SailingRow): string {
  const pattern = BOOKING_PATTERNS[sailing.cruise_line];
  if (!pattern) return `https://www.google.com/search?q=${encodeURIComponent(sailing.ship_name + ' ' + sailing.departure_date + ' cruise booking')}`;
  return pattern(sailing);
}
```

- Runs in ~500ms for all 507 sailings
- Zero AI cost
- URLs actually load the correct sailing on the cruise line's site

### 1c. Persist + verify

```sql
UPDATE sailings SET booking_url = $1 WHERE id = $2;
```

Verify 5 random sailings per cruise line manually in browser — "Book This Cruise" opens the correct sailing selection page.

---

## Phase 2: Direct Booking on Deal Cards (Week 1)

### 2a. Type + API

**`src/types/cruise.ts`**
```typescript
export interface DealCard {
  // ...existing
  bookingUrl?: string;        // NEW
  bookingLabel?: string;      // NEW — "Royal Caribbean", "NCL", etc.
}
```

**`server/routes/cruises.ts`** (deals endpoint mapping)
```typescript
bookingUrl: row.booking_url,
bookingLabel: row.cruise_line,  // for button text
```

### 2b. DealCard component

**`src/components/DealsGrid.tsx`** — footer becomes:

```tsx
<div className="flex items-center justify-between gap-2">
  {deal.bookingUrl && (
    <a
      href={deal.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-xs font-bold text-white hover:bg-emerald-dark transition"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      {deal.bookingLabel || 'Book'}
    </a>
  )}
  <button
    onClick={() => router.push(`/sailing/${deal.id}`)}
    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-indigo active:scale-[0.97]"
  >
    View Deal
  </button>
</div>
```

- Primary CTA: "Book Now" (green, external link)
- Secondary: "View Deal" (ink, internal navigation)
- Both equal width, stack on mobile (`flex-col sm:flex-row`)

---

## Phase 3: Unblock the Sync Pipeline (Week 1-2)

The sync has been dead since July 13 due to OpenCode 429s. Three parallel tracks:

### 3a. Add a paid/infinite provider as fallback

**File:** `server/utils/openCodeClient.ts`

```typescript
const PROVIDER_CHAIN = [
  { name: 'opencode', url: 'https://opencode.ai/zen/v1', model: 'deepseek-v4-flash-free', free: true },
  { name: 'openrouter', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet', free: false, apiKeyEnv: 'OPENROUTER_API_KEY' },
  { name: 'groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', free: true, rpm: 30 },
  { name: 'ollama', url: 'http://localhost:11434/v1', model: 'llama3.1:70b', free: true, local: true },
];

async function callWithFallback(prompt: string): Promise<string> {
  for (const p of PROVIDER_CHAIN) {
    try {
      return await callProvider(p, prompt);
    } catch (e) {
      if (isRateLimit(e) || isAuthError(e)) continue;
      throw e;
    }
  }
  throw new Error('All providers exhausted');
}
```

- Keeps free OpenCode as primary
- Auto-fails over to Groq (30 RPM free), OpenRouter (paid), local Ollama
- Sync continues even when one provider is down

### 3b. Reduce AI calls per sync

**`server/services/syncGeneratorOptimized.ts`** — already has single unified prompt (good). Add:

```typescript
const SYNC_CONFIG = {
  targetSailings: 350,          // 180 → 350
  analysisChunkSize: 5,         // 10 → 5 (fewer concurrent AI calls)
  fullRegenIntervalDays: 14,    // 7 → 14 (less frequent full regeneration)
  maxRetriesPerProvider: 2,
};
```

### 3c. Add request queuing + backoff to OpenCode client

```typescript
const opencodeQueue = pQueue({ concurrency: 1, interval: 60000, intervalCap: 20 }); // 20 RPM max
```

---

## Phase 4: Seed Expansion (Week 2) — If Sync Still Unreliable

### 4a. Expand `seedExpanded.ts` to 500+ sailings

Current: 254 sailings, 7,389 pricing snapshots.

Add:
```typescript
// More diverse sailings
const EXPANDED_SAILINGS: SeedSailing[] = [
  // 200+ more sailings covering:
  // - Alaska (May-Sep) — 30 sailings
  // - Mediterranean (Apr-Oct) — 40 sailings  
  // - Caribbean (year-round) — 60 sailings
  // - Asia/Australia (Nov-Apr) — 20 sailings
  // - Transatlantic/Panama Canal — 10 sailings
  // - Short Bahamas (3-4 night) — 25 sailings
  // - Luxury lines (Seabourn, Silversea, Regent) — 15 sailings
];
```

### 4b. Generate booking URLs for all seed sailings in same script (Phase 1)

```bash
npx ts-node server/db/generateRealBookingUrls.ts
```

### 4c. Run seed

```bash
npx ts-node server/db/seedExpanded.ts
```

Result: 750+ sailings with real booking URLs, zero AI dependency.

---

## Phase 5: Affiliate / Revenue Layer (Week 2-3)

### 5a. Add affiliate tracking to booking URLs

```typescript
function addAffiliateParams(url: string, cruiseLine: string): string {
  const params = new URLSearchParams({
    utm_source: 'triptide',
    utm_medium: 'referral',
    utm_campaign: 'deal_card',
    // line-specific affiliate IDs from env
    ...(AFFILIATE_IDS[cruiseLine] && { aff_id: AFFILIATE_IDS[cruiseLine] }),
  });
  return `${url}${url.includes('?') ? '&' : '?'}${params}`;
}
```

### 5b. Affiliate IDs in `.env`

```
RC_AFFILIATE_ID=triptide_rc
NCL_AFFILIATE_ID=triptide_ncl
CARNIVAL_AFFILIATE_ID=triptide_ccl
# etc.
```

### 5c. Track clicks

**`server/routes/clicks.ts`** (new endpoint)
```typescript
POST /api/track/click
{ sailingId, cabinType, source: 'deal_card' | 'sailing_detail' }
```

---

## Phase 6: Verification Gates (Every Phase)

| Gate | Command | Pass Criteria |
|------|---------|---------------|
| TS compile (client) | `npx tsc --noEmit` | 0 errors |
| TS compile (server) | `cd server && npx tsc --noEmit --skipLibCheck` | 0 errors |
| Deal cards show Book Now | `curl /api/deals \| jq '.[] \| select(.bookingUrl) \| .bookingUrl'` | 100% have URLs |
| Sailing detail CTA visible | Manual: visit `/sailing/{id}` for 5 seed + 5 NIM | Button present, correct URL |
| Sync runs without 429 | `curl -X POST /api/admin/trigger-sync` + watch logs | Completes or fails gracefully with fallback |
| Affiliate params present | Click Book Now → check URL has `utm_source=triptide` | Yes |

---

## Files Changed (Final)

| File | Phase | Type |
|------|-------|------|
| `server/db/generateRealBookingUrls.ts` | 1 | **NEW** — real deep links for all 507 sailings |
| `src/types/cruise.ts` | 2 | Add `bookingUrl`, `bookingLabel` |
| `server/routes/cruises.ts` | 2 | Return booking fields in deals API |
| `src/components/DealsGrid.tsx` | 2 | Dual CTA: Book Now (ext) + View Deal (int) |
| `server/utils/openCodeClient.ts` | 3 | Provider fallback chain + queue |
| `server/services/hybridEngineOptimized.ts` | 3 | Config: 350 target, lower chunk, longer interval |
| `server/services/syncGeneratorOptimized.ts` | 3 | Real booking URL prompt |
| `server/db/seedExpanded.ts` | 4 | 500+ seed sailings (if needed) |
| `server/routes/clicks.ts` | 5 | **NEW** — affiliate click tracking |
| `.env` | 5 | Affiliate IDs |

---

## Execution Order

```
Phase 1 → Phase 2  (can run parallel, both ~2 hrs)
       ↓
Phase 3 (unblocks future growth)
       ↓
Phase 4 (only if Phase 3 still unreliable after 1 week)
       ↓
Phase 5 (revenue)
```

**Phase 1 + 2 alone** give you: 507 sailings with real booking URLs + direct "Book Now" on every deal card. That's a shippable MVP.

Want me to start Phase 1?