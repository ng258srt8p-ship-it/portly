# Plan: Get All Playwright Tests Passing

**Created:** 2026-07-13  
**Status:** 160/250 tests passing (64%) - Target: 100%

---

## 📊 Current State Summary

| Browser | Passed | Failed | Total |
|---------|--------|--------|-------|
| Chromium | 32 | 18 | 50 |
| Firefox | 32 | 18 | 50 |
| WebKit | 32 | 18 | 50 |
| Mobile Chrome | 32 | 18 | 50 |
| Mobile Safari | 32 | 18 | 50 |
| **Total** | **160** | **90** | **250** |

**Core Passing:** Backend API (10/10), Edge Cases (4/4), Visual Regression (3/3 skipped)

---

## 🎯 Phase 1: Fix Homepage Tests (5 tests) - HIGH PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `loads homepage with hero and CTA` | `h1` text mismatch | Update regex to match actual: "Track the Absolute Out-the-Door Cost" |
| `homepage has search filters` | "Passenger" label is text not button | Already fixed - use `locator('text=/Passenger/i').first()` |
| `homepage has price comparison table` | Headers are "CABIN TYPE", "BASE FARE", "TAXES & FEES", "GRATUITIES", "TOTAL" | Update regex to match exact uppercase headers |
| `homepage CTA navigates to /deals` | CTA is `<a>` not button | Already works - just ensure click works |

**Action:** Update `e2e/app.spec.ts` homepage test selectors

---

## 🎯 Phase 2: Fix Deals Page Tests (11 tests) - HIGH PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `loads deals page with hero and deal grid` | No `[data-testid="deal-card"]` on elements | Add `data-testid="deal-card"` to deal card components |
| `shows filters on deals page` | Filter labels: "Cruise Line", "Region", "Destination", "Duration", "Type" - verify exact text | Use `getByRole('button', { name: /Cruise Line/i })` pattern |
| `filters by cruise line` | Click filter → select option | Ensure dropdown opens and option is clickable |
| `filters by region` | Same as cruise line | Same fix |
| `price range filter works` | Input type range/number | Use correct selector |
| `pagination works` | Check if pagination exists or is infinite scroll | Adapt test to actual UI |
| `Clear All Filters works` | Button text may be "Clear" or "Reset" | Use flexible selector |
| `Refresh Live Fares button` | Button text may differ | Use flexible selector |

**Action:** 
1. Add `data-testid` attributes to deal cards and filter components
2. Update test selectors to match actual rendered text

---

## 🎯 Phase 3: Fix Sailing Detail Tests (7 tests) - HIGH PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `loads sailing detail with cabin breakdown` | `getCabinBreakdown()` returns empty | Ensure cabin breakdown renders and has test selectors |
| `displays price comparison table` | Cabin type headers: "Inside", "Oceanview", "Balcony", "Suite" | Use exact text match |
| `shows deal analysis (cached)` | Analysis may not exist for test sailing | Skip if not present, or ensure test data has analysis |
| `booking URL present` | Link/button selectors | Use `a[href*="vacationstogo"]` |
| `price history chart visible` | Canvas/SVG elements | Check for chart container |
| `cabin tabs work` | Tab role/aria-selected | Use proper ARIA selectors |

**Action:** Add `data-testid` to cabin breakdown table, deal analysis section, booking button

---

## 🎯 Phase 4: Fix Navigation/Layout Tests (4 tests) - MEDIUM PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `has navigation header` | Header elements | Use `header` or `nav` role |
| `responsive layout` | Viewport changes | Already works - verify |
| `header Explore Deals link` | Button not link | Use `getByRole('button', { name: /Explore Deals/i })` |
| `footer links work` | 7 footer links | Already correct - verify each exists |

---

## 🎯 Phase 5: Fix History Maps Tests (4 tests) - MEDIUM PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `loads history page with line cards` | Line cards may be empty if no data | Seed test data or check for empty state |
| `cruise line cards link to deals` | Card click navigation | Ensure `<a>` wrapper has correct href |
| `shows sparkline charts` | Canvas elements | Check for `canvas` or `svg` |
| `has Back to Deals link` | Link in header | Add link if missing |

