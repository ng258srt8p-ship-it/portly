**Objective:** Refactor Deal Analysis and Price Forecast for every cruise so each sailing shows rich, cruise-specific insider intelligence (multi-factor justified scores, per-cabin forecasts with confidence, hidden cost breakdowns, competing sailing comparisons, itinerary cost-per-port) instead of generic score-of-50 with no explanation, leveraging AI prompts and deterministic heuristic fallbacks.

**Read first:** `GOAL_DEAL_ANALYSIS_PRICE_FORECAST_REFACTOR.md` (6-phase plan), `server/services/analyticsOptimized.ts`, `server/services/enhancedAnalytics.ts`, `server/services/analyticsGenerators.ts`, `src/components/sailing/EnhancedDealAnalysis.tsx`, `src/components/sailing/EnhancedPriceForecast.tsx`, `src/types/enhancedAnalytics.ts`, `src/components/sailing/PriceTrajectoryChart.tsx`, `frontend/components/PriceComparisonTable.tsx`.

**Constraints:** No changes to public API contracts for existing endpoints; no new npm dependencies without explicit approval; follow existing TypeScript strict + Tailwind CSS code patterns; keep sync engine running on existing 4-hour cron schedule; all AI calls use OpenCode; do not delete, skip, weaken, or narrow tests to make gates pass; never make score-of-50 acceptable without justification.

**Validate:** `npx tsc --noEmit` after each phase (client) AND `cd server && npx tsc --noEmit --skipLibCheck` after each phase (server). Run Playwright tests (`npx playwright test e2e/deal-analysis-insider.spec.ts e2e/price-forecast-insider.spec.ts e2e/table-responsive.spec.ts --project=chromium`) after each phase. Stop when all phase gates pass (see Stop Condition).

**Document:** Write concise, targeted documentation for all changes — update `GOAL_DEAL_ANALYSIS_PRICE_FORECAST_REFACTOR.md` with execution results per phase including gates verified and any deviations, and add a final GOAL_INSIDER_INTELLIGENCE.md summary.

**Checkpoints:** Work in 6 phases matching the plan (Phase 1-6). Log progress briefly after each phase: what files changed, what was built, any errors encountered and how they were resolved. After each phase, summarize gates status.

**Stop when:** All 6 phase gates verified passing (Playwright tests pass, TypeScript compiles clean for client and server), OR when a phase requires human/product input (new dependencies, architecture decisions, prompt tuning that AI cannot fix).
