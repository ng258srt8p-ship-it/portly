**Objective:** Fix all 3 Critical (P1) UI/UX issues from UIUX_IMPLEMENTATION_PLAN.md: Price Forecast API timeout, AlertsPage form validation, and disclosure circular redirect.

**Read first:**
- `/Users/georgetozer/Development/Portly/UIUX_IMPLEMENTATION_PLAN.md` (Phase 1 section, lines 60-120)
- `server/nimAnalyticsOptimized.ts` (Price Forecast API bug with `dates[i].split`)
- `src/app/alerts/page.tsx` (AlertsPage form validation)
- `src/app/disclosure/page.tsx` (circular redirect issue)

**Constraints:**
- Do not modify unrelated components or pages
- Preserve existing functionality for all other features
- Maintain current design system (Tailwind classes, CSS variables, color tokens)
- Do not add new dependencies without explicit user approval
- Keep all existing tests passing — do not delete, skip, or weaken tests to make the goal pass
- Do not refactor unrelated code or add features beyond the 3 critical fixes

**Validate:** `npx playwright test` after each fix (run full suite, not just specific tests)

**Document:** Write concise, targeted documentation for all changes — update UIUX_IMPLEMENTATION_PLAN.md with completion status and create `PHASE1_COMPLETION_SUMMARY.md` documenting what was fixed, how, and test results.

**Checkpoints:** work in checkpoints and log progress briefly after each issue fix (Issue #3, #14, #15)

**Stop when:** all 3 Phase 1 issues are fixed AND `npx playwright test` passes with 0 failures, OR when further changes require human/product input (e.g., design decisions, new features beyond scope)

---

## Execution Instructions

1. **Read the plan** — Open UIUX_IMPLEMENTATION_PLAN.md Phase 1 section and understand all 3 issues
2. **Fix Issue #3 (Price Forecast API)** — Locate `server/nimAnalyticsOptimized.ts`, fix the `dates[i].split` bug where dates may be null/non-string, add error handling for invalid date formats
3. **Fix Issue #14 (AlertsPage validation)** — Add email validation regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), add sailing URL validation, show error messages for invalid inputs, disable submit button when form is invalid
4. **Fix Issue #15 (Disclosure redirect)** — Ensure `/disclosure` and `/fare-disclosure` both work without circular redirect, add proper meta descriptions
5. **Run tests** — After each fix, run `npx playwright test` to verify nothing breaks
6. **Document** — Update UIUX_IMPLEMENTATION_PLAN.md with completion status, create `PHASE1_COMPLETION_SUMMARY.md`

**Important:** If you encounter code that needs architectural decisions (not just bug fixes), pause and ask before proceeding. Do not refactor unrelated code or add features beyond the 3 critical fixes.
