# Goal: Hero Quick-Filter Chips on Deals Page

## Summary

The four chip buttons in the `ExploreDealsHero` — **Price Drop**, **Solo Friendly**, **Best Value**, **Any Duration** — are currently static `<span>` elements that do nothing when clicked. They need to act as quick-filter toggles that filter the deal cards below, share state with the full filter bar (`FilterSelectionGrid`), persist to URL search params, and show an active state when their filter is applied.

---

## Definition of Done

1. **All 4 hero chips are clickable** and toggle their corresponding filter on/off
2. **Active chips have a visible active state** (filled background color, white text, border accent)
3. **Filter state is shared** between hero chips and `FilterSelectionGrid` — toggling a chip updates the filter grid and vice-versa
4. **URL search params reflect active filters** (e.g., `?badgeType=drop`, `?minNights=&maxNights=` cleared)
5. **The deal card grid re-renders** to show only matching deals when a chip filter is active
6. **The Clear button** in the filter bar resets both the grid filters AND the hero chip active states
7. **Playwright e2e tests pass** verifying all interactions end-to-end

---

## Step-by-Step Plan

### Step 1 — Lift filter state to the page component

**File:** `src/app/deals/page.tsx`

- Move `filters` / `setFilters` state from `DealsGrid` up to the page component
- Pass `filters` and `setFilters` as props to both `<ExploreDealsHero>` and `<DealsGrid>`
- Keep `useEffect` URL sync in `DealsGrid` (or move it to page level — either works; simplest is to keep it in DealsGrid since it already has the logic)

### Step 2 — Wire the hero chip buttons

**File:** `src/app/deals/ExploreDealsHero.tsx`

- Convert `<Chip>` from a `<span>` to a `<button>`
- Accept `isActive`, `onClick`, and `testId` props
- Map chip clicks to filter state:

| Chip | Filter Action |
|------|--------------|
| Price Drop | Toggle `'drop'` in `badgeType` |
| Solo Friendly | Toggle `'solo'` in `badgeType` |
| Best Value | Toggle `'gold'` in `badgeType` |
| Any Duration | Clear `minNights` and `maxNights` |

- For badge-type chips (Price Drop, Solo Friendly, Best Value):
  - If the chip's badgeType value is already in `filters.badgeType`, clicking it **removes** that value (toggles off)
  - If not present, clicking it **adds** that value (toggles on)
  - If `badgeType` becomes empty after removal, set it to `undefined`
- For "Any Duration":
  - If `minNights` and `maxNights` are both `undefined`, clicking it does nothing (already "any duration")
  - Otherwise, clicking it clears both to `undefined`
- Visual active state:
  - Active: `bg-indigo text-white border-indigo shadow-sm`
  - Inactive: current `border-black/[0.06] bg-white` style

### Step 3 — Add data-testid attributes

- Hero chips: `data-testid="hero-chip-price-drop"`, `"hero-chip-solo-friendly"`, `"hero-chip-best-value"`, `"hero-chip-any-duration"`
- FilterSelectionGrid: ensure `data-testid` is present on the grid root and individual controls

### Step 4 — Verify sync with FilterSelectionGrid

- The `FilterSelectionGrid` receives the same `filters` / `setFilters` from DealsGrid
- Since DealsGrid now receives filters from the page, all three components (Hero, DealsGrid, FilterSelectionGrid) share one source of truth
- No additional code changes needed if state is properly lifted

### Step 5 — Write Playwright e2e tests

**File:** `e2e/deals-hero-filters.spec.ts`

Tests to write:

1. **Hero chip: Price Drop — click toggles filter on**
   - Navigate to `/deals`
   - Wait for deal cards to load
   - Click `[data-testid="hero-chip-price-drop"]`
   - Assert URL contains `badgeType=drop`
   - Assert chip has active styling (background indigo)
   - Assert all visible deal cards have badge "Drop Deals" (or badgeType === 'drop')

2. **Hero chip: Solo Friendly — click toggles filter on**
   - Click `[data-testid="hero-chip-solo-friendly"]`
   - Assert URL contains `badgeType=solo`
   - Assert all visible deal cards have solo-friendly badge

