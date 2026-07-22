# Plan: Filter Selection UI Refactor

**Date:** 2026-07-15
**Status:** ✅ COMPLETED (2026-07-15 22:50)
**Estimated effort:** 2–3 hours

---

## Summary

The Deals page filter system has **two coexisting components** (`DealsFilters.tsx` and `FilterSelectionGrid.tsx`) with overlapping functionality, duplicated constants, and several functional bugs exposed by Playwright audit. The plan consolidates into a single, responsive, fully-featured filter component.

---

## Issues Found (Playwright Audit)

### 🔴 Functional Bugs

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| F1 | **Cruise Line dropdown is `disabled`** when ≤1 cruise line in data (current API returns only "Royal Caribbean") | `FilterSelectionGrid.tsx` line ~570 | Filter appears but is unusable; user can't filter by line |
| F2 | **Region dropdown is `disabled`** when ≤1 region (data only has "Caribbean") | Same as F1 | Same issue — dropdown dead when data is narrow |
| F3 | **Destination dropdown is `disabled`** when ≤1 destination | Same as F1 | Same issue |
| F4 | **Missing Departure Port filter** — FilterSelectionGrid has no MultiSelectDropdown for `departurePort` | Entire component | Available data field is completely unreachable from UI |
| F5 | **URL sync omits `departurePort`** — `DealsGrid.tsx` parses it from URL but FilterSelectionGrid can't set it | `src/components/DealsGrid.tsx` ~line 48 | Even if added, URL state would be lost on navigation |
| F6 | **No mobile collapse/expand** — No "Show filters" / "Hide filters" toggle on mobile | FilterSelectionGrid renders all filters inline | Mobile viewport (375px) has the entire filter bar stacked vertically, consuming ~80% of viewport height (see screenshot) |

### 🟡 UI / Overlap Issues

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| U1 | **Dead code: `DealsFilters.tsx`** — Not imported anywhere in `DealsGrid.tsx` or other pages | `src/components/DealsFilters.tsx` (230 lines) | Confuses future devs; risk of drift between old and new components |
| U2 | **Duplicate constants** — `NIGHT_OPTIONS`, `SORT_OPTIONS`, `BADGE/TYPE_OPTIONS` defined identically in both `DealsFilters.tsx` AND `FilterSelectionGrid.tsx` | Both files | Bug fix in one place is missed in the other; maintenance burden |
| U3 | **Inconsistent interaction patterns** — If both components were used together: checkboxes (DealsFilters) vs dropdowns (FilterSelectionGrid) vs pill buttons (FilterSelectionGrid TypePillGroup) | Both components | Confusing UX; users can't predict filter behavior |
| U4 | **Disabled dropdowns waste space** — When only 1 option exists, the dropdown still renders at full width with `opacity-40` | `FilterSelectionGrid.tsx` ~line 570 | Wastes horizontal space on desktop; contributes to mobile overflow |
| U5 | **No responsive layout strategy** — Filters stack vertically on mobile with no collapse mechanism | `FilterSelectionGrid.tsx` entire layout | Mobile screenshot shows filter bar takes up most of the screen, pushing all deal cards below the fold |

---

## Current Architecture

```
src/components/
├── DealsGrid.tsx              ← Uses FilterSelectionGrid (not DealsFilters!)
├── FilterSelectionGrid.tsx    ← Currently used; dropdown + pill UI
├── DealsFilters.tsx           ← DEAD CODE; never imported
└── (others...)

src/types/cruise.ts            ← DealFilters interface (shared)
```

**FilterSelectionGrid** handles: Line, Region, Destination (as MultiSelectDropdown), Nights (segmented), Type (pill group), Price (inputs), Sort (dropdown), Clear, Page Size.

**DealsFilters** (dead) handles: Line, Region, Destination (as checkboxes), Nights, Type, Price, Sort, Clear.

---

## Proposed Solution: Single `DealsFilterBar` Component

### Architecture Changes

```
src/components/
├── DealsGrid.tsx              ← Uses new FilterBar, passes departurePort data
├── FilterBar.tsx              ← NEW: unified filter bar (replaces FilterSelectionGrid)
├── DealsFilters.tsx           ← DELETE (dead code)
└── (others...)
```

### Design Principles

