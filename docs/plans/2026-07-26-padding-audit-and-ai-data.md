# Goal-Loop #3: Refine Phase 2 — Padding Audit & AI Data Enrichment

**Date:** 2026-07-26
**Branch:** main (continues on `d51788e`)
**Owner:** George

## Goal

Two deliberate refinements identified during cruise-page review:

1. **Padding audit** — tighten the inconsistent spacing across sailing-detail cards so visual rhythm is uniform (no `rounded-2xl` next to `rounded-3xl`, no `p-4` next to `p-6` in adjacent panels)
2. **AI prompt data enrichment** — the current prompt passes a thin SailingContext (5 fields). The AI hallucinates specifics (e.g., "Decks 3-4" on Celebrity Beyond) because we don't supply the line-level + ship-level factual payload it needs to anchor on. Fix by enriching the prompt with cabin pricing, ports-of-call, ship class, deployment year, and **cruise-line fingerprint** so the LLM copy reads as insider for THAT line not generic for "Carnival Barcelona".

## Why this is refinement, not re-architecture

- The cruise page already ships and works.
- Visual inconsistency **blunts insider feel** — a user wandering back and forth between cards notices the radii/padding drift.
- AI copy is decent but mostly generic; the user asked the LLM to sound like a "cruise insider", but we're giving it:
  - ship name, line name, region, port, dates, prices.
  - **No** ship class, capacity, build year, fleet position, **line-specific** cabin/concession/philosophy.
  - **No** ports-of-call list (just a count).
  - **No** line-specific guidebook notes (Carnival's "Family-friendly lido hype" vs Royal's "ship-within-a-ship neighbourhoods").
- Both issues are <200-line fixes each.

## Constraints

- TDD-style: visual changes need funnel + enrichment tests pass after each surface
- BUILD_TARGET=export still
- Free tier AI still (no new neurons needed — same call, just longer prompt)
- WCAG/A11y unaffected (no semantic HTML changes)

## Phased Plan

### Phase 1 — Padding/spacing audit (1 commit)

| File | Change |
|---|---|
| **`src/app/sailing/[id]/SailingDetailClient.tsx`** | Unify single-card radii: `rounded-3xl` everywhere except error states → `rounded-2xl`. Normalize padding `p-4` inside cards, `p-6` only on hero. Spacing `space-y-3` aligns with hero→details→hist→analysis→forecast rhythm. Outer `pt-20` kept. |
| **`src/components/sailing/SailingHero.tsx`** | Tighten hero padding from `p-6 sm:p-8` to `p-6 sm:p-7` (very slight, not visible regression). |
| **`src/components/sailing/ItineraryTimeline.tsx`** | `p-6` → sticky; `p-5` → `p-4` to match the rest |
| **`src/components/sailing/SailingInfoPanel.tsx`** | `p-6` → `p-4` |
| **`src/components/sailing/PriceHistoryPanel.tsx`** | both `p-5` → `p-4` |
| **`src/components/sailing/EnhancedDealAnalysis.tsx`** | `p-6` → `p-4` for containers; `p-4` for sub-sections unchanged |
| **`src/components/sailing/EnhancedPriceForecast.tsx`** | outer `p-6` → `p-4`, `space-y-5` → `space-y-3`, sub-block `p-4` unchanged |
| **`src/components/sailing/CabinUpgradeTracker.tsx`**, **`HiddenCostDisplay.tsx`**, **`CabinValueComparison.tsx`** | `p-4` already consistent (unchanged) |
| **`src/components/PriceComparisonTable.tsx`** | Verify table internals; reduce row padding `py-3` → `py-2.5` |

Principle: **outer cards always p-4, never p-6**. Inner sub-blocks (sub-cards in emerald/amber/indigo tint) keep `p-4`.

**Verification:** Visual check via `browser_navigate` against `pre-commit-2` Pages deploy.

### Phase 2 — AI data enrichment (3 commits)

| Step | Output |
|---|---|
| 2.1. **Line fingerprint table** in D1 | `schema/004_line_guides.sql` adds table `line_guides(cruise_line_id INTEGER PRIMARY KEY, personality TEXT, cabin_strategy TEXT, excursion_strategy TEXT, what_avoid TEXT, best_for TEXT, fleet_average_age REAL)` |
| 2.2. **Seed line_guides** for each of 14 lines in the DB | CLI migration `data/line-guides.json` then looped `wrangler d1 execute` |
| 2.3. **Augment SailingContext** in `workers/src/enrich-sailing.ts` | Query line_guides JOIN cruise_lines on lookup; merge into the prompt as `lineProfile` key. Also pass through `cabins[]: [{name, baseFare, portTax, gratuityNight, totalOut, perNight}]` and `ports: [name, …]` lists (use itinerary data if available, fall back to region+count). |
| 2.4. **Tighten prompt rules** | Add: "When describing cabin tier preferences, ONLY recommend tiers present in this sailing's cabinBreakdown. Avoid discussing cabins not offered."  Add: "When giving excursion strategy, reference the **lineProfile.personality** vocabulary (e.g., for Royal Caribbean's family-of-attractions line profile, mention 'flowrider' / 'Royal Genie' patterns; for Carnival 'Fun Ship 2.0' the casual vibe)." |
| 2.5. **Add cabin tier-mention guard** to validator | Reject AI output that mentions a tier name (Inside/Oceanview/Balcony/Suite) NOT present in the cabin breakdown list |
| 2.6. **Re-enrich** the 6 cached sailings | Run `/api/admin/enrich-tick?max=6` after deploy. Verify new copy uses ship class + line vocabulary |
| 2.7. Update `/api/enhanced/deal-analysis` to surface `is_ai_enhanced` even clearer | Done already; no change |

**Verification:**
- `enrichment.spec.ts` PASS with new fields exposed
- Live sailing page shows "talk about" its specific ship class (Edge-class / Excel-class / Sunshine-class) not generic "modern cruise ship"
- Validator rejects over-reaching tier mentions

### Phase 3 — Rollout gates (1 commit)

| Gate | Pass criteria |
|---|---|
| Visual alignment check via `browser_navigate` reachable URL | All cards same radii/padding; hero→details→hist→analysis spacing feels uniform |
| Funnel spec | 4/4 PASS |
| Enrichment E2E | 5/5 PASS, all "force re-enrich" entries land clean (validator hasn't changed so negative-path test added) |
| Build clean | `BUILD_TARGET=export npm run build` exit 0 |
| Lighthouse | Performance ≥ 98, Accessibility ≥ 98 (no regression from padding; some cards now slightly larger where we collapsed heavy padding) |

## Verification

After each commit:
1. `BUILD_TARGET=export npm run build` → exit 0
2. `npx playwright test e2e/funnel.spec.ts` → 4/4 PASS
3. `npx playwright test e2e/enrichment.spec.ts` → 5/5 PASS (+1 new validator test)
4. Visual screenshot diff against the latest preview

## Commit cadence

1. `chore: unify card padding + radii across sailing page` (Phase 1)
2. `feat: line-fingerprint table + seed 14 lines` (Phase 2.1-2.2)
3. `feat: enrich ai prompt with line-guide + cabin layout + ports` (Phase 2.3-2.5)
4. (no commit needed for re-enrich; it's a runtime effect)

## Out of scope

- ❌ Mobile responsiveness audit — already confirmed working in prior loops
- ❌ Dark mode toggle — removed earlier; not re-introducing
- ❌ New visual primitives — staying with Tailwind defaults
- ❌ LLM model swap — keeping `llama-3.1-8b-instruct-fp8`
