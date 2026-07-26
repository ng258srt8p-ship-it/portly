# Goal-Loop: AI Enrichment + SEO Landing Page + Custom Domain

**Date:** 2026-07-25
**Status:** IN PROGRESS
**Branch:** main
**Owner:** George

## Active Goal

Convert TripTide from a heuristic-only cruise aggregator into an **insider-grade intelligence platform** with:

1. **Phase A — Cost / feasibility analysis** of adding real LLM-powered cruise insights
2. **Phase B — SEO landing page** with meta description, OG tags, JSON-LD structured data, robots.txt, sitemap fix
3. **Phase C — AI enrichment pipeline** wired into the existing `*/30 * * * *` sync cron, writing deals/forecasts/insider-content to D1 cache so the frontend consumes cached analysis (no AI on page load)

## Constraints & Preferences

- TDD-first when adding new behavior (failing test → minimal impl → pass → commit)
- Worker is `portly-api` on Cloudflare, D1 = `portly-db`, KV = `CACHE`
- Cron: `*/30 * * * *` self-populates D1
- BUILD_TARGET=export for CF Pages (no server components, all enrichment cached at sync time)
- Frontend should never call LLM APIs directly — must consume cached analysis from D1
- AI cost should be near-zero (free or near-free tier preferred)
- Einstein-grade copy: hard pricing, cabin strategy, shore excursions, gratuities math

## Why these phases

The landing page is currently doing search & funnel work but has **no SEO surface** — Google sees title + description only, no structured data, no robots.txt, sitemap using unset `NEXT_PUBLIC_SITE_URL`. Without SEO, organic acquisition is dead. This is the highest ROI change.

AI enrichment unlocks the "**insider**" promise of the brand — heuristic analysis works but sounds generic. Real LLM copy about specific ships (e.g., "what makes a Carnival Conquest cabin on deck 9 different from deck 2") is what makes the site memorable and shareable.

Cost analysis comes first so we don't commit to Phase C with an unrealistic budget. Cloudflare Workers AI free tier is generous (10k neurons/day), so we can fully enrich 81 sailings every sync without payment.

## Costs / Risks

| Concern | Mitigation |
|---|---|
| LLM cost overruns | Use Cloudflare Workers AI free tier (10k neurons/day = ~3,888 ship-classified inferences/day safely). Trigger AI only on price-changed sailings to stay 10x under limit. |
| Worker 30s CPU limit | AI inference can take 5-15s per call. Only enrich on price diff > threshold; process max 5-10 per cron. |
| Cache invalidation | Always overwrite row; never store partial state. Use KV with 24h TTL for `last_enrichment_run` metadata. |
| SEO indexing delay | Sitemap submission only after OG metadata live. robots.txt blocks `/api` and `/admin` paths. |
| Static export compatibility | No `useSearchParams` from `next/navigation`. SEO metadata uses `MetadataRoute` and explicit `<head>` children only. |
| WCAG regression | SEO additions must not change visible content layout. JSON-LD is server-rendered only. Lighthouse must stay >90. |

## Phased Plan

### Phase A — Cost analysis & finalize enrichment strategy (no code)

| Step | Output |
|---|---|
| A1. Confirm Workers AI fits budget | doc: 1-page `docs/ai-enrichment-strategy.md` with neuron math |
| A2. Pick model | `@cf/meta/llama-3-8b-instruct` (capable, fast, fits free tier) |
| A3. Define trigger conditions | price diff > 5% OR new sailing OR insufficient fields |
| A4. Define output schema | matches `EnhancedDealAnalysis` exact field shape so frontend doesn't change |

### Phase B — SEO landing page + meta infra (3 commits)

| Step | Output |
|---|---|
| B1. Add `public/robots.txt` | allow all + sitemap reference. Verify written before build. |
| B2. Set `NEXT_PUBLIC_SITE_URL=https://portly-1i0.pages.dev` in `.env.local` + production env | Sitemap then points to correct base URL |
| B3. Create `src/app/page.metadata.ts` with page-specific title, description, OG image, Twitter card | Move from layout-inherited to per-page. Add canonical URL. |
| B4. Add `public/og-default.svg` (1200x630) showcasing price+ships tagline | Static image for OG. |
| B5. Inject JSON-LD `Organization`, `WebSite`, `FAQPage` into `page.tsx` (or via routes) | Search-engine structured data |
| B6. Test: lighthouse SEO ≥ 90, valid JSON-LD via browser_console, robots.txt served | Done when Lighthouse 100% |

### Phase C — AI enrichment pipeline (4-6 commits)

| Step | Output |
|---|---|
| C1. Add `[ai]` binding to `workers/wrangler.toml` (`[[ai]] binding = "AI"`) | Wire Workers AI |
| C2. New schema `003_ai_enrichment_cache.sql`: add columns to `sailings` table — `ai_score INTEGER, ai_summary TEXT, ai_insider_tips TEXT (JSON), ai_generated_at TEXT, ai_model TEXT` | D1 cache, no new table needed |
| C3. `lib/ai-generation/prompts.ts`: prompt builders for `insiderSummary`, `cabinStrategy`, `excursionStrategy` | Reusable |
| C4. `lib/ai-generation/enrichSailing.ts`: takes a sailing row, calls `c.env.AI.run(model, msgs)`, returns parsed JSON | Worker util |
| C5. Hook into cron handler: after price-drift, identify candidate rows (new + price-change > 5%) and enrich top N | Incremental, cost-controlled |
| C6. **Test endpoint** `POST /api/admin/enrich/:id` (admin-secret-gated) for on-demand enrichment; used by tests | Direct path |
| C7. Update `schedule(["*/30 * * * *"])` to call `enrich.sync()` | Scheduled |
| C8. Update `/api/enhanced/deal-analysis/:id` to read from D1 cache first, fall back to heuristic, mark `is_heuristic` correctly | Frontend zero-touch |
| C9. E2E test: enrich one sailing, confirm deal-analysis endpoint returns non-heuristic copy | TDD gate |
| C10. Verify Lighthouse + funnel tests still pass | No regression |

## Verification

Per loop iteration: **build + lint + e2e gate before commit**.

- `BUILD_TARGET=export npm run build` exit 0
- `npx playwright test e2e/funnel.spec.ts --project=chromium` — 4/4 PASS
- `npx playwright test e2e/lighthouse.spec.ts --project=chromium` — Performance ≥ 99, Accessibility ≥ 98
- `curl portly-api.vqh9mnrdbp.workers.dev/api/sync-status` returns `enrichmentRunCount > 0`
- Visual: `browser_navigate` to one enriched sailing, confirm `is_heuristic: false` in network panel

## Commit cadence

After each verified phase boundary:
1. `chore: ai-strategy doc` (Phase A)
2. `feat: seo surface` (Phase B combined)
3. `feat: ai enrichment worker binding + cron hook` (Phase C1-C7)
4. `feat: ai content consumption in /api/enhanced/*` (Phase C8-C10)
5. Final verify commit if needed
