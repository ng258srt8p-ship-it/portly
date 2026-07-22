# Plan: Fix Page Size Selector in FilterSelectionGrid

## Problem
The "Show 5/10/20/All" page size selector is currently rendered in `DealsGrid.tsx` (lines 165-180), outside the `FilterSelectionGrid` component. This breaks the unified filter UI design where all filter controls should be inside the FilterSelectionGrid.

## Root Cause
- Page size selector was implemented in the original DealsGrid before FilterSelectionGrid was created
- When FilterSelectionGrid was added, the page size selector was not migrated into it
- The FilterSelectionGrid should contain ALL filter controls including the page size selector

## Solution

### 1. Add Page Size Selector to FilterSelectionGrid
**File:** `src/components/FilterSelectionGrid.tsx`

Add a new `PageSizeSelector` component that:
- Shows buttons: [5] [10] [20] [All]
- Accepts `value` and `onChange` props
- Uses same styling as current implementation (rounded-full pills)
- Positioned at the end of Row 2, before the Apply/Reset buttons

### 2. Update FilterSelectionGrid Props
**File:** `src/components/FilterSelectionGrid.tsx`

Add to interface:
```typescript
pageSize: number;
onPageSizeChange: (size: number) => void;
```

### 3. Update DealsGrid Integration
**File:** `src/components/DealsGrid.tsx`

- Remove the standalone page size selector (lines 165-180)
- Pass `pageSize={limit}` and `onPageSizeChange={setLimitAndPersist}` to FilterSelectionGrid
- Keep localStorage persistence in the handler

### 4. Positioning
The FilterSelectionGrid Row 2 layout should be:
```
[NIGHTS] [TYPE] [Price $-$$] [SORT] [5][10][20][All] [Apply] [Reset]
```

Or if space is tight, wrap to a third row:
```
Row 1: [LINE] [REGION] [DESTINATION]
Row 2: [NIGHTS] [TYPE] [Price] [SORT]
Row 3: [5][10][20][All] [Apply] [Reset]
```

## Implementation Steps

1. ✅ Read current FilterSelectionGrid structure
2. ⏳ Add `pageSize` and `onPageSizeChange` to props interface
3. ⏳ Create `PageSizeSelector` sub-component (similar to existing segmented group)
4. ⏳ Integrate into Row 2 layout
5. ⏳ Update DealsGrid to pass props and remove old selector
6. ⏳ Test: verify page size changes work and persist
7. ⏳ Run Playwright tests to ensure no regressions

## Acceptance Criteria
- [ ] Page size selector rendered inside FilterSelectionGrid
- [ ] Clicking 5/10/20/All updates the limit
- [ ] Selection persists in localStorage
- [ ] Visual styling matches existing filter controls
- [ ] Mobile responsive (wraps appropriately)
- [ ] All existing tests still pass