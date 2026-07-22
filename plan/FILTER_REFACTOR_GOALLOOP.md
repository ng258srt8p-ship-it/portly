# Filter Refactor Goal-Loop Plan

**Project:** Portly / TripTide — Filter Bar Responsive Refactor
**Date:** July 17, 2026
**Status:** Awaiting user verification

**Verification Plan:**
- Run `npx playwright test --headed` to visually audit changes
- Screenshot at 320px, 480px, 768px, 1024px, 1280px
- Confirm no overlapping buttons, no overflow text, no scroll issues
- Dev server on port 3003 for browser preview

---

## Executive Summary

Deep scan of the filter components (`FilterBar.tsx`, `FilterSelectionGrid.tsx`) identified **12 responsive issues** that cause overlapping buttons, overflow, and poor mobile UX at narrow viewport widths. The current mobile layout stacks all filters vertically with insufficient spacing, causing elements to overflow their containers. Buttons overflow text, segmented groups collide, and the mobile expand/collapse toggle is awkward.

**Target:** All filter interactions work cleanly at 320px+ (smallest mobile) up to 1440px+ (desktop).

---

## Issues Identified

### 1. **Mobile expand/collapse toggle is too tall**
**File:** `src/components/FilterBar.tsx` (lines ~772-808)
**Issue:** Toggle button is `px-4 py-3` (large padding) with text+icon+badge. At 320px viewport, this takes ~60px of precious screen real estate.
**Fix:** Reduce padding, use smaller text, make badge smaller.

### 2. **Mobile minimal row (collapsed) has overlapping inputs**
**File:** `src/components/FilterBar.tsx` (lines ~802-810)
**Issue:** Price inputs (`w-20`) + separator (`–`) + ClearFiltersButton all in one row without proper wrapping. At 320px, text overflows.
**Fix:** Stack vertically or use flex-wrap with proper gaps.

### 3. **Mobile expanded row 1: full-width dropdowns cause text overflow**
**File:** `src/components/FilterBar.tsx` (lines ~920-960)
**Issue:** Four `MultiSelectDropdown` components in a vertical stack, each with label + truncated text + MaterialIcon. Text like "Côte d'Ivoire" or "Côte d'Ivoire" overflows the `.truncate` class.
**Fix:** Use shorter labels, add line breaks, or truncate more aggressively.

### 4. **Mobile expanded row 2: Nights segmented group overflows**
**File:** `src/components/FilterBar.tsx` (lines ~969-1000)
**Issue:** Three pill buttons ("0–3 nights", "4–7 nights", "8+ nights") in `flex-wrap`. At 320px, text wraps awkwardly or buttons overflow.
**Fix:** Make text shorter ("0–3", "4–7", "8+") without "nights" suffix.

### 5. **Mobile expanded row 2: Type pills overflow**
**File:** `src/components/FilterBar.tsx` (lines ~980-1010)
**Issue:** Three pills ("Drop Deals", "Solo Friendly", "Great Value") in flex-wrap. At narrow widths, text wraps or overflows.
**Fix:** Shorter labels ("Drop", "Solo", "Value").

### 6. **Mobile expanded row 2: Sort dropdown overflows**
**File:** `src/components/FilterBar.tsx` (lines ~1010-1040)
**Issue:** SingleSelectDropdown with label "Sort" + long option text ("Biggest Drop", "Date ↑"). At 320px, option text wraps.
**Fix:** Shorter option labels.

### 7. **Mobile doesn't show all filter groups in expanded mode**
**File:** `src/components/FilterBar.tsx` (lines ~920-1040)
**Issue:** Mobile expanded shows Line, Region, Destination, Port, Nights, Type, Room, Price, Sort — but these stack vertically taking too much space. On a phone, this is ~800px tall.
**Fix:** Only show active filters on mobile, or use a tabbed/drawer approach.

