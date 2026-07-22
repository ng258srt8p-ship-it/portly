# /plan: FilterSelectionGrid - Correct Test Strategy

## Critical Realization
The original FilterSelectionGrid component uses **immediate onChange** pattern, NOT draft state with Apply/Reset buttons.

### Original Design
- User clicks filter → `onChange(filters)` called immediately → Parent updates state → Filters apply instantly
- Clear button appears when filters are active
- No Apply button
- No Reset button  
- No draft state

### My Incorrect Assumptions
I was testing for:
- Apply button (doesn't exist)
- Reset button (doesn't exist)
- Draft state persistence (doesn't exist)
- Filter state after Apply (wrong pattern)

### Correct Test Strategy

Tests should verify:
1. ✅ Clicking filter immediately updates the filter
2. ✅ Visual state shows selection (bg-indigo)
3. ✅ Clear button appears when filters active
4. ✅ Clicking Clear removes all filters
5. ✅ Page size selector integrated and works
6. ✅ Dropdowns open and show options

## Test Updates Needed

### Remove tests for non-existent features:
- ❌ "Apply button appears after making changes"
- ❌ "Reset button appears after selecting filters"
- ❌ "Apply button is indigo styled"
- ❌ "Reset button has border styling"
- ❌ "Filter state persists after Apply"

### Fix existing tests:
- Nights selection: Check that clicking updates visually (bg-indigo class)
- Dropdowns: Verify they actually open (check aria-expanded or visible dropdown)
- Multi-select: Verify selection works (button text changes from "All lines")

### Add correct tests:
- Clear button appears when filters active
- Clicking Clear resets all filters
- Page size selector changes limit immediately

## Implementation
Update e2e/filter-selection-grid.spec.ts to:
1. Remove Apply/Reset tests
2. Add Clear button tests
3. Fix visual state checks
4. Ensure dropdowns actually open