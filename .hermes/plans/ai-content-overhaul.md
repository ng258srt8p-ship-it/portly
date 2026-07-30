**Objective:** Transform /sailing/[id] into a high-signal, data-driven cruise intelligence page by surfacing AI-generated content that's already in the DB, fixing the broken endpoint mismatch, and adding a scannable Key Takeaways callout + structured content modules.

**Audit findings (Phase 1):**
- AI enrichment already exists: `workers/src/ai-prompts.ts` + `workers/src/enrich-sailing.ts` → writes `ai_insider_summary`, `ai_cabin_strategy`, `ai_excursion_strategy`, `ai_deal_score_narrative`, `ai_score` to `sailings` table.
- **API gap**: `workers/src/index.ts` `/api/sailing/:id` returns only `{sailing, cabinBreakdown, priceHistory}` — does NOT expose any `ai_*` columns.
- **Path mismatch**: `src/components/sailing/NimDealAnalysis.tsx` calls `/api/analytics/deal-analysis/:id` (404). The actual route is `/api/enhanced/deal-analysis/:id`.
- **No key takeaways UI**: `SailingDetailClient.tsx` renders no AI summary, no callout badges, no port intel, no cabin recommendation. Currently just shows `<EnhancedDealAnalysis>` + `<EnhancedPriceForecast>` + `<ItineraryTimeline>` + `<CabinUpgradeTracker>` etc. — pure data, no narrative.
- **Cabin prices are zero for this sailing**: API returns all-zero `cabinBreakdown` because `cabin_prices` table has no rows for `carnival_horizon_2026-03-08_miami_6__big_31__v4m`. Cabin recommendation module would have nothing to recommend.
- **History has 12 data points** — enough to compute "vs X-day average" percentile claims from JS, no DB enrichment needed.

**Implementation strategy (4 phases):**

### Phase 2A: API exposure
Edit `workers/src/index.ts` `/api/sailing/:id`:
- Add `s.ai_insider_summary, s.ai_cabin_strategy, s.ai_excursion_strategy, s.ai_deal_score_narrative, s.ai_score, s.ai_generated_at` to the SELECT.
- Surface them inside the `sailing` object: `aiInsiderSummary`, `aiCabinStrategy`, `aiExcursionStrategy`, `aiDealScoreNarrative`, `aiScore`, `aiGeneratedAt`.

### Phase 2B: Build the prompt template enhancement
The existing `buildEnrichmentPrompt` already produces 4 sections that map to the goal's modules (insiderSummary ≈ Module A "Deal Verdict", cabinStrategy ≈ Module D, excursionStrategy ≈ Module C, dealScoreNarrative ≈ Module A). To better hit Modules B (Ship Personality) we add ONE new section to the prompt + the matching DB column:
- Add `shipPersonality` to the JSON output: atmosphere, bestFor (from line guide), standoutAmenities (from shipDescriptions).
- Add `ships.class` to the SELECT in `enrich-sailing.ts` (currently fetched as `ship_class` only in context but not populated for all ships).
- New DB column: `ai_ship_personality` (TEXT, JSON-encoded).

### Phase 3: Frontend overhaul
Edit `src/app/sailing/[id]/SailingDetailClient.tsx` and add a new component `src/components/sailing/SailingKeyTakeaways.tsx`:
1. New `SailingKeyTakeaways` component renders at top of Overview section — high-contrast card (`rounded-xl border border-primary/20 bg-muted/30 p-5 mb-6`) with 3-4 inline-flex badges: `🔥 Deal Score: 8.8/10`, `⚓ 2 Sea Days / 3 Ports`, `👨‍👩‍👧 Best For: …`, plus a 2-line "Deal Verdict & Price Value Pitch" pulling `aiDealScoreNarrative` (or heuristic if AI columns are NULL).
2. Refactor `<EnhancedDealAnalysis>` section to render `ai_insider_summary`, `ai_cabin_strategy`, `ai_excursion_strategy`, `ai_deal_score_narrative` as 4 micro-modules with `<MaterialIcon>` headers and bullet lists when content is present, with clean skeletons when loading.
3. Add a fallback path: when `ai_*` columns are NULL, render a deterministic heuristic from the live `pricing.drop_pct`, `per_night`, `original_price`, `route`, `cabinBreakdown` so the page is never empty for unenriched sailings.
4. Loading skeleton + empty state polish using existing `animate-pulse h-4 bg-muted rounded` patterns.

### Phase 4: Verification
1. `e2e/sailing-content.spec.ts` — assert:
   - Key takeaways card renders with badge elements (no `undefined`, no empty string)
   - Deal verdict section visible with non-empty body text
   - Cabin strategy section visible with non-empty body text
   - Excursion strategy section visible with non-empty body text
   - No raw HTML tag leakage (`<undefined>` or `[object Object]` forbidden)
   - Loading skeleton disappears after network idle
2. Run on live `https://portly-1i0.pages.dev/sailing/carnival_horizon_2026-03-08_miami_6__big_31__v4m`.
3. Build + deploy to Cloudflare Pages.
4. Re-run Playwright against the live deployment URL.
5. Commit + push to `origin/main`.

**Constraints:**
- Don't break the existing `<EnhancedDealAnalysis>` API path (separate component, separate endpoint).
- Don't break existing tests (`e2e/uiux-audit.spec.ts`, `e2e/sailing-subnav-audit.spec.ts`, `e2e/mobile-subnav-popover.spec.ts`).
- Preserve TypeScript types in `SailingData` interface.
- No new external dependencies.
- Portly brand voice (no exclamation marks, no emoji outside the badges which are explicitly requested).

**Files to touch:**
- `workers/src/index.ts` — `/api/sailing/:id` route (add ai_* columns)
- `workers/src/ai-prompts.ts` — add `shipPersonality` to prompt output
- `workers/src/enrich-sailing.ts` — add `ai_ship_personality` column write
- `src/app/sailing/[id]/SailingDetailClient.tsx` — add `<SailingKeyTakeaways>` at top, render AI modules
- `src/components/sailing/SailingKeyTakeaways.tsx` — NEW component (badge callout + verdict pitch)
- `e2e/sailing-content.spec.ts` — NEW test file

**Stop when:**
- Live page renders Key Takeaways card with ≥3 badges populated
- AI section modules render with non-empty body text for this sailing (or fallback heuristic copy)
- Playwright spec passes 100%
- Audit (`e2e/uiux-audit.spec.ts`) still passes (no regressions)
