# Cruise API Research — Findings (Updated)

> Research conducted 2026-07-13

## Summary Table

| Source | URL | Status | Viability | Notes |
|---|---|---|---|---|
| **RapidAPI Cruise APIs** (3 found) | rapidapi.com/search/cruise | ✅ Live | ✓ **Best option** | Pay-per-call, instant signup, free tiers exist. Need to create account to test. |
| **Traveltek** | traveltek.com/cruise-booking-engine/ | ✅ Live | ⚠ B2B | White-label booking engine, XML API, multiple lines. Requires sales contact, likely expensive. |
| **Expedia Group Dev** | developers.expediagroup.com/docs/apis/cruise | ✅ Live | ⚠ B2B | Cruise API exists in their hub. Requires partner agreement. |
| **BookLogic** | booklogic.net/api | ✅ Live | ⚠ B2B | Cruise-specific booking engine. Requires business agreement. |
| **VacationsToGo** | vacationstogo.com/cruise_search.cfm | ✅ Live | ✗ Scrape only | Server-rendered ColdFusion app. No JSON API. Only AJAX is dropdown population (ships by line). Results are HTML tables. |
| **CruiseCompete** | cruisecompete.com/api | ❌ 403 | ✗ Blocked | |
| **CruiseMapper** | cruisemapper.com/api | ❌ 403 | ✗ Blocked | |
| **MarineTraffic** | marinetraffic.com/api | ❌ 403 | ✗ Wrong use case | Ship tracking, not booking data |
| **Sabre / Amadeus / Travelport** | developer portals | ✅ Live | ✗ No cruise | GDS for flights/hotels only. No cruise-specific APIs found. |
| **Royal Caribbean / Carnival B2B** | partner portals | ❌ Timeout | ✗ Locked | Require travel agency credentials |

---

## VacationsToGo Deep Dive

**Verdict: Not viable for API integration**

- Technology: ColdFusion (`.cfc` components, `.cfm` pages)
- Architecture: Server-side rendered HTML, no JSON API
- AJAX endpoints found: **Only dropdown populators** (`/cfc/fab.cfc?method=getShipOptions`, `getLineOptions`, `getRegionOptions`, `getPortOptions`, `getPlaceOptions`, `getMonthOptions`, `getDurationOptions`)
- Search results: POST to `/cruise_search_results.cfm` → returns full HTML page with tables
- Data available in HTML: Cruise line, ship, sail date, duration, ports, **pricing** (but embedded in HTML)
- **No structured API** for cruise listings or pricing

### Could we scrape it?
Technically yes — POST search params → parse HTML tables. But:
- Fragile (HTML changes break it)
- ToS violation risk
- No cabin-level pricing breakdown (only "from $X" lead price)
- Rate limiting / blocking likely at scale

---

## Recommended Next Steps

### 1. **RapidAPI Cruise APIs** — Fastest Path to Real Data
```
Action: Create free RapidAPI account → Subscribe to cruise API free tier → Test endpoints
Cost: Free tier typically 100-1000 calls/month
Time: 30 minutes to test
```

**APIs to test:**
- `letscms/cruise-api` 
- `cruiseline/api`
- `search-cruise/api`

**Test calls needed:**
1. List cruise lines
2. Search sailings (region, date range, line)
3. Get sailing details + pricing by cabin type

### 2. **Keep NIM for Phase 3 (Deal Analysis)** — Proven Working
The NIM-powered deal analysis (Phase 3) is already:
- Cached in DB ✅
- Fast at page-load (zero API calls) ✅  
- High quality (insider-style commentary) ✅

**Don't replace this.** It adds unique value no cruise API provides.

### 3. **Hybrid Architecture (Recommended)**

| Phase | Current (NIM) | Target (API + NIM) |
|---|---|---|
| **1. Schedules** | NIM generates 600 sailings | **Real API** → actual inventory |
| **2. Pricing** | NIM generates per-cabin pricing | **Real API** → actual fares + fees |
| **3. Analysis** | NIM generates insider commentary | **Keep NIM** → commentary on real data |

This eliminates synthetic data risk while preserving the unique "insider analysis" feature.

---

## Data Model Comparison

### Current `SailingRecord` (from NIM)
```typescript
interface SailingRecord {
  cruiseLine: string;
  shipName: string;
  sailDate: string;
  duration: number;
  port: string;
  region: string;
  itinerary: string;
  // Pricing added in Phase 2
  cabinPricing: CabinPrice[];
}
```

### Expected API Response (need to verify)
```typescript
interface APISailing {
  cruise_line: string;
  ship_name: string; 
  departure_date: string;
  duration_nights: number;
  departure_port: string;
  destination_region: string;
  itinerary: PortCall[];
  cabin_categories: {
    category_code: string;      // "IS", "OB", "BA", "SU"
    category_name: string;      // "Interior", "Oceanview", "Balcony", "Suite"
    base_fare: number;
    port_fees: number;
    taxes: number;
    gratuities: number;
    total: number;
    availability: number;       // cabins left
  }[];
}
```

**Key validation needed:** Does any API return `cabin_categories` with fee breakdown?

---

## Integration Effort Estimate

| Component | Files to Change | Effort |
|---|---|---|
| New API client service | `server/services/cruiseApiClient.ts` | 2-4 hrs |
| Replace Phase 1 (schedules) | `server/services/nimSyncGenerator.ts` | 2-3 hrs |
| Replace Phase 2 (pricing) | `server/services/nimSyncGenerator.ts` | 2-3 hrs |
| Map API response → DB | `server/services/hybridEngine.ts` | 1-2 hrs |
| Config / rate limiting | `server/utils/cruiseApiLimiter.ts` | 1 hr |
| **Total** | | **8-14 hrs** |

---

## Decision Required

**Option A: Test RapidAPI first (recommended)**
- You create RapidAPI account (free)
- Share one API key with me
- I test all 3 cruise APIs, document responses, give go/no-go

**Option B: Proceed with Traveltek/Expedia B2B**
- Requires sales calls, NDAs, contracts
- Weeks to months
- Enterprise pricing

**Option C: Stay with NIM + improve prompts**
- Current system works, just synthetic
- Could enhance NIM prompts with real pricing rules
- Zero external dependencies

---

**My recommendation: Option A.** It's the only way to know within hours whether a public API can replace NIM for Phases 1+2. If RapidAPI cruise APIs have the data depth we need (cabin-level pricing with fee breakdown), we can migrate. If not, we keep NIM for Phases 1+2 and only use APIs for validation/enrichment.

**Next action:** Create RapidAPI account → test endpoints → I'll write the integration.