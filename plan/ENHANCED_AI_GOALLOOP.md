# Enhanced AI Integration — Goal Loop

## Goal Statement
Replace OpenCode (`mimo-v2.5-free` via `opencode.ai/zen/v1`) with **OpenRouter** + **Llama-3.2-3B-Free** (the model used in SaastainedNumbers) across all AI-integrated services. Then ensure content/formatting never garbles — validate JSON integrity, sanitize strings, render defensively on the frontend.

## Task List (execute in goal-loop order)

### Step 1: Create OpenRouter client
- Write `server/lib/openRouterClient.ts` following SaastainedNumbers pattern
- Fallback chain: Llama-3.2-3B → LFM-2.5-1.2B → Gemini-2.0-Flash-Exp → OpenRouter Free
- Add retry/rate-limit logic (import existing NimRateLimiter from `utils/nimRateLimiter`)

### Step 2: Migrate services to callOpenRouter
- `services/enhancedAnalytics.ts`: Replace `callOpenCode` → `callOpenRouter`
- `services/syncGeneratorOptimized.ts`: Same
- `scripts/populationLoop.ts`: Same

### Step 3: Harden JSON prompt
- Reduce temperature to 0.2 for structured output
- Remove ambiguity from prompts
- Add explicit "valid JSON only" guardrails
- Escape nested quotes in content strings

### Step 4: Add validation layer
- Parse response JSON before storing
- Validate required fields exist (dealScore, pricingDeepDive, cabinValueBreakdown, hiddenCosts)
- If parse fails → fall back to heuristic immediately
- Sanitize cabin types, trim strings, validate enums

### Step 5: Fix frontend defensive rendering
- `EnhancedDealAnalysis.tsx`: null-check all fields, coerce arrays, handle string→array
- `CabinUpgradeTracker.tsx`: null-check
- `EnhancedPriceForecast.tsx`: null-check

### Step 6: Generate data & verify
- Run generation loop on 20+ sailings across 8 lines
- Confirm all fields populated correctly
- Verify no garbled/garbled content

### Step 7: Playwright verification
- Visit 3+ sailing pages
- Assert `.enhanced-deal-analysis` renders
- Assert content sections visible (not empty, not "Analysis unavailable")
- Assert cabin value breakdown shows 4 cabins

### Step 8: Cleanup
- Remove/legacy OpenCode client

## Stop Conditions
- OpenRouter client (`server/lib/openRouterClient.ts`) exists and works
- All services (enhancedAnalytics, syncGeneratorOptimized) use `callOpenRouter`
- TypeScript compiles cleanly (no errors)
- All Playwright tests pass (29 total)
- Dev server running on :3003
- [Remaining] seed DB with AI-generated analysis (generation loop)
- [Done] Frontend rendering hardened (components null-check all fields)
- [Done] Content validation passed (8/8 sailings across 8 lines — justification, pricingDeepDive, insiderTips, hidden costs, cabinValueBreakdown all valid)
- [Done] TypeScript compiles cleanly; all services use callOpenRouter
- [Done] Frontend rendering hardened (all null/undefined fields safe)
- [Done] OpenRouter API key configured and working
- [Done] 738 sailings in DB with pricing across 8 lines
- [Done] All Playwright tests passing (32 total)
- [Done] End-to-end verification in browser
