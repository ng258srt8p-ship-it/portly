# Plan: Deals Grid Filters

## Current state
- `GET /api/deals` supports `limit` (5/10/20/all) and `passengers` only
- `DealsGrid.tsx` has the deal size selector but no content filters
- The backend returns all deals (15) from the DB view; sorting by `dropPercent` happens in-memory

## Data available (from 15 deals)
| Dimension | Values |
|---|---|
| Cruise line | Royal Caribbean, Carnival, Princess, Norwegian, Celebrity, MSC, Holland America, Disney (8) |
| Destination | Caribbean, Bahamas, Alaska, Mediterranean, Transatlantic (5) |
| Departure port | Miami, Port Canaveral, Seattle, Vancouver, Barcelona, Civitavecchia, Southampton, San Juan (8) |
| Nights | 3–14 |
| Price | $1,222–$4,920 |
| Badge | drop / gold / solo |

## Plan

### P1 — Add filter query params to backend `GET /api/deals` (30 min)
Add optional query parameters:
- `cruiseLine` — comma-separated filter (e.g. `?cruiseLine=Royal+Caribbean,Carnival`)
- `destination` — comma-separated
- `departurePort` — comma-separated
- `minNights`, `maxNights` — integer bounds
- `minPrice`, `maxPrice` — integer bounds
- `badgeType` — comma-separated (drop/gold/solo)
- `sort` — `price-asc`, `price-desc`, `nights-asc`, `nights-desc`, `date-asc`, `date-desc`, `drop-desc`

Backend already does `dbQuery` → `fetchSailingsFromDb()` → dedup → decorate (price history, badge). The filter is applied **after** the DB fetch but **before** the `limit` slice — keeps it simple, single-pass.

### P2 — Add filter bar component `DealsFilters.tsx` (30 min)
A collapsible row of filter controls below the "Hot Deals on the Radar" heading:
- **Cruise line** — row of pill toggles (shows active lines, "All" resets)
- **Destination** — dropdown / pill row
- **Nights** — range slider or quick pills (0–3, 4–7, 8+ etc.)
- **Price** — min/max input pair
- **Badge** — pill toggles (drop / gold / solo)
- **Sort** — dropdown (Price ↑, Price ↓, Drop %, Date, Nights)

"Clear all filters" button appears when any filter is active.

Desktop: horizontal scrollable row. Mobile: stacked with a "Filters" toggle.

### P3 — Wire filters into `DealsGrid.tsx` (5 min)
Replace the current `useCallback(() => fetchDeals(limit), [limit])` with `useCallback(() => fetchDeals(limit, filters), [limit, filters])`, where `filters` is a URLSearchParams-shaped object.

Update `fetchDeals` in `cruiseApi.ts` to accept a second `filters` argument.

### P4 — Persist filters in URL query params (15 min)
When filters change, update the URL's query string (`/deals?cruiseLine=...&sort=price-asc`). On mount, read initial state from the URL. This makes filter states shareable and back/forward navigable.

### P5 — Test gate (5 min)
- `npm run build` — passes
- `npx vitest run` — 27/27
- `npx playwright test` — 18/18
- Manual: click each filter, verify deals grid updates, verify URL updates

## Files changed
| File | Change |
|---|---|
| `server/routes/cruises.ts` | Add filter/sort logic to `/api/deals` |
| `src/services/cruiseApi.ts` | Add `filters` param to `fetchDeals()` |
| `src/components/DealsGrid.tsx` | Pass filters to fetcher, read from URL |
| `src/components/DealsFilters.tsx` | **NEW** — filter bar component |
| `src/types/cruise.ts` | Add `DealFilters` type |

## Not in scope
- Server-side pagination (frontend already limits/offsets)
- Search text filter (covered by the existing hero search plan)
- Price history view filtering (just deals grid for now)
