# Plan: Rich Sailing Detail Page with NIM-Powered Enrichment

## Problem

The `/sailing/[id]` page shows only basic info (ship name, line, days, route, cabin pricing table) and lacks:
- Current price with original/strikethrough comparison
- AI-powered deal analysis ("Is this a good deal?")
- AI-powered price forecast ("Will prices drop further?")
- 90-day price history chart (from real DB data)
- Solo supplement info
- Ship details (class, amenities, size)
- Visual itinerary timeline
- Book call-to-action tied to pricing

## What Exists

- **API**: `GET /api/sailing/:id` returns `{ sailing, cabinBreakdown, priceHistory }`
- **NIM Analytics**: `GET /api/analytics/deal-analysis/:sailingId` and `GET /api/analytics/price-forecast/:sailingId` exist in `nimAnalytics.ts` + `routes/analytics.ts`
- **DB**: `sailings` table (ship_name, cruise_line, departure_date, duration_days, itinerary[], departure_port, destination_region, ship_class, total_cabins). `pricing_history` table (date-ordered price snapshots). `pricing_snapshots` (current cabin prices).
- **Frontend**: `PriceComparisonTable` component, `useLiveData` hook, `SailingDetailPage` stub in `src/app/sailing/[id]/page.tsx`
- **Types**: `Deal`, `CabinRate`, `Itinerary` in `src/types/cruise.ts`

## Plan

### Step 1: Create NIM-rich sailing page components

Create new components under `src/components/sailing/`:

**`SailingHero.tsx`** — Hero banner
- Sailing ship name, cruise line logo area
- Current price (largest number on page)
- Strikethrough original price if drop exists
- Drop % badge
- Departure date, duration, destination
- "Synced X ago" status

**`ItineraryTimeline.tsx`** — Visual port-timeline
- Render itinerary array as connected cards with arrows
- Show day number per port
- Highlight embarkation/debarkation ports

**`PriceHistoryPanel.tsx`** — Trend data
- Sparkline chart from `priceHistory` array
- Mini table with recent price snapshots (date, cabin type, price)
- Source badges ("Inside: $X, Balcony: $Y, Suite: $Z")

**`NimDealAnalysis.tsx`** — AI-powered deal analysis
- Calls `GET /api/analytics/deal-analysis/:sailingId`
- Renders markdown from NIM response (deal rating, price trend, solo friendly, recommendation)
- Fires on mount, caches in component state
- Shows loading skeleton while NIM responds

**`NimPriceForecast.tsx`** — AI-powered price forecast
- Calls `GET /api/analytics/price-forecast/:sailingId`
- Renders markdown from NIM response (direction, confidence, estimated range)
- Shows loading skeleton while NIM responds

**`SailingInfoPanel.tsx`** — Ship & sailing metadata
- Ship class, total cabins, departure port info
- Solo supplement info (waived or %)
- Sync source / last sync timestamp
- Cabin categories available

### Step 2: Wire `PriceComparisonTable` to receive `sailingId` prop

The component currently hardcodes `fetch('/api/sailing/1')`. Change it to:
- Accept optional `sailingId` prop
- When provided, fetch `/api/sailing/${sailingId}`
- Fall back to hardcoded `1` only when no prop given

### Step 3: Rewrite `src/app/sailing/[id]/page.tsx`

New layout:

```
┌─────────────────────────────────────────────┐
│  SailingHero                                │
│  [Ship Name]    [Line]    [Price $X,XXX]    │
│  [Depart Date]  [Duration]  [Drop -X%]      │
├─────────────────────────────────────────────┤
│  ItineraryTimeline                          │
│  Day 1: Miami → Day 3: CocoCay → Day 7:... │
├─────────────────────────────────────────────┤
│  PriceHistoryPanel     │  NimDealAnalysis   │
│  [Sparkline chart]     │  [Deal rating]     │
│  [Snapshot table]      │  [Recommendation]  │
├─────────────────────────────────────────────┤
│  Cabin Pricing (PriceComparisonTable)        │
│  [Inside] [Oceanview] [Balcony] [Suite]     │
├─────────────────────────────────────────────┤
│  NimPriceForecast                           │
│  [Direction] [Confidence] [Est. Range]      │
├─────────────────────────────────────────────┤
│  SailingInfoPanel        │  [Book Button]   │
│  [Ship class] [Cabins]   │                  │
└─────────────────────────────────────────────┘
```

### Step 4: Add a route for NIM-rich sailing data

Option A (preferred): Extend `GET /api/sailing/:id` to optionally include NIM analysis
- Add query param `?enrich=true`
- When `enrich=true`, fire NIM calls in parallel (deal-analysis + price-forecast)
- Return them alongside the existing `{ sailing, cabinBreakdown, priceHistory }`

Option B: Keep separate calls (existing analytics routes)
- Frontend makes 3 parallel fetches: `/api/sailing/:id`, `/api/analytics/deal-analysis/:id`, `/api/analytics/price-forecast/:id`
- Simpler backend changes, more frontend orchestration

**Recommend: Option B** — analytics routes already exist, no backend changes needed. The `useLiveData` hook already handles parallel loading states.

### Step 5: CSS & Polish

- Dark theme consistent with TripTide's existing design system
- Responsive: mobile = stacked sections, desktop = 2-column on history+analysis
- Loading skeletons with pulse animation
- Error boundaries per section (so NIM failure doesn't crash the page)

## Files Changed

| File | Change | Complexity |
|---|---|---|
| `src/app/sailing/[id]/page.tsx` | Rewrite — full rich layout with all new components | Medium |
| `src/components/sailing/SailingHero.tsx` | **New** — hero section | Small |
| `src/components/sailing/ItineraryTimeline.tsx` | **New** — visual port timeline | Small |
| `src/components/sailing/PriceHistoryPanel.tsx` | **New** — sparkline + history table | Small |
| `src/components/sailing/NimDealAnalysis.tsx` | **New** — AI deal analysis component | Small |
| `src/components/sailing/NimPriceForecast.tsx` | **New** — AI price forecast component | Small |
| `src/components/sailing/SailingInfoPanel.tsx` | **New** — ship info panel | Small |
| `src/components/PriceComparisonTable.tsx` | Accept `sailingId` prop, remove hardcoded 1 | Small |

## Verification

1. `npm run build` — pass
2. `npx vitest run` — 27/27 pass
3. `npx playwright test` — 18/18 pass
4. Navigate to `/sailing/1` → shows: hero with price, itinerary timeline, sparkline chart, AI analysis card, cabin table, forecast
5. NIM deal analysis loads within 3-5 seconds (loading skeleton shows while NIM responds)
6. NIM price forecast loads within 3-5 seconds
7. Refresh → NIM results show caching/skeleton (no double-loading on re-mounts)
8. Navigate to `/sailing/99999` → proper error state, not a crash
