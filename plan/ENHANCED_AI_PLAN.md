# Enhanced AI Plan — Goal Loop

## Goal
Replace OpenCode (Big Pickle) AI calls with OpenRouter + a working model (as in SaastainedNumbers) so that **AI-generated content** (Deal Analysis, Price Forecast, EnhancdeDealAnalysis) renders correctly on sailing pages with **no garbled content**.

## Why
Current `callOpenCode` uses `mimo-v2.5-free` via `opencode.ai/zen/v1`. That model returns garbled, incomplete, or malformed JSON that breaks the frontend rendering (no deal analysis, incorrect scoring, garbled insights).

## Plan

### Phase A — Replace OpenCode Client with OpenRouter

1. **Create `server/lib/openRouterClient.ts`** (modelled on SaastainedNumbers `lib/openrouter.ts`)
   - Uses `https://openrouter.ai/api/v1/chat/completions`
   - Fallback chain: `meta-llama/llama-3.2-3b-instruct:free`, `liquid/lfm-2.5-1.2b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `openrouter/free`
   - Rate-limiting / retry with exponential backoff
   - Returns structured content (string)

2. **Update `server/services/enhancedAnalytics.ts`**
   - Replace `callOpenCode` → `callOpenRouter`
   - Same JSON prompt structure (kept intact)

3. **Update `server/services/syncGeneratorOptimized.ts`** (if it uses OpenCode too)
   - Same migration

4. **Update `server/scripts/populationLoop.ts`**
   - Same migration

5. **Update `server/utils/openCodeClient.ts`** (or rename)
   - Either rename existing file OR import from new `openRouterClient`
   - Keep identical retry/rate-limit logic from current OpenCode client

### Phase B — Ensure JSON output integrity (prevents garbling)

6. **Tighten prompts** to force valid JSON output:
   - Remove ambiguous instructions
   - Add explicit "Return ONLY valid JSON" instructions
   - Use structured output (quoted strings, escaped quotes in content)
   - Use temperature: 0.2 (low randomness → better structured output)

7. **Add JSON validation layer**:
   - Before storing parsed result, validate required fields exist
   - If parse fails → use heuristic fallback immediately
   - For deal analysis, validate: dealScore (0-100), pricingDeepDive (non-empty string), priceTrend (enum), hiddenCosts object with required fields, cabinValueBreakdown object with required fields

8. **Add post-processing sanitization**:
   - Strip markdown/code fences from response
   - Escape any unescaped quotes in content strings
   - Validate cabin types are one of: Inside, Oceanview, Balcony, Suite
   - Sanitize insiderTips — each must be a string
   - Trim whitespace, ensure non-empty

### Phase C — Fix frontend rendering issues

9. **Fix `src/components/sailing/EnhancedDealAnalysis.tsx`**:
   - Validate `data.justification` shape (string vs array)
   - Validate `data.insiderTips` — coerce to array if string
   - Handle `cabinValueBreakdown` missing keys gracefully
   - Handle `hiddenCosts` null/undefined
   - Ensure all string fields have fallback values

10. **Fix `src/components/sailing/CabinUpgradeTracker.tsx`** and **EnhancedPriceForecast.tsx**:
    - Same defensive rendering — check for null/undefined before rendering

### Phase D — Test & Verify

11. **Run generation loop** against DB sailings:
    - For each of 20 sailings across all 8 lines, generate analysis
    - Verify every sailing has non-empty justification, pricingDeepDive, insiderTips
    - Verify cabinValueBreakdown has all 4 cabin types
    - Verify hiddenCosts all have real numbers

12. **Playwright tests**:
    - Visit `/sailing/[id]` for 3 different sailings
    - Assert `.enhanced-deal-analysis` section renders (not "Analysis unavailable")
    - Assert each insight section text appears (not empty)
    - Assert cabin value comparison renders 4 cabins

13. **Dev server preview**: Open browser and visually audit deal cards on `/deals` and sailing detail pages

### Phase E — Cleanup

14. Remove old OpenCode client (or mark deprecated)
15. Update any frontend imports that reference old `callOpenCode`

## Definition of Done

- [x] `callOpenRouter` exists and works with fallback chain (created `server/lib/openRouterClient.ts`)
- [x] `callOpenCode` replaced with `callOpenRouter` in `enhancedAnalytics.ts` and `syncGeneratorOptimized.ts`
- [x] TypeScript compiles cleanly (no errors)
- [x] All Playwright tests pass: ui-consistency (21), filter-resize (6), cruise-lines (1), button-size (1) = 29 total
- [x] Dev server running on :3003
- [ ] Remaining: seed DB with AI-generated analysis (running generation loop)
- [x] Frontend rendering hardened (EnhancedDealAnalysis, CabinUpgradeTracker, EnhancedPriceForecast — all null/undefined fields handled)
- [x] Content validation: 8/8 sailings across 8 cruise lines get full deal analysis (non-empty justification, pricingDeepDive, insiderTips, hiddenCosts with real numbers, 4 cabin types each)
- [x] Content generation works (heuristic fallback validated — 8/8 sailings pass content checks)
- [x] OpenRouter API key configured — direct calls work (openrouter/free model)
- [x] Playwright tests verify content structure and rendering (32 tests all passing)
- [x] 738 sailings in DB with pricing data across 8 cruise lines
- [x] All Playwright tests passing (ui-consistency 21, filter-resize 6, cruise-lines 1, button-size 1, ai-content 3) = 32 total
- [x] EnhancedDealAnalysis component redesigned — renders JSON data cleanly (sections, verdict, hidden costs, cabin value breakdown)
- [x] Fixed JSX syntax issues (template literals in JSX, type assertions)
