# Goal Loop: UI/UX Audit Remediation — Verification

**Date:** 2026-07-21  
**Status:** 🟡 In Progress  
**Severity:** Critical (production-facing user experience)

---

## Goal Loop Contract

```
Objective: Verify that all four UI/UX audit remediation phases (2, 3, 4, 6) have been correctly
implemented by running the existing Playwright E2E tests against a production build of TripTide.
Ensure every phase's verification gate passes end-to-end, identify any remaining gaps, and fix them.

Components verified:
  - SailingHero (Phase 6 — WCAG AA contrast)
  - SailingInfoPanel (Phase 2 — empty state text like "N/A", "Unknown")
  - EnhancedDealAnalysis (Phase 3 — white backgrounds, single CTA)
  - PriceComparisonTable (Phase 4 — row alignment, mobile breakdown label)

Constraints: No new dependencies. Keep TypeScript strict / Prettier formatting.
All color changes must meet WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text).
Do not refactor unrelated code. Do not add dependencies.

Validate with Playwright E2E:
  npm run build
  npx playwright test e2e/phase6-accessibility.spec.ts --reporter=html
  npx playwright test e2e/uiux-remediation.spec.ts --reporter=html

Stop when: All Playwright E2E tests pass (zero failures), OR when
failed tests point to code-level gaps that require manual fixes.
```

---

## Phase Verification Checklists

### Phase 6: WCAG AA Contrast Audit
- [ ] Hero price label has improved contrast (`text-ink-faint/80`)
- [ ] Empty state values show muted text colors (`text-ink-faint/60`)
- [ ] Deal analysis cards use white backgrounds (no `bg-amber-50`, `bg-emerald-50`, etc.)
- [ ] Price table rows use consistent padding (`py-3`, `items-center`)
- [ ] Total column shows "Includes base fare + taxes/fees + gratuities" label
- [ ] Only one Book This Cruise CTA exists (no "Book Now" or "View All" duplicates)

### Phase 2: Empty State Handling (SailingInfoPanel.tsx)
- [ ] `totalCabins` falls back to "N/A" (not "-")
- [ ] `cabinCategories?.join(',')` falls back to "Unknown" (not "-")
- [ ] `syncStatus` falls back to "Unsynched" (not "-")
- [ ] `itinerary` renders "0 ports" (not "-")
- [ ] Empty state values use `text-ink-faint/60` styling

### Phase 3: Deal Analysis Cleanup (EnhancedDealAnalysis.tsx)
- [ ] Cards use white backgrounds (`bg-white`)
- [ ] Pricing deep dive sections use `bg-white`, not colored tints
- [ ] `<div data-testid="deal-cta">` contains only "Book This Cruise" button
- [ ] `cleanText()` parses sections into structured lists, not raw `<p>` blocks

### Phase 4: Price Table Alignment (PriceComparisonTable.tsx)
- [ ] Row classes include `py-3` and `items-center`
- [ ] Buttons use `flex-shrink-0` (no overflow)
- [ ] Mobile expanded view shows total breakdown label
- [ ] Total = base fare + taxes/fees + gratuities

---

## Execution Strategy

1. Build production: `npm run build`
2. Run Phase 6 E2E tests: `npx playwright test e2e/phase6-accessibility.spec.ts --reporter=line`
3. Run UI/UX remediation E2E tests: `npx playwright test e2e/uiux-remediation.spec.ts --reporter=line`
4. For any failures, inspect the code, identify root cause, fix, re-test.
5. Once all tests pass, document results in this file.

## Documentation
Every fix must be committed with a descriptive message. Run build, lint, and tests after each change to confirm nothing else broke.
