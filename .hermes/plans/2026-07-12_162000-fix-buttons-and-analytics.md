# Plan: Fix All Broken Buttons + Add NVIDIA NIM Analytics

## Background
The Portly/TripTide prototype has 20+ buttons that don't do anything useful:
- Navigation buttons only set React state (never navigate)
- Action buttons have no onClick handlers
- Footer links all point to `href="#"`

## Phase 1 — Fix Navigation (Header + Footer)

| Button | Current State | Fix |
|---|---|---|
| Header "Explore Deals" | `setActive(link)` only | Scroll to `#deals` section |
| Header "Price History Maps" | `setActive(link)` only | Navigate to `/history` |
| Header "Solo Hub" | `setActive(link)` only | Navigate to `/solo` |
| Header "Create Price Alert" | No onClick | Navigate to `/alerts` |
| Header "Alert" (mobile) | No onClick | Navigate to `/alerts` |
| 11 Footer links | `href="#"` | Point to real routes |

**New pages needed:** `/history`, `/solo`, `/alerts`, `/about`, `/press`, `/careers`, `/contact`, `/privacy`, `/terms`, `/disclosure`

## Phase 2 — Fix Action Buttons

| Button | Current State | Fix |
|---|---|---|
| "Search Voyages" | No onClick | Navigate to `/deals?destination=X&cruiseLine=Y&passengers=Z` |
| "View Deal" (on card) | No onClick | Navigate to `/sailing/{id}` detail page |
| "Select" / "Select This Cabin →" | No onClick | Open checkout funnel / modal |
| "Refresh live fares" | Disabled when `loading\|deals` | Make work always; add onClick |

**New pages needed:** `/deals` (search results), `/sailing/[id]` (detail page with checkout)

## Phase 3 — Analytics via NVIDIA NIM API

Create a backend service that uses 5 NVIDIA NIM API keys (in `/keys`) to:
- `/api/analytics/market-summary` — LLM-generated market conditions report
- `/api/analytics/deal-analysis/:sailingId` — AI analysis of a specific sailing's pricing
- `/api/analytics/price-forecast/:sailingId` — Predicted price movement
- `/api/analytics/analyze-all` — Batch analyze all sailings, store results

Architecture: Service layer that reads DB, calls NIM API (with key rotation), returns structured JSON.

## Files to Create
1. `src/app/deals/page.tsx` — Search results page
2. `src/app/history/page.tsx` — Price history maps page
3. `src/app/solo/page.tsx` — Solo hub page
4. `src/app/alerts/page.tsx` — Price alerts page
5. `src/app/sailing/[id]/page.tsx` — Sailing detail + checkout page
6. `src/app/about/page.tsx` — About page
7. `src/app/contact/page.tsx` — Contact page
8. `src/app/privacy/page.tsx` — Privacy page
9. `src/app/terms/page.tsx` — Terms page
10. `src/app/disclosure/page.tsx` — Fare disclosure page
11. `server/services/nimAnalytics.ts` — NVIDIA NIM analytics service
12. `server/routes/analytics.ts` — Analytics API routes

## Files to Modify
1. `src/components/layout/Header.tsx` — Fix nav buttons with router navigation
2. `src/components/Footer.tsx` — Replace `href="#"` with real routes
3. `src/components/DealsGrid.tsx` — Add onClick to "View Deal" button
4. `src/components/PriceComparisonTable.tsx` — Add onClick to "Select" button
5. `src/components/search/SearchHero.tsx` — Add onClick to "Search Voyages"
6. `server/index.ts` — Register analytics routes
