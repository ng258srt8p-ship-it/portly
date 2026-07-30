**Objective:** Fix the two cascading issues on /sailing/[id]:
1. **Cabin pricing cards show $0** — all 4 buttons (Inside/Oceanview/Balcony/Suite) display "$0" because `cabinBreakdown` from the API returns 4 zero-rows when no real `cabin_prices` rows exist for the sailing, and the frontend binds directly to `cb.raw.totalOutTheDoor`.
2. **AI content is shallow** — verdict text is 180 chars (essentially the heuristic fallback), no AI copy rendered (all `ai_*` columns null on this sailing), no ship personality intel, no per-port intel, no real cabin recommendation.

**Read first:** workers/src/index.ts (lines 711-758 cabinBreakdown), src/components/sailing/PriceHistoryPanel.tsx (lines 285-302), src/components/sailing/SailingKeyTakeaways.tsx, e2e/sailing-content-audit.spec.ts

**Audit findings (Playwright-verified on `b1a558ac.portly-1i0.pages.dev`):**

1. **API returns `cabinBreakdown: [4 zero rows]`** when no `cabin_prices` rows exist. The endpoint hard-codes Inside/Oceanview/Balcony/Suite with all-zero values. This is misleading data — it looks like real cabin prices but is fabricated zeros.

2. **`priceHistory` is real**: 12 datapoints, all `cabin_type: "Inside"`, values $585-$938. The Inside cabin button shows $0 because `cabinBreakdown[0].raw.totalOutTheDoor` is 0, not because data is missing.

3. **Fallback in `PriceHistoryPanel.tsx:291-301` does NOT activate** — its condition is `cabinBreakdown && cabinBreakdown.length > 0` which is true (4 rows), so it uses the zero rows. Should also gate on `all values > 0` or `totalOutTheDoor > 0` for at least one row.

4. **No enrichment running on this sailing**: `aiInsiderSummary`, `aiCabinStrategy`, `aiExcursionStrategy`, `aiDealScoreNarrative`, `aiScore`, `aiGeneratedAt` are ALL null. Either the enrichment tick hasn't reached this sailing or `enrich-sailing.ts` is failing silently. Without seeing admin telemetry, can't be sure.

5. **`shipClass` + `shipLaunchedYear` are also null** for the only sailing we tested (Carnival Horizon) — defensive SELECT in `index.ts` falls back to minimal projection, so these fields are missing from response entirely.

**Root cause hierarchy:**
- **Issue 1 ($0 cabins)** → API contract: returns fabricated zero rows instead of an empty array when no real data exists
- **Issue 2 (shallow AI content)** → (a) AI enrichment hasn't run for this sailing, (b) SailingKeyTakeaways falls back to a 180-char heuristic instead of generating richer sections

**Implementation strategy (3 phases):**

### Phase 1: Fix the $0 cabin price bug (API contract)

In `workers/src/index.ts` line 711-795, change `cabinBreakdown` semantics:
- When `cabinRows.length === 0` (no real data) AND the sailing has `priceHistory` with real values: synthesize cabin tiers from the priceHistory using a typical premium multiplier (Inside = priceHistory avg, Oceanview = 1.15×, Balcony = 1.30×, Suite = 1.60×). Flag these with a synthetic flag so the UI can show "(estimated)" badge.
- When `cabinRows.length === 0` AND no priceHistory: return `cabinBreakdown: []` (empty array, not 4 zero rows).
- When real data exists: leave as-is.

This eliminates the misleading $0 rows AND gives every sailing real cabin prices (synthesized from priceHistory which exists for almost all sailings).

### Phase 2: Fix the fallback in `PriceHistoryPanel.tsx`

Lines 286-302 — gate the `cabinBreakdown` path on having at least one non-zero `totalOutTheDoor` value. If all rows are zero, fall through to the priceHistory path (which already exists at line 291-301). Currently the conditional only checks `length > 0`, not the values inside.

### Phase 3: Trigger enrichment + enrich the AI content depth

The enrichment tick exists (`enrich-sailing.ts`) but sails are stale. Two paths:
1. **Force-enrich this specific sailing** by calling the admin endpoint `/api/admin/enrich/:id?force=1` — needs SCRAPER_SECRET auth. Won't have it locally without scraping for it, so defer.
2. **Make SailingKeyTakeaways richer when AI is null** — extend the heuristic to produce:
   - A multi-line verdict pitch (3-4 sentences with port names, price/night, drop%, ship class if available)
   - Per-port intel from `route[]` array (one highlight per port)
   - Ship personality from `cruise_line` (line-level data exists in DB)
   - A real cabin recommendation from synthesized cabin tiers
   - A "Deal History" mini-callout showing recent price trend from `history[]` (e.g. "Prices have dropped $X over the last Y days")

### Phase 4: Verification

`e2e/sailing-content-audit.spec.ts` — extend to assert:
- Cabin buttons show real prices (> $0), no `undefined` or `$0` literal
- Verdict pitch ≥ 3 sentences (≈ 300 chars) with port names referenced
- If `aiDealScoreNarrative` is null, the heuristic fallback uses `route[]` ports and `history[]` trajectory
- All 4 badge pills are populated

**Constraints:**
- Don't change the API contract shape (`sailing/cabinBreakdown/priceHistory` top-level keys preserved)
- Don't break existing audit specs (12 passing currently)
- Preserve `data-testid` attributes for downstream tests
- No new dependencies

**Files to touch:**
- `workers/src/index.ts` — synthesize cabin tiers from priceHistory when cabin_prices table is empty (Phase 1)
- `src/components/sailing/PriceHistoryPanel.tsx` — fix fallback gate (Phase 2)
- `src/components/sailing/SailingKeyTakeaways.tsx` — richer heuristic with port intel, history trend, multi-line verdict (Phase 3)
- `e2e/sailing-content-audit.spec.ts` — assertion upgrades (Phase 4)

**Stop when:**
- All 4 cabin price buttons show non-zero real prices on live page
- Key Takeaways verdict pitch is ≥ 280 chars with port names referenced (when `route[]` has 2+ ports)
- All existing audit tests still pass (12 passing + 3 from sailing-content.spec.ts)
- New assertions in audit spec pass
