## Cycle #21
**Feature / Fix:** Fix API proxy on Cloudflare Pages by switching from 200 (proxy) to 302 (redirect) in _redirects, and fix frontend API fallbacks from localhost:3001 to relative paths

**Files touched:**
- `public/_redirects` — Changed from `/api/*  https://portly-api.vqh9mnrdbp.workers.dev/api/:splat  200` to `/api/*  https://portly-api.vqh9mnrdbp.workers.dev/api/:splat  302`
- `src/components/search/SearchHero.tsx` — Changed `STATS_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` to `''`
- `src/app/deals/ExploreDealsHero.tsx` — Changed `API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` to `''`
- `src/app/alerts/page.tsx` — Changed `API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` to `''`

**Phase 1 — Audit findings:**
- The `/api/*` endpoints on the live site (`https://portly-1i0.pages.dev/`) were returning 404 pages instead of proxying to the Cloudflare Worker
- Root cause: Cloudflare Pages does not support `200` (proxy) status codes in `_redirects` for external URLs — only `301`, `302`, `307`, `308` work
- Additionally, several frontend components had hardcoded `http://localhost:3001` fallbacks when `NEXT_PUBLIC_API_URL` was unset (which it is in static export builds), causing them to attempt calls to a non-existent local dev server
- This broke API-dependent features like deal listings, stats, alerts, and sailing details

**Phase 2 — Implementation:**
- Changed the `_redirects` rule to use `302` (temporary redirect) which Cloudflare Pages supports for external proxies
- Updated all frontend components to use empty->external redirects
- Changed all four frontend API fallback values from `'http://localhost:3001'` to `''` (empty string) so they use relative paths (`/api/*`) which get redirected by the `_redirects` rule
- The `sailing/[id]/page.tsx` file already used the direct Worker URL for build-time SSG (`generateStaticParams`), which is correct and left unchanged

**Phase 3 — Deploy:**
- Commit: `git commit -m "feat(hermes-loop): [Cycle #21] Fix API proxy on Cloudflare Pages and frontend API fallbacks"`
- Push: `git push origin main`
- Worker deployment: Skipped (no Worker changes)
- Frontend build: `BUILD_TARGET=export npm run build` succeeded
- Frontend deployment: `npx wrangler pages deploy out --project-name=portly --branch=main` succeeded, deployed to https://084ab581.portly-1i0.pages.dev and propagated to portly-1i0.pages.dev

**Phase 4 — Live verification:**
- Ran `BASE_URL=https://portly-1i0.pages.dev/ npx playwright test e2e/_smoke.spec.ts e2e/button-size.spec.ts` → **35 tests passed**
- Verified API endpoints work:
  - `https://portly-1i0.pages.dev/api/deals?limit=2` → 302 → 200 with JSON data
  - `https://portly-1i0.pages.dev/api/stats` → 302 → 200 with JSON data
  - `https://portly-1i0.pages.dev/api/sailing/:id` → 302 → 200 with JSON data
- Verified UI loads correctly:
  - Homepage renders with "Track the Absolute Out-the-Door Cost" heading
  - Deals page loads and shows deal cards
  - Sailing detail pages load for existing IDs

**Phase 5 — Notes / follow-ups for next cycle:**
- The API proxy is now working correctly on Cloudflare Pages via 302 redirects
- All frontend components now use relative API paths that properly proxy through to the Worker
- Next cycle should focus on:
  1. Running the full Playwright suite against the live site to ensure no regressions
  2. Checking for any remaining hardcoded localhost:3001 references in the codebase
  3. Verifying that all E2E tests pass consistently against the live deployment
✅ Cycle #21 Complete

## Cycle #22
**Feature / Fix:** ValidateDeal to expect string ID for API deal validation — internal utility fix

**Status:** ✅ Complete
**Live URL verified:** https://portly-1i0.pages.dev/
**Playwright:** 35/35 passed (5 projects: chromium, firefox, webkit, Mobile Chrome, Mobile Safari)

## Cycle #23
**Feature / Fix:** Fix duplicate `<Header />` component and mislocated `<SailingSubNav>` in `SailingDetailClient.tsx`; sync smoke test expectations with component presence

**Phase 1 — Audit findings:**
- The live Playwright smoke test suite showed 1 failure: "sailing detail page loads" expected `[data-testid="sailing-subnav"]` count=0 but found 1
- Root cause #1: `SailingSubNav` was recreated in commit 9019df8 as a header-attached pill, but the test was never updated — it still asserted the component was "gone" (count 0)
- Root cause #2: `SailingDetailClient.tsx` had `<Header />` rendered TWICE (lines 71-72) — a duplicate from when the patch tool merged the SailingSubNav addition. This caused two stacked header pills
- Root cause #3: `SailingSubNav` was placed at lines 73-83 (outside the `data &&` gate) AND again at lines 119-130 (inside the data block) — the outer one would render during loading/error states but couldn't navigate to sections that hadn't mounted yet

