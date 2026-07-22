---
max_iterations: 40
timeout: 600
inter_iteration_delay: 2
items_per_iteration: 3
reflect_every: 5
stop_on_error: false
completion_promise: UIUX_REMEDIATION_COMPLETE
completion_gate: required
required_outputs:
  - GOAL_UIUX_GOALLOOP.md
  - RALPH_PROGRESS.md
guardrails:
  block_commands:
    - 'git\s+push'
    - 'npm\s+publish'
  protected_files:
    - 'policy:secret-bearing-paths'
---

You are an autonomous coding agent running in a UI/UX remediation loop.
Each iteration starts with a fresh context. Your progress lives in the code and git history.

## Context

Read `GOAL_UIUX_GOALLOOP.md` first — it contains the full verified audit with every issue confirmed against actual source files. This plan was built by reading every referenced component, page, and server file in the codebase. No assumptions were made.

**Verified broken items requiring fixes:**
- 1.1: `src/app/history/page.tsx` LineCard uses `<a>` instead of `<Link>`
- 1.2 + 2.4: `src/app/fare-disclosure/page.tsx` is a redirect stub (delete it)
- 1.3: `server/services/analyticsOptimized.ts` has no null guard on `dates[i]` (lines 435, 543)
- 1.4: `src/components/search/SearchHero.tsx` stats API has no error/retry UI
- 2.1: "Triptide" appears 11 times in comments (tailwind.config.ts, globals.css)
- 2.2: Inconsistent logo icons (inline SVG wave vs `directions_boat_filled`)
- 2.3: Header hamburger button missing `aria-expanded`
- 3.1a: SearchHero Dropdown buttons have no `aria-label`
- 3.1b: No skip-to-content link anywhere in the app
- 3.1c: MaterialIcon forces `aria-hidden="true"` on all icons (no functional alternative)
- 3.2a: DealsGrid uses localStorage limit, not URL-based pagination
- 3.2b: Solo page renders ALL results with no pagination
- 3.4a: No `loading="lazy"` or `fetchpriority` anywhere
- 3.4b: Public images are all JPG, no WebP conversion
- 4.2: next.config.mjs lacks image optimization settings
- 4.4: No sitemap.xml generation

**Already fixed (skip these):**
- 1.5: Back to Deals button exists on History page ✅
- 3.3: Clear All Filters button works in FilterBar ✅

## Evidence

Run these commands each iteration to see current state:

```bash
# Check for remaining "Triptide" references
grep -rn "Triptide" src/ tailwind.config.ts --include="*.tsx" --include="*.ts" --include="*.css" --exclude-dir=node_modules

# Check for missing accessibility attributes
grep -c 'aria-label\|aria-expanded\|aria-pressed' src/components/FilterBar.tsx

# Check for lazy loading
grep -c 'loading="lazy"\|fetchpriority' src/ frontend/ --include="*.tsx" --include="*.ts"

# Verify no fare-disclosure redirect
cat src/app/fare-disclosure/page.tsx 2>/dev/null || echo "File does not exist (good)"

# Check LineCard uses Link
grep -A2 "href.*cruiseLine" src/app/history/page.tsx | head -5

# Count e2e tests
grep -c "test(" e2e/*.spec.ts e2e/*.test.ts 2>/dev/null

# Check TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
```

## Task Per Iteration

Work through issues in priority order. Complete one or two related fixes per iteration, then run verification.

### Iteration 1: Critical Navigation (1.1 + 1.2/2.4)
- Replace `<a href>` with `<Link>` in `LineCard` (history/page.tsx)
- Delete `src/app/fare-disclosure/page.tsx`
- Verify no imports reference the deleted file

### Iteration 2: API Resilience (1.3 + 1.4)
- Add null guard for `dates[i]` in analyticsOptimized.ts (both locations ~line 435 and ~line 543)
- Add error boundary + retry button to SearchHero stats fetcher

### Iteration 3: Branding & Navigation (2.1 + 2.2 + 2.3)
- Replace "Triptide" → "TripTide" in tailwind.config.ts comments (8 refs)
- Replace "Triptide" → "TripTide" in globals.css comments (3 refs)
- Standardize logo icon across all pages (recommend: keep inline SVG wave in Header/Footer, use consistent `directions_boat_filled` or inline SVG in all standalone pages)
- Add `aria-expanded={menuOpen}` to hamburger button in Header.tsx