**Action:** Ensure history page has test data or handles empty state gracefully

---

## 🎯 Phase 6: Fix Solo Hub Tests (3 tests) - MEDIUM PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `loads solo hub with tabs` | Tab buttons: "All", "Waived", "Low Supplement" | Use `getByRole('tab', { name: ... })` |
| `tab switching works` | ARIA selected state | Verify `aria-selected` toggles |
| `displays solo supplement data` | Content visibility | Check for supplement text |

---

## 🎯 Phase 7: Fix Price Alerts Tests (3 tests) - MEDIUM PRIORITY

| Test | Issue | Fix |
|------|-------|-----|
| `loads alerts page with form` | Email input + submit button | Add `data-testid="alert-email-input"` and `data-testid="alert-submit"` |
| `form validation works` | Submit empty → error | Check for error message |
| `can enter email and sailing ID` | Two inputs | Add `data-testid="alert-sailing-input"` |

---

## 🎯 Phase 8: Cross-Browser Fixes (Firefox, WebKit, Mobile) - LOW PRIORITY

Most failures are identical across browsers - fixing Chromium selectors will cascade to others. Mobile-specific issues:

| Issue | Fix |
|-------|-----|
| Touch targets too small | Ensure 44px minimum |
| Viewport meta tag | Verify in layout |
| Hamburger menu | Test mobile nav |

---

## 🔧 Implementation Tasks

### Task 1: Add Test IDs to React Components
```tsx
// Deal card component
<div data-testid="deal-card" ...>

// Filter buttons
<button data-testid="filter-cruise-line" ...>

// Cabin breakdown table
<table data-testid="cabin-breakdown" ...>

// Deal analysis
<div data-testid="deal-analysis" ...>

// Booking button
<a data-testid="booking-link" href={...} ...>

// Price alerts form
<input data-testid="alert-email-input" ...>
<input data-testid="alert-sailing-input" ...>
<button data-testid="alert-submit" ...>
```

### Task 2: Update Test Selectors in `app.spec.ts`
- Replace fragile text selectors with `data-testid` or `getByRole`
- Use exact text matches for headers
- Handle async loading with `waitForLoadState('networkidle')`

### Task 3: Seed Test Data
```bash
# Ensure DB has test sailings with:
# - Deal analysis cached
# - Price forecast cached  
# - Cabin breakdown data
# - Price history snapshots
```

### Task 4: Verify Frontend Build
```bash
cd /Users/georgetozer/Development/Portly
npm run build  # Must pass
npx tsc --noEmit  # Must pass
```

---

## 📅 Timeline

| Week | Focus |
|------|-------|
| **Day 1-2** | Phase 1-2: Homepage + Deals page selectors + test IDs |
| **Day 3-4** | Phase 3-4: Sailing Detail + Navigation selectors |
| **Day 5** | Phase 5-7: History, Solo Hub, Price Alerts |
| **Day 6** | Phase 8: Cross-browser verification + mobile |
| **Day 7** | Full suite run + CI integration |

---

## ✅ Success Criteria

- [ ] All 250 tests pass on Chromium
- [ ] All 250 tests pass on Firefox
- [ ] All 250 tests pass on WebKit
- [ ] All 250 tests pass on Mobile Chrome
- [ ] All 250 tests pass on Mobile Safari
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] CI pipeline configured

---

## 🛠 Commands for Development

```bash
# Run single test file (fastest iteration)
npx playwright test --project=chromium --grep "Homepage"

# Run with UI for debugging
npx playwright test --ui --project=chromium

# Run specific failing test
npx playwright test --project=chromium --grep "loads deals page"

# View failures
npx playwright show-report

# Update test snapshots (visual regression)
npx playwright test --project=chromium --update-snapshots
```

---

## 📝 Notes

1. **Root cause of most failures:** Selectors don't match actual rendered DOM text/structure
2. **Solution:** Add stable `data-testid` attributes to React components
3. **Backend API tests are 100% passing** - confirms sync pipeline works
4. **Frontend syntax error in history/page.tsx** was fixed - verify no regressions
5. **Server runs on port 3004** - update if port changes