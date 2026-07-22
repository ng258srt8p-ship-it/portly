---
commands:
  - name: tsc-check
    run: 'npx tsc --noEmit 2>&1'
    timeout: 60
  - name: server-tsc
    run: 'cd server && npx tsc --noEmit --skipLibCheck 2>&1'
    timeout: 60
  - name: git-status
    run: 'git status --short'
    timeout: 10
  - name: git-log
    run: 'git log --oneline -5'
    timeout: 10
  - name: playwright-tests
    run: 'npx playwright test --reporter=line 2>&1'
    timeout: 120
  - name: file-list
    run: 'find src/components/sailing -name "*.tsx" -o -name "*.ts" | sort'
    timeout: 10
max_iterations: 80
inter_iteration_delay: 0
timeout: 300
stop_on_error: false
guardrails:
  block_commands:
    - 'git\\s+push'
    - 'npm\\s+publish'
  protected_files:
    - 'policy:secret-bearing-paths'
---

You are an autonomous coding agent running in a Ralph loop.
Each iteration starts with a fresh context.
Your progress lives in the code and git history.

## Reference Plan

Read `../../GOAL_DEAL_ANALYSIS_PRICE_FORECAST.md` for the full 6-phase plan.
This RALPH.md encodes it as an iterative loop.

## Current State

{{ commands.git-log }}

{{ commands.file-list }}

## Phase Progress Tracker

Write and maintain `PHASE_PROGRESS.md` in this task folder. Update it at the end of every iteration.

Phases:
- [ ] Phase 1: Fix Formatting & Parser Robustness (NimDealAnalysis.tsx, NimPriceForecast.tsx)
- [ ] Phase 2: Build Unique Deal Analysis (6 cruise-specific dimensions)
- [ ] Phase 3: Build Unique Price Forecast (per-cabin forecasts, competing sailings)
- [ ] Phase 4: Format Fix — Unified JSON schemas across all code paths
- [ ] Phase 5: Sync Engine Integration (enhanced Phase 3 of hybridEngine)
- [ ] Phase 6: Playwright Verification Suite (e2e tests)

## Rules

- One phase per iteration block. Complete all tasks in a phase before moving on.
- TypeScript must compile with zero errors after each change (`npx tsc --noEmit`).
- Do not delete, skip, weaken, or narrow tests to make gates pass.
- Every file you create must have proper TypeScript types.
- Follow existing code patterns (Tailwind CSS classes, MaterialIcon component, useLiveData pattern).
- Use OpenCode AI (mimo-v2.5-free) for all AI-generated content.
- Heuristic fallbacks must match the new JSON schemas exactly.
- Do not refactor unrelated code. Do not add dependencies.

## Iteration Instructions

On each iteration:

1. Read `PHASE_PROGRESS.md` to see where you left off.
2. Check `{{ commands.tsc-check }}` and `{{ commands.server-tsc }}` — fix any TS errors before continuing.
3. Work on the NEXT unchecked phase item in PHASE_PROGRESS.md.
4. When a phase is complete, update the checkbox to [x] and commit your changes.
5. Write concise documentation for all changes (new .md files or updates to existing docs).

## Phase Details

### Phase 1: Fix Formatting & Parser Robustness
- Rewrite `src/components/sailing/NimDealAnalysis.tsx` to handle all output formats (JSON objects, markdown, mixed, heuristic fallback with `is_heuristic: true`)
- Rewrite `src/components/sailing/NimPriceForecast.tsx` to render structured forecast data (not just raw markdown)
- Ensure loading skeletons match final rendered component dimensions (no layout shift)
- Error states show actionable messages (not raw API errors)
- Create `e2e/deal-analysis-format.spec.ts` with Playwright tests for: no layout shift, all sections render, heuristic fallback renders, error states are user-friendly