### Iteration 4: Accessibility Core (3.1a + 3.1b + 3.1c)
- Add `aria-label` to SearchHero Dropdown buttons (Destination, Cruise Line)
- Add skip-to-content link in `src/app/layout.tsx` (visible on focus, hidden visually otherwise)
- Add optional `ariaLabel` prop to MaterialIcon component; update FilterBar to pass labels for functional icons

### Iteration 5: Pagination (3.2a + 3.2b)
- Move DealsGrid limit from localStorage to URL params (`?limit=20`)
- Add "Load More" button or page-based pagination to Solo page

### Iteration 6: Image Optimization (3.4a + 3.4b + 4.2)
- Add `loading="lazy"` to all `<img>` tags across all pages
- Convert public/images/*.jpg to WebP (keep originals as fallback)
- Add `width`/`height` attributes to prevent layout shift
- Update next.config.mjs with `deviceSizes` and `imageSizes`

### Iteration 7: SEO (4.4)
- Create `src/app/sitemap.ts` with Next.js dynamic sitemap
- Include all valid routes: /, /deals, /history, /solo, /alerts, /about, /press, /careers, /contact, /privacy, /terms, /disclosure, /sailing/[id]

### Iteration 8: Final Regression
- Run full Playwright test suite
- Verify TypeScript compilation (zero errors)
- Confirm all required_outputs present
- Update RALPH_PROGRESS.md with final status

## Rules

- **One or two related fixes per iteration** — do not rush
- **Run TypeScript check** (`npx tsc --noEmit`) after each iteration — must pass with zero errors
- **Run relevant Playwright tests** after each iteration (`npx playwright test`)
- **No breaking changes to API contracts** — server endpoints must return same shape
- **Preserve 2-column filter grid layout** — don't change FilterBar structure
- **Maintain design tokens** — don't rename CSS custom properties
- **Do not delete, skip, weaken, or narrow tests** to make the loop pass
- **Do not add dependencies** unless absolutely necessary for a fix
- **Commit after each iteration** with descriptive messages (e.g., `fix: use Link in LineCard for client-side nav`)
- **Update RALPH_PROGRESS.md** at the end of every iteration with what was done and verification results
- **If a fix breaks existing tests**, fix the tests first before continuing to new work

## Completion

Stop with `UIUX_REMEDIATION_COMPLETE` only when ALL of these are true:

1. **All verified critical fixes (1.1, 1.2, 1.3, 1.4) are implemented and tested**
2. **All branding/navigation fixes (2.1, 2.2, 2.3, 2.4) are applied** — zero "Triptide" strings in source
3. **All accessibility fixes (3.1a, 3.1b, 3.1c) are in place** — skip-to-content link works, dropdowns have aria-labels
4. **All performance fixes (3.2a, 3.2b, 3.4a, 3.4b) are implemented** — lazy loading on images, pagination on deals/solo
5. **SEO (4.4) is complete** — sitemap.xml generates all routes
6. **Zero TypeScript compilation errors** (`npx tsc --noEmit` passes)
7. **All existing Playwright tests still pass** (no regressions)
8. **`RALPH_PROGRESS.md` exists** with final iteration summary

Before declaring complete, run this final verification:
```bash
npx tsc --noEmit && echo "TypeScript OK"
npx playwright test --reporter=dot 2>&1 | tail -3
grep -rn "Triptide" src/ tailwind.config.ts --include="*.tsx" --include="*.ts" --include="*.css" --exclude-dir=node_modules || echo "No Triptide refs (clean)"
curl -s http://localhost:3000/sitemap.xml 2>/dev/null | grep -c "<url>" || echo "No local server — check sitemap.ts exists"
cat src/app/fare-disclosure/page.tsx 2>/dev/null && echo "FAIL: redirect file still exists" || echo "OK: redirect file removed"
grep -c 'loading="lazy"' src/ frontend/ --include="*.tsx" --include="*.ts" || echo "No lazy loading found"
```
