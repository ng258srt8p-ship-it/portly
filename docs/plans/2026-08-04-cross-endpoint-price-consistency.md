# Cross-Endpoint Price Consistency Plan

**Goal:** Make `/api/deals` and `/api/sailing/:id` return the *identical* headline price for every sailing by sharing one canonical `totalOutTheDoor` formula.

**Root cause:** The two endpoints compute OTD independently with different base-fare sources:
- `/api/sailing/:id` → real `cabin_prices.base_fare_per_person` for Inside cabin → $449
- `/api/deals` → `avg(last 5 priceHistory)` as Inside base → $588
Result: one sailing shows $759 detail-page vs $901 deals-grid.

**Architecture:** Pull the Inside `cabin_prices` row in both endpoints and apply the same `base + portTax + gratuity × nights` formula.

**Tech stack:** Cloudflare Workers (D1), Next.js 14 static export.

---

## Gate Table (Machine-Verifiable)

| Gate | What | Command | Pass condition |
|------|------|---------|----------------|
| G1 | `formatSailing` adds `totalOutTheDoor` from Inside cabin row | `grep -A5 'totalOutTheDoor' workers/src/index.ts` | shows `cabinBase + PORT_TAX + gratuity × nights` |
| G2 | Worker TS compiles clean | `cd workers && npx tsc --noEmit` | exit 0 |
| G3 | Next.js build succeeds | `cd .. && pnpm run build` | exit 0 |
| G4 | Preview deploy succeeds | `wrangler pages deploy ./out --project-name=portly` | new preview URL returned |
| G5 | Playwright sailing-hero-otd passes | `BASE_URL=<preview> npx playwright test e2e/sailing-hero-otd.spec.ts` | 0 failed |
| G6 | Playwright full suite passes | `BASE_URL=<preview> npx playwright test` | ≤ 224 passed, 0 failed |
| G7 | Promoted to production | `wrangler pages deploy ./out --project-name=portly` | `portly-1i0.pages.dev` updated |
| G8 | Live spot-check: detail price == deals price for Splendor | browser screenshot / curl | $759 == $759 both places |

---

## Loop 0 — Diagnose

Task 0-1: Confirm the mismatch exists in the current API responses.
- Fetch `/api/sailing/carnival_splendor_2026-09-01_long-beach_7` → `cabinBreakdown[0].totalOutTheDoor` = $759
- Fetch `/api/deals?limit=50` → find same sailing → `price` field = $588 (raw), `totalOutTheDoor` (if present) = $901
- Document the discrepancy.

Exit Gate: ✅ G1 — source of truth is `cabin_prices` table; both endpoints must use it.

---

## Loop 1 — Unify worker formulas

**Objective:** Make `formatSailing()` (used by `/api/deals`) compute `totalOutTheDoor` from the Inside cabin row via LEFT JOIN, matching the sailing-detail formula.

Task 1-1: In `formatSailing()` or its caller inside `/api/deals`, LEFT JOIN `cabin_prices` for sailing's Inside cabin and compute:

```
const row = cabinRows.results?.[0];  // Inside base by base_fare ASC
const base      = row ? Number(row.base_fare_per_person) : avgLast5History;
const portTax   = row ? Number(row.port_tax_per_person) : 180;
const gratuity  = row ? Number(row.gratuity_per_person_per_night) : 18.5;
r.totalOutTheDoor = base + portTax + gratuity * nights;
```

Task 1-2: Ensure `r.price` is the same `base` (Inside base fare), not `sailings.price` which is a per-night stub.

Task 1-3: The deals response's top-level `price` field must equal `totalOutTheDoor - portTax - gratuity` so the deals-card's `price` prop still works without changes to the React component. Actually simpler: set `r.listedPrice = r.totalOutTheDoor` and update the deals grid to render `listedPrice`. But to keep the diff minimal, update `price` to the Inside base fare and let the card render `totalOutTheDoor` for the headline (both fields present).

Exit Gate: ✅ G1 (code inspection), ✅ G2 (tsc clean).

---

## Loop 2 — Rebuild and preview

Task 2-1: `cd workers && npx tsc --noEmit` — Ground truth compilation check.
Task 2-2: `cd .. && pnpm run build` — Next.js export.
Task 2-3: `wrangler deploy` (worker) then `wrangler pages deploy ./out --project-name=portly`.
Task 2-4: Open `/api/sailing/{id}` and `/api/deals?limit=5` in browser; confirm same sailing shows same `totalOutTheDoor` value (± rounding).

Exit Gate: ✅ G3, ✅ G4, ✅ G5 (spot-check via browser_console JSON parse).

---

## Loop 3 — Automated verification and production promotion

Task 3-1: Run full Playwright suite against preview: `BASE_URL=<preview> npx playwright test --project=chromium --reporter=line | tail -5`
Task 3-2: Verify ≤ 1 new failure vs the known `hero-otd` SPA-fallback issue (3-4 skipped/dnr acceptable, 0 new failures).
Task 3-3: Promote: `wrangler pages deploy ./out --project-name=portly`.
Task 3-4: Live spot-check: load `https://portly-1i0.pages.dev/sailing/carnival_splendor_2026-09-01_long-beach_7` and `https://portly-1i0.pages.dev/deals/`; confirm $759 appears in both places (hero, cabin table, and deals card all derive from `cabinBreakdown[0].totalOutTheDoor`).

Exit Gate: ✅ G6, ✅ G7, ✅ G8.

---

## Rollback

If Loop 1 causes unexpected regressions:

```bash
# Rollback worker to previous version
cd workers && git checkout HEAD -- src/index.ts && wrangler deploy

# Rollback pages to previous commit's build
cd .. && git checkout HEAD~1 -- out/  # if out/ is tracked; else rebuild previous commit
wrangler pages deploy ./out --project-name=portly
```

---

## Pre-Flight Checklist (before starting)

- [ ] Current branch is `main` and pushed
- [ ] `workers/src/index.ts` line ~130 (formatSailing / totalOutTheDoor) is the target
- [ ] No other uncommitted changes in the worker besides the price fix
- [ ] `wrangler deploy` auth token valid
