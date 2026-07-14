# Plan: Dynamic Content & Deal Size Controls

## Current State

**Dead links (1 remaining):**
- `/fare-disclosure` returns 404 (no route file exists). The footer links to `/disclosure` (200), but the breadcrumb/static reference is missing.

**Static content:**
- `DealsGrid.tsx` loads deals once on mount and never refreshes
- No auto-refresh / polling — user has to manually reload the page
- Stale data stays visible until next page load

**No deal size controls:**
- `DealsGrid.tsx` always fetches `GET /api/deals?limit=20` — no user control
- No "Show 5 / 10 / 20 / All" selector
- The API already supports `limit` and `offset` params, frontend just doesn't expose them

---

## Phase 1 — Fix Dead Link (quick fix)

1. Verify `/fare-disclosure` page exists or create redirect
   - If no file: add `src/app/fare-disclosure/page.tsx` that redirects to `/disclosure`
2. Confirm all other nav/footer links return 200

## Phase 2 — Deal Size Controls

**Frontend — `DealsGrid.tsx`:**

1. Add a row above the grid: "Show: 5 · 10 · 20 · All" pill buttons
2. Pass `limit` to `fetchDeals()` based on selection (All = no limit / a high cap like 100)
3. The API already supports `GET /api/deals?limit=N&offset=0` — just wire it up
4. Persist the choice in `localStorage` so it survives refresh

**Backend — `server/routes/cruises.ts`:**

5. Update `GET /api/deals` to support an `offset` parameter for pagination (currently only `limit`)
6. Add a total count to the response so the frontend can show "Showing 5 of 20 deals"
7. When `limit` is large (e.g. 50+), consider batching or cursor-based pagination

## Phase 3 — Auto-Refresh / Dynamic Content

**Frontend — `DealsGrid.tsx`:**

1. Add `useLiveData` or a `useInterval` hook that polls `GET /api/deals` every 30s
2. Show a subtle "Updated Xs ago" timestamp in the corner (already partially exists as "Synced 16s ago")
3. When new data arrives, gracefully merge/replace — avoid jarring layout shifts
4. Add a manual "Refresh now" button next to the timer
5. Loading: show skeleton cards during initial load, but on refresh just update the data silently

**Backend:**

6. Ensure `/api/deals` returns a `generatedAt` or `syncedAt` timestamp so the frontend can show staleness
7. No DB changes needed

## Phase 4 — Solo Hub + History Freshness

**Solo Hub (`/solo`):**
1. Already uses `useLiveData` — verify the polling interval is appropriate (30-60s)
2. Add "Updated Xs ago" timestamp
3. Ensure filter pills work with live updates

**History Maps (`/history`):**
1. Already uses `useLiveData` — same treatment
2. Sparklines should update when new price points arrive

## Wireframe (Deals Grid)

```
┌─────────────────────────────────────────────────────────────┐
│  ✦ 20 Deals Available          Show: ○5 ●10 ○20 ○All       │
│                                     ⟳  Updated 12s ago      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ Deal 1  │ │ Deal 2  │ │ Deal 3  │  ...                   │
│ └─────────┘ └─────────┘ └─────────┘                        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ Deal 4  │ │ Deal 5  │ │ ...     │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                             │
│              ◀ 1 2 3 ... ▶    (if paginated)               │
└─────────────────────────────────────────────────────────────┘
```

## Files to modify

| File | Phase | Change |
|---|---|---|
| `src/app/fare-disclosure/page.tsx` | P1 | **Create** — redirect to `/disclosure` |
| `src/types/cruise.ts` | P2 | Add `fetchDealsOptions` type if needed |
| `src/services/cruiseApi.ts` | P2 | Update `fetchDeals()` to accept `limit`, `offset` params |
| `src/components/DealsGrid.tsx` | P2+P3 | Add size selector + auto-refresh + timestamp |
| `server/routes/cruises.ts` | P2 | Add `offset` param support to `/api/deals`, return total count |

## What NOT to do
- ❌ Don't add WebSocket / SSE — polling is fine for this use case
- ❌ Don't change DB schema
- ❌ Don't modify the sailing detail page or backend analytics
- ❌ Don't add user accounts or persisted preferences (except localStorage)

## Verification
- [ ] `npm run build` passes
- [ ] Vitest 27/27 passes
- [ ] Playwright 18/18 passes
- [ ] `/fare-disclosure` → 200 (redirects to `/disclosure`)
- [ ] Deals grid has "Show 5/10/20/All" selector
- [ ] Selected size persists across refresh (localStorage)
- [ ] Deals grid auto-refreshes every 30s with "Updated Xs ago"
- [ ] Manual "Refresh now" button works
- [ ] Solo Hub and History also auto-refresh with freshness indicator
