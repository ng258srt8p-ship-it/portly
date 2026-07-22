**Objective:** Implement all 6 phases of the Deal Analysis & Price Forecast refactor to transform generic "score of 50" output into cruise-specific intelligence with hidden cost transparency, per-cabin differentiation, and data-driven recommendations.

**Read first:** plan/deal-analysis-refactor-phase1.md (full plan with all details), then server/services/analyticsOptimized.ts (Phase 1 already done), server/services/enhancedAnalytics.ts (where Phase 2 needs to happen), src/components/sailing/EnhancedDealAnalysis.tsx (frontend integration), src/types/enhancedAnalytics.ts (types to match).

**Constraints:** Do NOT change the public API response shape for /api/analytics/* (legacy endpoints). Do NOT add new dependencies. Do NOT refactor unrelated code. Keep the dual API architecture (/api/analytics/* and /api/enhanced/*) — don't merge them. Match existing frontend types in src/types/enhancedAnalytics.ts exactly. Do not delete, skip, weaken, or narrow existing tests to make the goal pass. Do not refactor unrelated code. Do not add dependencies.

**Validate:** `cd server && npx tsc --noEmit --skipLibCheck` must return zero errors. Then `npm test` (Playwright) must pass. Run both after every change.

**Document:** Write concise, targeted documentation for all changes — update plan/deal-analysis-refactor-phase1.md with completed items and create any new .md files needed.

**Checkpoints:** Work through phases 1→6 in order. Log progress briefly after each phase (what was changed, any issues). Save state before each phase transition.

**Stop when:** All 6 phases are complete AND `cd server && npx tsc --noEmit --skipLibCheck` returns zero errors AND `npm test` passes with all tests green, OR when further changes require architecture decisions beyond the plan's scope.

**Critical requirements:**
1. Phase 1: Fix `estimatedWifi` → `wifiCost` rename in analyticsOptimized.ts (immediate blocker)
2. Phase 2: Wire new 6-factor heuristic from analyticsOptimized.ts into enhancedAnalytics.ts (replaces flat 50 fallback)
3. Phase 3: Import and render HiddenCostDisplay, CabinValueComparison, LiveRateAlert, CabinUpgradeTracker in EnhancedDealAnalysis.tsx — add data-testid to all new components
4. Phase 4: Add rateLock calculation to enhancedAnalytics.ts (populated in /api/enhanced/price-forecast response)
5. Phase 5: Add trendContext calculation (4/12/24 week windows) to enhancedAnalytics.ts
6. Phase 6: Create e2e/enhanced-api.spec.ts with tests for all new fields and components

**Do not stop the goal loop until everything has been checked and verified via Playwright tests.** If a test fails, fix it. If TypeScript errors remain, fix them. Keep iterating until both validation commands pass.