### 8. **Desktop Row 2 buttons overlap**
**File:** `src/components/FilterBar.tsx` (lines ~852-890)
**Issue:** 5 filter groups in a `flex-wrap` row. At 768px, text wraps and buttons overlap.
**Fix:** Proper responsive wrapping with explicit breakpoints.

### 9. **FilterSelectionGrid Row 1 dropdowns wrap poorly**
**File:** `src/components/FilterSelectionGrid.tsx` (lines ~700-725)
**Issue:** Three MultiSelectDropdowns in `flex-col sm:flex-row`. At 480px, labels wrap awkwardly.
**Fix:** Shrink label sizes, remove "nights" suffix on mobile.

### 10. **FilterSelectionGrid Row 2 filters overlap**
**File:** `src/components/FilterSelectionGrid.tsx` (lines ~725-760)
**Issue:** Four groups (Nights, Type, Price, Sort) + Clear button in `flex-wrap`. At 640px, text wraps and buttons touch.
**Fix:** Proper responsive breakpoints.

### 11. **No scroll indication when content overflows**
**Issue:** Mobile expanded body has no scroll indicator. User doesn't know there's more content below.
**Fix:** Add "Scroll" hint or use sticky toggle button.

### 12. **MaterialIcon dropdown arrows get clipped**
**File:** Multiple dropdowns
**Issue:** Expand/collapse MaterialIcons near right edge get clipped by container padding.
**Fix:** Ensure right padding is sufficient.

---

## Resolution Plan

### Phase A: Fix mobile layout (30 min)

| # | Change | Files |
|---|--------|-------|
| A1 | Reduce toggle button padding to `py-2` | FilterBar.tsx |
| A2 | Stack price inputs vertically on mobile | FilterBar.tsx |
| A3 | Stack expanded filter rows vertically with `space-y-2` | FilterBar.tsx |
| A4 | Shorten Night options to "0–3", "4–7", "8+" (remove "nights") | FilterBar.tsx |
| A5 | Shorten Type options to "Drop", "Solo", "Value" | FilterBar.tsx |
| A6 | Shorten Sort option labels | FilterBar.tsx |
| A7 | Add bottom margin to expanded mobile body | FilterBar.tsx |
| A8 | Add "Scroll to see more" indicator | FilterBar.tsx |

### Phase B: Fix desktop layout (20 min)

| # | Change | Files |
|---|--------|-------|
| B1 | Use `flex-wrap` with explicit breakpoints (sm:flex-row) | FilterBar.tsx, FilterSelectionGrid.tsx |
| B2 | Add `gap-2` between filter groups | Both files |
| B3 | Shrink label text to `text-[10px]` on mobile | Both files |
| B4 | Ensure right padding is 12px (not 8px) for dropdown arrows | Both files |

### Phase C: Verify with Playwright (15 min)

| # | Test | Command |
|---|------|---------|
| C1 | Screenshot at 320px viewport | `npx playwright test` |
| C2 | Screenshot at 480px viewport | `npx playwright test` |
| C3 | Screenshot at 768px viewport | `npx playwright test` |
| C4 | Screenshot at 1024px viewport | `npx playwright test` |
| C5 | No console errors at all widths | `npx playwright test` |
| C6 | All filter buttons clickable | `npx playwright test` |

---

## Validation

**Validate:** `npx next build` after each phase

**Playwright tests to add:**
```typescript
test('filters render correctly at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/deals');
  await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
});

test('filters render correctly at 768px', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/deals');
  await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
});
```

---

## Post-Resolution State

After completion:
- Mobile (320-768px): Vertical stack, minimal padding, short labels
- Tablet (768-1024px): 2-column wrap, medium padding
- Desktop (1024px+): Single row, full labels
- All filter interactions work without overflow or scroll issues
- Screenshot tests confirm no visual regressions

**Estimated effort:** ~1 hour total
**Risk:** Low — changes are cosmetic/layout only