**Phase 2 — Implementation:**
- Removed duplicate `<Header />` at line 72
- Moved the single correct `<SailingSubNav>` inside the `data &&` gate (only renders when sections exist)
- Removed the duplicate outer SailingSubNav (lines 73-83) that was outside the data block
- Updated smoke test from `toHaveCount(0)` → `toHaveCount(1)` for `[data-testid="sailing-subnav"]`

**Phase 3 — Build, Commit, Deploy:**
- `npx tsc --noEmit`: ✅ Passed (exit 0)
- `BUILD_TARGET=export npm run build`: ✅ 520 pages generated (500 sailing IDs)
- Commit: `feat(hermes-loop): [Cycle #23] Fix duplicate Header and SailingSubNav in sailing detail page; update smoke test to expect subnav present`
- Push: `git push origin main` succeeded
- Worker: No changes needed (frontend-only fix)
- Deploy: `npx wrangler pages deploy out --project-name=portly --branch=main` → https://38bd20e0.portly-1i0.pages.dev

**Phase 4 — Live verification:**
- `BASE_URL=https://portly-1i0.pages.dev/ npx playwright test e2e/_smoke.spec.ts e2e/button-size.spec.ts` → **35/35 passed** across 5 browser projects
- Verified after CF Pages propagation (~60s wait): all tests green

