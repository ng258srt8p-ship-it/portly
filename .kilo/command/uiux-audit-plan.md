# GOAL LOOP: Playwright UX/UI Diagnostic Suite

## Objective
Write and execute an automated Playwright diagnostic test suite against portly-1i0.pages.dev/deals and linked sailing detail pages. Detect visual bugs, text wrapping, overlapping elements, z-index clipping, and filter state bugs using Playwright DOM assertion APIs.

## Target Domain
portly-1i0.pages.dev

## Plan Steps (awaiting user review before code edits)

### STEP 1: Create Playwright Diagnostic Script
File: `e2e/uiux-audit.spec.ts`

Checks to implement:
1. Sticky Header & Element Overlap Audit — measure fixed header rects vs hero/filter coordinates; scroll 500px and check secondary sticky bars.
2. Cascading Filter & State Persistence Audit — select Cruise Line, verify Ship dropdown options reset/change, verify URL params (`?line=...&ship=...`).
3. Grid Card Visual Geometry & Text Truncation — compare scrollWidth > clientWidth / scrollHeight > clientHeight; verify card alignment and consistent padding.
4. Individual Sailing Detail Page (`/sailing/[id]`) — click first deal card, check hero/header overlap (`heroTitle.top < header.bottom`), scroll through `#price-history`, `#itinerary`, `#cabins`, `#ship-info`, measure vertical gaps (`> 80px` = warning).
5. Mobile Breakpoint (375x812) — verify filter bar responsive conversion (trigger button/drawer, not overflowing block); verify mobile sticky booking bar doesn't block last card or pagination footer (padding-bottom check).

### STEP 2: Execute Audit & Collect Report
- `BASE_URL=portly-1i0.pages.dev npx playwright test e2e/uiux-audit.spec.ts --reporter=line`
- Inspect `test-results/` for failure screenshots and console logs.

### STEP 3: Refactor & Verify
- Fix detected UI/UX issues in Next.js/React components and Tailwind CSS.
- Re-run Playwright diagnostic until 100% pass.
- Commit: `git commit -m "fix(uiux): resolve playwright visual audit issues on deals and sailing pages"`

## Status
PENDING — awaiting user review of this plan. NO code edits until approved.