1. **Single source of truth** — One component, one interaction pattern per filter type
2. **Responsive by default** — Collapsible on mobile (tap to expand), always-visible on desktop (≥1024px)
3. **Graceful degradation** — When a filter has ≤1 option, hide it entirely (don't show disabled)
4. **Full coverage** — Include Departure Port (was missing)
5. **URL parity** — All filter state syncs to URL search params

### Component Spec

```tsx
// FilterBar.tsx — single component replacing both DealsFilters and FilterSelectionGrid
interface FilterBarProps {
  filters: DealFilters;
  onChange: (filters: DealFilters) => void;
  availableLines: string[];
  availableRegions: string[];
  availableDestinations: string[];
  availablePorts: string[];       // NEW: was missing
  initiallyExpanded?: boolean;    // For mobile toggle
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}
```

### Layout Strategy

**Desktop (≥1024px):** Two-row layout, all filters visible
```
Row 1: [Line] [Region] [Destination] [Port]    ← Multi-select dropdowns (inline, compact)
Row 2: [Nights segmented] [Type pills] [Price] [Sort] [Clear] [Page size]
```

**Mobile (<1024px):** Collapsible header + expandable body
```
[☰ Filters (N)]  ← Tap to expand/collapse
  ─ Expanded body same as desktop but stacked vertically ─
```

### Interaction Patterns (per filter type)

| Filter | Desktop | Mobile | Rationale |
|--------|---------|--------|-----------|
| Cruise Line | Inline dropdown (show count) | Tap-to-expand dropdown | Multiple selections common |
| Region | Inline dropdown | Tap-to-expand dropdown | Same |
| Destination | Inline dropdown | Tap-to-expand dropdown | Same |
| Departure Port | Inline dropdown | Tap-to-expand dropdown | NEW — was missing |
| Nights | Segmented buttons | Segmented buttons (scrollable) | Mutually exclusive, few options |
| Type (badge) | Pill buttons | Pill buttons (scrollable) | Toggle-able, few options |
| Price range | Min/Max inputs | Min/Max inputs (stacked) | Numeric, always needed |
| Sort | Inline dropdown | Tap-to-expand dropdown | Single selection |
| Page size | Inline pills | Stacked pills | Control, not filter |
| Clear all | Visible when filters active | Visible when filters active | Always accessible |

### Rules for Missing/Single-Option Filters

When a category has **0 or 1 unique value** in the current dataset:
- **Hide the filter entirely** (don't render it)
- Rationale: A disabled or single-option dropdown wastes space and confuses users

---

## Implementation Steps

### Step 1: Create `src/components/FilterBar.tsx` (~200 lines)
- [x] Replace all `MultiSelectDropdown`, `SingleSelectDropdown`, `NightsSegmentedGroup`, `TypePillGroup`, `PriceInputs` sub-components with inline versions
- [x] Implement responsive collapse (header button + expandable body)
- [x] Add Departure Port support (new prop, new dropdown)
- [x] Hide filters when ≤1 option (instead of disabling)
- [x] Use shared constants from a new `src/lib/filterConstants.ts`

### Step 2: Create `src/lib/filterConstants.ts` (~30 lines)
- [x] Move `NIGHT_OPTIONS`, `SORT_OPTIONS`, `BADGE_OPTIONS` from both old files
- [x] Export as typed constants
- [x] Import in FilterBar

### Step 3: Update `src/components/DealsGrid.tsx` (~15 lines)
- [x] Replace `FilterSelectionGrid` import with `FilterBar`
- [x] Pass `availablePorts` from `availableOptions`
- [x] Add `initiallyExpanded={false}` (mobile) / remove prop (desktop)
- [x] Add `departurePort` to URL sync (parse + set)

### Step 4: Delete dead code
- [x] Delete `src/components/DealsFilters.tsx`
- [x] Delete `src/components/FilterSelectionGrid.tsx` (replaced by FilterBar)
- [x] Clean up any imports of it (verify none exist — grep confirms zero)

### Step 5: Verify
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` succeeds
- [x] Desktop: all filters visible in 2 rows, no disabled dropdowns
- [x] Mobile: tap "Filters (N)" to expand/collapse, no 80%-height filter bar
- [x] URL params include `departurePort` after filtering
- [x] Works with 0, 1, and many options for each filter
- [x] Playwright e2e tests: 6/6 passed (filter-bar-verify.test.ts)

---

## Files to Create / Modify

| File | Action | Lines |
|------|--------|-------|
| `src/components/FilterBar.tsx` | **CREATE** — unified filter bar | ~200 |
| `src/lib/filterConstants.ts` | **CREATE** — shared filter constants | ~30 |
| `src/components/DealsGrid.tsx` | **MODIFY** — swap component, add port, update URL sync | ~15 |
| `src/components/FilterSelectionGrid.tsx` | **DELETE** — replaced by FilterBar | ~430 (reduces code) |
| `src/components/DealsFilters.tsx` | **DELETE** — dead code | ~230 (reduces code) |

**Net result:** Remove ~660 lines of duplicate/old code, add ~230 lines of clean unified code. **Net reduction: ~430 lines.**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing URL parameters | Medium | Maintain same URL param names; add `departurePort` alongside existing ones |
| Mobile layout regression | Medium | Test at 375px, 414px, 768px viewports; use screenshots as regression baseline |
| Departure Port data not populated | Low | Check API returns `departurePort` on deals; if empty, just don't render the filter |
| Existing tests reference old component names | Low | Update e2e tests to use new `data-testid` values |

---

## Validation Checklist

- [x] `tsc --noEmit` clean
- [x] `npm run build` produces valid output
- [x] Desktop (1280px): all 8 filter categories visible in 2 rows, no overflow
- [x] Mobile (375px): filter bar collapses to single header line; expand shows full controls without taking >30% viewport
- [x] Filter with 0–1 options is hidden (not shown disabled)
- [x] Departure Port filter appears and persists to URL
- [x] Clear All resets every filter including new departurePort
- [x] URL search params round-trip: set → navigate → parse back

---

## Execution Log

| Time | Action | Result |
|------|--------|--------|
| 22:30 | Created `src/lib/filterConstants.ts` | ✅ Shared constants extracted |
| 22:35 | Created `src/components/FilterBar.tsx` (~780 lines) | ✅ Unified filter bar with responsive collapse |
| 22:40 | Updated `src/components/DealsGrid.tsx` | ✅ Swapped component, added departurePort |
| 22:42 | Deleted `FilterSelectionGrid.tsx` and `DealsFilters.tsx` | ✅ Dead code removed |
| 22:45 | Created `e2e/filter-bar-verify.test.ts` (6 tests) | ✅ All tests passing |
| 22:50 | Final validation: `npm run build` + Playwright | ✅ Build clean, 6/6 tests pass |
