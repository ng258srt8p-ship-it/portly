# Goal Loop Plan: Deal Analysis Content Quality — Capitalization, No Em Dashes, Human Tone

**Status:** ✅ COMPLETE

**Objective:** Implement a server-side content quality gate that ensures every Deal Analysis output has proper capitalization, zero em dashes, and reads like natural human writing — enforced before storage AND reflected in the AI system prompts.

**Read first:** `server/services/enhancedAnalytics.ts`, `server/services/analytics.ts`, `server/utils/formatter.ts`, `src/components/sailing/EnhancedDealAnalysis.tsx`

**Constraints:**
- Do not change the public API contract (JSON schema for deal analysis endpoints)
- Do not alter component rendering logic beyond what the formatter requires
- Do not add new npm dependencies
- Heuristic output must also pass the quality gate
- Existing tests must continue to pass

**Validate:** `npx tsc --noEmit && cd server && npx tsc --noEmit --skipLibCheck` after each change

**Document:** Write concise, targeted documentation for all changes — create new `.md` files or update existing docs as needed.

**Checkpoints:** work in checkpoints and log progress briefly

**Stop when:** All acceptance criteria below are met AND tests pass, OR when further changes require product/input from the human.

---

## What Needs to Happen

### 1. Create Content Quality Formatter

**File:** `server/utils/contentFormatter.ts` (new)

A content sanitizer that runs on all Deal Analysis text fields after AI/heuristic generation but before database storage.

**Function: `sanitizeDealContent(text: string): string`**

Applies these transformations:
- **Em dash removal:** Replace `—` (U+2014) and `–` (U+2013) with `,` or `:` depending on context. If em dash connects two complete thoughts, replace with `.`. If it sets off an aside, replace with `,`.
- **En dash removal:** Same treatment as em dash.
- **Capitalization enforcement:** Every sentence must start with a capital letter. Title case for section headers within the text. Proper nouns (cruise line names, ship names, port names, destination names) must be correctly capitalized.
- **Human tone pass:** Detect and rewrite common robotic patterns:
  - "Score of X/100 based on weighted factors:" → lead with the score naturally: "This sailing scores X out of 100 because..."
  - "Standard cruise line — typical market dynamics" → something natural like "Typical market dynamics for this cruise line"
  - "Monitor for sales" → "Keep an eye out for the next sale"
  - "Book early to secure" → "Lock in your booking while cabins are still available"
  - "Excellent deal — book now before inventory disappears" → natural verdict phrasing
  - Any text that reads like a template fill-in-the-blank should be rewritten as a complete, conversational sentence

### 2. Apply Formatter at Storage Points

**Files to modify:**
- `server/services/enhancedAnalytics.ts` — wrap `generateEnhancedDealAnalysis()` output with `sanitizeDealContent()` before DB write, AND wrap `generateHeuristicEnhancedDeal()` output before DB write
- `server/services/analytics.ts` — wrap `analyzeSailingDeal()` and `generatePriceForecast()` output before DB write
- `server/services/analyticsOptimized.ts` — same treatment
- `server/services/hybridEngineOptimized.ts` — same treatment in Phase 3
- Any other path that writes to `sailings.deal_analysis` or `sailings.price_forecast`

### 3. Tighten AI System Prompts

**Files to modify:**
- `server/services/enhancedAnalytics.ts` — `ENHANCED_DEAL_SYSTEM_PROMPT`
- `server/services/analytics.ts` — system prompt in `analyzeSailingDeal()`
- `server/services/analytics.ts` — system prompt in `generatePriceForecast()`

**Add explicit formatting rules to each system prompt:**
- "Do NOT use em dashes (— or –). Use commas, colons, or periods instead."
- "Every sentence must begin with a capital letter."
- "Write in a conversational, human tone. Sound like a real person who books cruises for a living. Avoid generic phrases like 'monitor for sales' or 'book early.' Be specific and opinionated."
- "Use proper capitalization for all cruise line names, ship names, port names, and destination names."

### 4. Improve Heuristic Template Language

**File:** `server/services/enhancedAnalytics.ts` — `generateHeuristicEnhancedDeal()`

Rewrite all hardcoded string templates to:
- Never contain em dashes
- Always start sentences with capitals
- Sound conversational rather than template-filled
- Example change: `"Standard cruise line — typical market dynamics"` → `"This cruise line follows standard market pricing patterns"`

### 5. Add Tests

**File:** `server/__tests__/contentFormatter.test.ts` (new)

Test the content formatter covers edge cases:
- Text with em dashes → all removed
- Text with en dashes → all removed
- Lowercase sentence starts → capitalized
- Generic phrases → rewritten
- Proper nouns preserved correctly
- No regression: valid text passes through unchanged

---

## Definition of Done

The goal is **COMPLETE** when ALL of the following are true:

### Automated Checks
- [x] `npx tsc --noEmit` returns 0 errors
- [x] `cd server && npx tsc --noEmit --skipLibCheck` returns 0 errors
- [x] `server/__tests__/contentFormatter.test.ts` all pass (28/28)
- [x] All existing tests still pass

### Content Quality Gate
- [x] `server/utils/contentFormatter.ts` exists with `sanitizeDealContent()` function
- [x] Every call path that writes to `deal_analysis` or `price_forecast` in the database runs content through `sanitizeDealContent()`
- [x] The formatter removes all em dashes (U+2014) and en dashes (U+2013)
- [x] The formatter capitalizes the first letter of every sentence
- [x] The formatter rewrites robotic patterns into natural language:
  - "Score of X/100 based on weighted factors:" → "This sailing scores..."
  - "Standard cruise line — typical market dynamics" → rewritten
  - "Monitor for sales" → "Keep an eye out for the next sale"
  - "Book early to secure" → "Lock in your booking while cabins are still available"
  - All em/en dashes eliminated or replaced

### System Prompt Updates
- [x] `ENHANCED_DEAL_SYSTEM_PROMPT` in `enhancedAnalytics.ts` includes explicit rules against em dashes, mandates capitalization, and requires human-like conversational tone
- [x] System prompt in `analytics.ts` `analyzeSailingDeal()` includes same rules
- [x] System prompt in `analytics.ts` `generatePriceForecast()` includes same rules

### Heuristic Templates
- [x] `generateHeuristicEnhancedDeal()` hardcoded strings cleaned of em dashes
- [x] All heuristic template text uses proper capitalization
- [x] Heuristic insider tips read conversationally

### Integration Verification
- [x] Playwright e2e tests verify no em dashes in rendered content (40/40 pass across 5 browsers)
- [x] Playwright e2e tests verify no robotic patterns in rendered content
- [x] Playwright e2e tests verify proper capitalization in rendered content
- [x] API returns sanitized data for both deal analysis and price forecast
- [x] Sanitization applied at both write time (DB storage) and read time (API response)
