# Plan: Implement Cruise Search — Let Users Find Cruises on Their Own

## Problem

The search widget on the homepage looks functional but **doesn't actually do anything useful** — it redirects to `/deals?destination=...&cruiseLine=...` but the `/deals` page renders `DealsGrid` which **completely ignores URL query params** and just shows all deals in a fixed grid.

The backend `GET /api/search` endpoint already supports filtering by destination, cruiseLine, passengers, duration, departure dates, solo-friendly, sorting, and pagination — but nothing on the frontend calls it.

## What exists

| Layer | Existing | Missing |
|-------|----------|---------|
| **Backend** | `GET /api/search` — filters, sorts, paginates. Supports: destination, cruiseLine, passengers, min/maxDuration, min/maxDeparture, soloFriendly, sortBy (price/duration/departure), order, page, limit | Nothing — it works but has no frontend consumer |
| **Homepage search** | `SearchHero.tsx` — Destination, Cruise Line, Passenger dropdowns. Calls `router.push('/deals?params')` | Params are ignored by the target page |
| **Deals page** | `deals/page.tsx` — renders `<DealsGrid />` | Ignores URL params. Uses `/api/deals` not `/api/search` |
| **API service** | `cruiseApi.ts` — `fetchDeals()`, `fetchFilterOptions()` | No `fetchSearchResults()` function |
| **Deal cards** | `DealsGrid.tsx` — renders deal cards with ship, price, destination, badge | Works but can't be reused for search results without URL-param awareness |

## Plan

### Phase 1 — Search Results Page (`/deals`)

**Goal:** Convert `/deals` from a static curated list into a full search results page that:
- Reads and writes URL search params (`?destination=Alaska&cruiseLine=Princess&passengers=2`)
- Calls `GET /api/search` with those params
- Renders matched deals as deal cards
- Shows "X results found" summary
- Handles empty results gracefully

**Files to create/modify:**

1. **`src/services/cruiseApi.ts`** — Add:
   - `fetchSearchResults(params: SearchParams): Promise<SearchResults>` — calls `GET /api/search?...`
   - `SearchParams` type matching backend's `SailingQuery`
   - `SearchResults` type with `{ results, total, page, limit, totalPages }`

2. **`src/app/deals/page.tsx`** — Rewrite:
   - Parse URL search params with `useSearchParams()`
   - Fetch results via `fetchSearchResults(params)`
   - Show search summary: "15 deals found for Alaska, Princess Cruises"
   - Render results as deal cards (reuse card styling from DealsGrid)
   - Empty state: "No cruises match your filters" + link to clear filters
   - Handle loading/error states

### Phase 2 — Search Filters & Controls

**Goal:** Allow users to refine their search from the results page with inline controls.

3. **`src/components/search/SearchFilters.tsx`** — Create component:
   - Read current filters from URL params
   - Dropdowns for: Destination, Cruise Line (reuse data from `fetchFilterOptions()`)
   - Passenger count (+/- stepper, 1-4)
   - Duration range: "Any", "3-5 days", "6-9 days", "10-14 days"
   - Departure month filter: "Any", "This Month", "Next 3 Months", "2026", "2027"
   - Sort: "Price: Low to High", "Price: High to Low", "Duration: Shortest", "Duration: Longest", "Departure: Soonest"
   - "Solo Friendly" toggle
   - Each change updates URL params (shallow push) → triggers re-fetch

### Phase 3 — Pagination

4. **`src/components/search/SearchPagination.tsx`** — Create component:
   - Shows "Page X of Y (Z results)"
   - Previous / Next buttons
   - Page number buttons (1 2 3 ... N)
   - Updates URL `page` param
   - Collapses to simple prev/next on mobile

### Phase 4 — Homepage Search → Wire to Real Results

5. **`src/components/search/SearchHero.tsx`** — Update (minor):
   - Already navigates to `/deals?params` — no change needed
   - Ensure filters map correctly to backend params

### Architecture

```
SearchHero (homepage)
  │  user clicks "Search Voyages"
  ▼
/deals?destination=Alaska&cruiseLine=Princess&passengers=2
  │
  ├─ useSearchParams reads query
  ├─ fetchSearchResults(params) → GET /api/search
  │
  ├─ SearchFilters (inline controls)
  │   ├─ Destination dropdown
  │   ├─ Cruise Line dropdown
  │   ├─ Passengers stepper
  │   ├─ Duration range
  │   ├─ Departure month
  │   ├─ Sort dropdown
  │   └─ Solo Friendly toggle
  │
  ├─ Results grid (deal cards)
  │
  └─ SearchPagination
```

### Component tree

```
DealsPage
├── Header
├── SearchFilters (interactive controls, reads/writes URL params)
├── Results summary ("15 cruises found")
├── Results grid
│   └── DealCard (reuse card styling from DealsGrid.tsx)
└── SearchPagination
└── Footer
```

### Why this approach is low-risk

- **No backend changes needed** — `GET /api/search` already handles all the filtering/sorting/pagination
- **No new routes** — reusing `/deals` with query params (existing Next.js route)
- **Graceful fallback** — if DB is empty, the search API returns `{ results: [], total: 0 }` → frontend shows empty state
- **URL-driven** — all state is in the URL, so bookmarkable and shareable

### Skip list

Things explicitly NOT in scope (to keep this focused):
- ~~Auto-suggest / typeahead~~ (future enhancement)
- ~~Map view of results~~
- ~~Multi-select cabin types~~
- ~~Price range slider~~ (complex, can add later)
- ~~Availability/real-time booking~~ (analytics engine, not inventory)

