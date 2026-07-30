**Objective:** Complete Phase 2 (batch regeneration) and Phase 3 (enhanced features) so that all active sailings have unique, high-quality deal analysis and price forecast content generated via **OpenCode Zen key-less AI** — then verify with Playwright tests.

**Read first:**
- `server/services/enhancedAnalytics.ts` (full source — deal analysis + price forecast generation)
- `server/utils/formatter.ts`, `server/utils/contentFormatter.ts` (formatters)
- `scripts/regenerate-deal-analysis.ts` (existing Phase 2 regeneration script)
- `server/utils/openCodeClient.ts` (key-less OpenCode Zen client with auto-rotating model discovery)

**Constraints:**
- No changes to public API contracts (deal card shape, sailing detail response)
- All content must be unique and specific to each cruise — no generic text
- Use OpenCode Zen AI (`callOpenCode` from `server/utils/openCodeClient`) for generation
- Default model: `big-pickle`; auto-rotating fallback chain: `deepseek-v4-flash-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`, `north-mini-code-free`
- Fix format issues: sanitize em dashes, enforce capitalization, eliminate robotic patterns
- All 585 active sailings should produce quality content
- Do not delete, skip, weaken, or narrow tests to make gates pass

**Validate:** `npx tsc --noEmit` (client) && `cd server && npx tsc --noEmit --skipLibCheck` (server) after each phase

**Document:** Write concise, targeted documentation for all changes.

---

### Phase Gates

**Phase 2 — Batch Regeneration (still in progress):**
- [ ] Fix OpenRouter API authentication (resolve "Missing Authentication header" error)
- [ ] Successfully regenerate all 337 remaining degraded sailings (score=50 → proper AI content)
- [ ] Verify via SQL query that 0 sailings remain with dealScore=50 (or near-zero PPD-based heuristic content)
- [ ] Verify via Playwright that all rendered sailings have non-placeholder content

**Phase 3 — Enhanced Features (not started):**
- [ ] Ship-specific value scoring: incorporate ship details (year built, tonnage, rating) into `shipValueScore` calculation with more nuanced factors
- [ ] Itinerary cost-per-port: enrich `itineraryValue` with specific port names and value assessments
- [ ] Seasonal advice: enhance `insiderTips` with departure-month-specific guidance beyond generic "book 60 days out"
- [ ] Destination-specific PPD benchmarks: use `destinationInsight.avgPricePpd` to make scoring more accurate

**Phase 4 — Full Verification (tests written, sweep pending):**
- [ ] Run Playwright test against all 585 active sailings (sample-based verification)
- [ ] Confirm no em dashes in rendered content
- [ ] Confirm proper capitalization throughout
- [ ] Confirm no robotic patterns (Score of X/100, Monitor for sales, Book early to secure)
- [ ] Confirm score ≠ 50 across all sailings (no placeholders)
- [ ] Confirm unique content across sampled pairs of sailings

---

### Progress Log

```
[Phase 1] ✅ — Formatting sanitization complete. formatter.ts updated with sanitizeContent(), prompts improved, contentFormatter expanded. TypeScript compiles clean.

[Phase 2] ⚠️ — Batch regeneration script written and tested with 1 sailing (score=65). OpenRouter auth issue ("Missing Authentication header") blocks full sweep. 337 sailings remain to regenerate.

[Phase 3] ⏳ — Not started. Existing logic covers basic ship value scoring, itinerary cost-per-port, seasonal advice, PPD benchmarks — needs refinement.

[Phase 4] ⚠️ — 55 Playwright tests written and passing (40 quality + 15 Phase 4 verification). Full sweep across all sailings not yet run.
```

---

### Stop when:
All 4 phases verified by their gates above. Specifically:
1. Phase 2 gate: 0 sailings with dealScore=50 remains (all regenerated)
2. Phase 3 gate: ship value scoring uses actual ship details, not defaults; itineryValue references specific ports
3. Phase 4 gate: all Playwright tests pass including full-sailings verification