**Phase 5 — Notes / follow-ups for next cycle:**
- The full Playwright suite (1270 tests) times out after 240s — need to run it in subsets or with reduced workers
- Check `config.yaml` for `playwright.workers` setting and try `--workers=3` for the full run
- Audit remaining e2e specs for the same stale check pattern (test claiming component doesn't exist when it was re-introduced)
- The `_smoke.spec.ts` is the most critical — the other 1200+ tests in the full suite should be triaged next
✅ Cycle #23 Complete

## Cycle #24
**Feature / Fix:** Update `filter-bar-audit.spec.ts` to test current mobile filter pattern (MobileFilterBar drawer + sticky bottom bar)

**Phase 1 — Audit findings:**
- `filter-bar-audit.spec.ts` had 7 failures across all 5 browser projects (Mobile Filter Bar - Collapsed State + Comprehensive UI/UX Audit on mobile)
- Root cause: The test was written for an older filter pattern — it expected `[data-testid="filter-selection-grid"] button[aria-expanded]` (inline mobile toggle inside FilterSelectionGrid)
- Current design uses `MobileFilterBar` — a sticky bottom bar (`lg:hidden` with `[data-testid="mobile-filters-button"]`) that opens a full-screen drawer (`[data-testid="mobile-filter-drawer"]`) hosting the FilterSelectionGrid with `defaultExpanded={true}`
- The inline FilterSelectionGrid is wrapped in `hidden md:block` (parent), so its mobile toggle is unreachable on mobile (<768px) — this is by design, not a bug

**Phase 2 — Implementation:**
- Replaced stale "Mobile Filter Bar - Collapsed State" test with three new tests matching actual UX:
  1. "Mobile Filter Bar - Sticky Bottom Bar (375px)" — verifies Filters button → drawer with all 4 dropdowns (Line, Region, Dest, Ship) + Sort + Nights/Type/Price
  2. "Mobile Filter Bar - Sort popover works" — verifies bottom-bar Sort button opens popover with options
  3. "Filter Bar - Comprehensive UI/UX Audit (desktop)" — preserves desktop inline filter verification at 1280px
- Updated selectors to use correct test IDs: `filter-cruise-line` (not `filter-line`), `mobile-filters-button`, `mobile-filter-drawer`, `mobile-filter-backdrop`
- Added touch-target checks (≥44px) for mobile drawer buttons per Apple HIG / WCAG 2.5.5

**Phase 3 — Local Verification:**
- `npx tsc --noEmit`: ✅ Passed (exit 0)
- `BASE_URL=https://portly-1i0.pages.dev/ npx playwright test e2e/filter-bar-audit.spec.ts --workers=1`: **15/15 passed** across 5 browser projects
- Combined with smoke tests: **50/50 passed** (35 smoke + 15 filter-bar-audit)

**Phase 4 — Notes / follow-ups for next cycle:**
- The `e2e/` directory is gitignored per project convention; committed this spec as a named regression test since it now validates core mobile filter UX
- Addressed Cycle #23 follow-up: "Audit remaining e2e specs for the same stale check pattern" — filter-bar-audit.spec.ts was the highest-impact stale spec (7 failures → 0)
- Other diagnostic specs in `e2e/_diag_*.spec.ts` are intentionally not committed (one-shot debugging tools)
- Remaining full-suite timeout issue (1270 tests) — consider splitting into targeted runs with `--workers=3`
✅ Cycle #24 Complete

## Cycle #25
**Feature / Fix:** Fix sailing detail API contract — string PK `id` coercion to 0, garbage `port` ("lisbon") instead of itinerary[0] ("Miami"), synthetic 3-element `route` instead of real 5-port itinerary from `itinerary` JSON column

**Root cause (class of bug #17 re-occurred):** The GET `/api/sailing/:id` handler in `workers/src/index.ts` had three defects on the same call path:
1. `id: Number(row.id) || 0` coerced the TEXT primary key (e.g., `carnival_horizon_2026-03-08_miami_6__big_31__v4m`) to `0` — breaking in-page navigation between sailings that used `data.sailing.id`
2. `port: row.departure_port` used the raw text column (some rows had garbage like "lisbon" for a Miami cruise) instead of the first port from the `itinerary` JSON array
3. `route` was synthesized as `[dep_port, destination, dep_port]` (3 elements) instead of parsing the existing `itinerary` JSON column which has 5+ real ports (e.g., `["Miami","Amber Cove","Grand Turk","Half Moon Cay","Miami"]`)

The `itinerary` column was already populated correctly by the expander/ingestion pipeline — the sailing detail endpoint just never used it (unlike the deals endpoint which did). This is the exact same class of bug documented in Pitfall #17 ("Itinerary data requires a D1 column + JSON parse in the GET handler") where the fix was deployed to one endpoint but missed the sibling.

**Phase 1 — Audit findings (live site):**
- `curl https://portly-1i0.pages.dev/api/sailing/carnival_horizon_2026-03-08_miami_6__big_31__v4m` returned `sailing.id: 0`, `port: "lisbon"`, `route: ["lisbon","Eastern Caribbean","lisbon"]`
- Frontend `SailingDetailClient.tsx` reads `data.sailing.id`, `data.sailing.port`, `data.sailing.route` for hero, itinerary timeline, and subnav scroll-spy anchors
- The SSG `generateStaticParams` in `sailing/[id]/page.tsx` already fetches live API for IDs, so the static export had correct pages but the client-side hydration got broken data

**Phase 2 — Implementation (`workers/src/index.ts`):**
- Added `s.itinerary` to the SELECT
- Parse `row.itinerary` JSON → if array length ≥ 2, use as `route` and set `port = parsed[0]`
- Fall back to synthetic `[dep_port, destination, dep_port]` only when itinerary missing/empty
- Changed `id: Number(row.id) || 0` → `id: row.id` (preserve string PK)

**Phase 3 — Build, Deploy, Verify:**
- `cd workers && npx tsc --noEmit`: ✅
- `cd workers && npx wrangler deploy --dry-run --outdir /tmp/wrangler-out`: ✅
- `cd workers && npx wrangler deploy`: ✅ → https://portly-api.vqh9mnrdbp.workers.dev
- Live worker verification:
  - `id: "carnival_horizon_2026-03-08_miami_6__big_31__v4m"` (string preserved)
  - `port: "Miami"` (from itinerary[0], was "lisbon")
  - `route: ["Miami","Amber Cove","Grand Turk","Half Moon Cay","Miami"]` (5 real ports, was 3 garbage)
- `BUILD_TARGET=export npx next build`: ✅ 520 pages (500 sailing IDs)
- `npx wrangler pages deploy out --project-name=portly --branch=main`: ✅ https://2ef34979.portly-1i0.pages.dev
- Production Pages propagation verified (same correct payload)

**Phase 4 — Live E2E verification:**
- `BASE_URL=https://portly-1i0.pages.dev/ npx playwright test e2e/_smoke.spec.ts e2e/button-size.spec.ts --workers=1`: **35/35 passed** (5 projects × 7 smoke + 5 button-size)
- New regression spec `e2e/sailing-api-contract.spec.ts` validates the exact contract: string PK, real port from itinerary, multi-port route, round-trip endpoint matching

**Phase 5 — Notes / follow-ups:**
- The cabinBreakdown zeros are a separate data-pipeline issue (no cabin_prices rows for these sailings) — not in scope for this fix
- This is the second time the "synthetic route vs. real itinerary" bug has appeared on different endpoints — consider a shared helper `parseItinerary(row)` used by both `/api/deals` and `/api/sailing/:id`
- Check if any other Worker endpoints (enhanced/forecast, enrich-tick) have similar PK coercion or synthetic data patterns
- The `e2e/sailing-api-contract.spec.ts` was already committed in 3676ad9; no new commit needed for the spec

✅ Cycle #25 Complete