3. **Hero chip: Best Value — click toggles filter on**
   - Click `[data-testid="hero-chip-best-value"]`
   - Assert URL contains `badgeType=gold`
   - Assert all visible deal cards have gold/great-value badge

4. **Hero chip: Any Duration — click clears nights filter**
   - Set nights filter via `[data-testid="filter-nights"]` (click "4–7")
   - Assert URL contains `minNights=4` and `maxNights=7`
   - Click `[data-testid="hero-chip-any-duration"]`
   - Assert URL no longer contains `minNights` or `maxNights`
   - Assert chip shows active state

5. **Hero chip: toggle off — click again removes filter**
   - Click Price Drop chip (turns on)
   - Click Price Drop chip again (turns off)
   - Assert URL no longer contains `badgeType=drop`
   - Assert chip is back to inactive styling

6. **Cross-component sync: filter bar updates hero chip**
   - Click `[data-testid="filter-type"]` → click the "Drop Deals" pill to toggle on
   - Assert hero `[data-testid="hero-chip-price-drop"]` is in active state
   - Assert URL contains `badgeType=drop`

7. **Clear button resets both hero chips and filter grid**
   - Activate Price Drop and Solo Friendly via hero chips
   - Click `[data-testid="filter-clear"]` in the filter grid
   - Assert URL has no filter params
   - Assert all hero chips are back to inactive state

---

## Verification

Run the Playwright tests after implementation:

```bash
npx playwright test e2e/deals-hero-filters.spec.ts
```

All 7 tests must pass. Additionally run the existing deals tests to ensure no regression:

```bash
npx playwright test e2e/deal-analysis-*.spec.ts
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/deals/page.tsx` | Lift `filters`/`setFilters` state to page level, pass as props |
| `src/app/deals/ExploreDealsHero.tsx` | Convert Chip to clickable button with filter toggle logic |
| `src/components/DealsGrid.tsx` | Accept `filters`/`setFilters` as optional props (or keep default) |
| `e2e/deals-hero-filters.spec.ts` | **New** — Playwright e2e tests for all 7 scenarios |

## Files NOT to Modify

- `src/components/FilterSelectionGrid.tsx` — already handles filter state correctly
- `src/types/cruise.ts` — `DealFilters` type already has `badgeType` and `minNights`/`maxNights`
- `src/services/cruiseApi.ts` — API already supports `badgeType` and `minNights`/`maxNights` params

---

## Implementation Summary

**Status:** ✅ Complete — all 7 Playwright tests pass.

### Changes Made

1. **`src/app/deals/page.tsx`** — Lifted filter state (`filters`, `setFilters`) from `DealsGrid` to page level. Added URL sync `useEffect`. Passes `filters` and `onFilterChange` as props to both `ExploreDealsHero` and `DealsGrid`.

2. **`src/app/deals/metadata.ts`** — New file moved `metadata` export from `page.tsx` (required because `page.tsx` is now a client component).

3. **`src/app/deals/ExploreDealsHero.tsx`** — Replaced passive `<span>` chips with interactive `<button>` elements. Added `toggleBadge()` and `toggleAnyDuration()` handlers. Active state uses `bg-indigo text-white border-indigo` styling.

4. **`src/components/DealsGrid.tsx`** — Removed internal `filters`/`setFilters` state and URL sync `useEffect` (now receives them as props). Added `DealsGridProps` interface.

5. **`e2e/deals-hero-filters.spec.ts`** — New file with 7 Playwright e2e tests verifying all chip interactions.

### Playwright Test Results

```
7 passed (12.7s)
```

- ✅ Price Drop chip toggles `badgeType=drop` and filters cards
- ✅ Solo Friendly chip toggles `badgeType=solo` and filters cards
- ✅ Best Value chip toggles `badgeType=gold` and filters cards
- ✅ Any Duration chip clears `minNights`/`maxNights` from URL
- ✅ Re-clicking a chip toggles filter off
- ✅ Filter grid → hero chip sync (bidirectional)
- ✅ Clear button resets both hero chips and filter grid