### Phase 2: Build Unique Deal Analysis (Competitive Moat)
- Create `server/services/enhancedAnalytics.ts` with 6 cruise-specific insight generators:
  1. Per-Cruise Inventory Intelligence (cabin availability vs historical benchmarks)
  2. Cruise Line Pricing Strategy Decoder (aggressive discounting, premium positioning, clearance)
  3. Ship-Specific Value Scoring (amenities vs price point)
  4. Itinerary Value Breakdown (cost-per-port, nickel-and-dime detection)
  5. Booking Site Hidden Cost Detector (real total cost calculation)
  6. Sailing-Specific Insider Tips (crew changes, deck noise, seasonal events for THIS ship)
- Create `server/routes/enhancedAnalytics.ts` with endpoints:
  - GET /api/enhanced/deal-analysis/:sailingId
  - POST /api/enhanced/regenerate-deal-analysis/:sailingId
  - GET /api/enhanced/batch-analyze?cruiseLine=X&limit=N
- Create `src/components/sailing/EnhancedDealAnalysis.tsx` to render all 6 dimensions with proper data-testid attributes
- Create `src/types/enhancedAnalytics.ts` with full TypeScript interfaces

### Phase 3: Build Unique Price Forecast (Competitive Moat)
- Create `server/services/enhancedPriceForecast.ts` with:
  1. Per-Cabin-Type Forecast (separate forecasts for Inside/Oceanview/Balcony/Suite)
  2. Confidence Scoring by Time Horizon (confidence intervals, not single numbers)
  3. Optimal Booking Window for THIS Sailing (route, season, ship-specific)
  4. Price Drop Alert Triggers (dynamic thresholds per sailing)
  5. Competing Sailing Comparison (same route, same dates, different ships)
- Create `src/components/sailing/EnhancedPriceForecast.tsx` to render all dimensions
- Create `src/components/sailing/PriceTrajectoryChart.tsx` for interactive chart (SVG-based, no new deps)
- Add endpoints: GET /api/enhanced/price-forecast/:sailingId, POST /api/enhanced/regenerate-forecast/:sailingId, GET /api/enhanced/price-alerts/:sailingId

### Phase 4: Format Fix — Unified JSON Schemas
- Define unified DealAnalysisOutput interface (replaces markdown parsing)
- Define unified PriceForecastOutput interface (replaces markdown parsing)
- Update server routes to return structured JSON (not markdown strings)
- Update frontend components to parse structured JSON (no brittle regex on markdown)
- Ensure heuristic fallback outputs match new schemas exactly
- Verify TypeScript strict mode passes for all new types

### Phase 5: Sync Engine Integration
- Enhance `server/services/hybridEngineOptimized.ts` Phase 3 to call new enhanced functions
- Add cruise-line-specific prompt templates including: inventory data, historical pricing, competing sailings, ship amenities, destination insights
- Batch processing with rate-limit awareness (staggered API calls)
- Cache strategy: 12-hour TTL for enhanced data (vs current 1 hour)
- Admin API: POST /api/enhanced/regenerate-all with rate-limit controls
- Create `server/routes/enhancement.ts` for stats and admin endpoints

### Phase 6: Playwright End-to-End Verification
- Create `e2e/enhanced-deal-analysis.spec.ts` — Verifies deal analysis rendering
- Create `e2e/enhanced-price-forecast.spec.ts` — Verifies price forecast rendering
- Create `e2e/competitive-moat.spec.ts` — Verifies unique features that competitors don't have
- Create `e2e/format-consistency.spec.ts` — Verifies formatting consistency
- Create `e2e/goal-loop-verification.spec.ts` — THE comprehensive verification suite
  - All 6 phase tests
  - Mobile responsive rendering (375×812)
  - "No competitor feature exists in our output" uniqueness check

## Stop Condition

Stop with `DONE` only when:
1. All 6 phases are checked off in PHASE_PROGRESS.md
2. `npx tsc --noEmit` returns 0 errors (client)
3. `cd server && npx tsc --noEmit --skipLibCheck` returns 0 errors (server)
4. All Playwright e2e tests in `e2e/goal-loop-verification.spec.ts` pass
5. Every active sailing has cruise-specific Deal Analysis AND Price Forecast (no generic output)
6. PHASE_PROGRESS.md exists with all 6 phases marked complete
