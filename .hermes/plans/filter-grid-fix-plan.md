# /plan: Fix FilterSelectionGrid Functionality & Rendering Issues

## Executive Summary
The FilterSelectionGrid component has 3 failing Playwright tests out of 19 (84% pass rate). Additionally, critical functionality is broken: Apply/Reset buttons are not rendering, and visual state indicators aren't working properly.

## Issues Identified

### CRITICAL: Apply/Reset Buttons Not Rendering ❌
**Symptom:** Buttons missing from page snapshot even though component is rendered
**Location:** `FilterSelectionGrid.tsx` ActionButtons component integration
**Root Cause:** Unknown - needs investigation of conditional rendering logic
**Impact:** Users cannot apply or reset filters

### HIGH: Nights Selection State Not Persisting ❌
**Symptom:** `aria-pressed="true"` not appearing after clicking nights options
**Test:** "Nights selection activates with visual indicator" (line 77)
**Location:** `FilterSelectionGrid.tsx` NightsSegmentedGroup
**Evidence:** 
- Code shows `aria-pressed={isActive}` on line 390
- Test expects `aria-pressed="true"` but gets `""`
- Test also checks `bg-indigo` class - unknown if this works
**Impact:** Users can't see which nights option is selected

### HIGH: Multi-select Dropdown Checkmarks Not Showing ❌
**Symptom:** Checkmark icon not visible after selecting option from dropdown
**Test:** "Multi-select dropdown shows checkmark for selected items" (line 196)
**Location:** `FilterSelectionGrid.tsx` MultiSelectDropdown component
**Evidence:**
- Test looks for `span.material-symbols-outlined:has-text("check")`
- Element not found in DOM
- MaterialIcon component may not render checkmark correctly
**Impact:** Users can't see which options are selected in dropdowns

### MEDIUM: Filter State Not Persisting After Apply ❌
**Symptom:** After clicking Apply, the selected state is lost
**Test:** "Filter state persists after Apply" (line 216)
**Location:** `FilterSelectionGrid.tsx` handleApply / state management
**Evidence:**
- Test clicks "8+" nights, clicks Apply, expects button to still be active
- `aria-pressed` attribute not found on re-query
- May be related to how `draftFilters` syncs with `filters` prop
**Impact:** Applied filters don't stick, breaking core functionality

### LOW: Page Size Selector Active State Test ⚠️
**Symptom:** Test was just added, may have same `aria-pressed` issue
**Test:** "Page size selector is integrated" (line 250)
**Status:** Currently passing, but may have visual state issues
**Note:** Should verify visual styling matches design

## Investigation Required

### 1. ActionButtons Rendering
```bash
# Check if ActionButtons component exists and is properly imported
grep -n "ActionButtons" src/components/FilterSelectionGrid.tsx
```

### 2. State Management Flow
```bash
# Trace how draftFilters -> filters sync works
grep -n "handleApply\|onApply\|draftFilters" src/components/FilterSelectionGrid.tsx
```

### 3. MaterialIcon Checkmark Rendering
```bash
# Check how MaterialIcon renders checkmarks
cat src/components/ui/MaterialIcon.tsx
```

## Fix Priority

1. **P0: Apply/Reset buttons not rendering** - Core functionality broken
2. **P1: Filter state not persisting** - Core functionality broken
3. **P2: Nights selection visual state** - UX issue (functionality may work)
4. **P3: Dropdown checkmarks** - UX issue (selection may work)
5. **P4: Test improvements** - Update tests to match actual behavior

## Proposed Solutions

### Fix 1: ActionButtons Integration
**Hypothesis:** ActionButtons component may not be defined or imported
**Action:** 
- Verify ActionButtons component exists in file
- Check imports at top of file
- Verify conditional rendering logic (`hasChanges`, `hasActiveDraftFilters`)

### Fix 2: aria-pressed Attribute
**Hypothesis:** React may not be setting attribute correctly
**Action:**
- Change `aria-pressed={isActive}` to `aria-pressed={isActive ? 'true' : 'false'}`
- Or use `data-active={isActive}` for testing

### Fix 3: Checkmark Icon Rendering
**Hypothesis:** MaterialIcon component doesn't render text content
**Action:**
- Check MaterialIcon implementation
- May need to use different icon approach (SVG inline, different component)
- Update test to look for actual visual indicator

### Fix 4: State Persistence
**Hypothesis:** Draft state not properly syncing with parent
**Action:**
- Trace handleApply -> onApply -> setFilters flow
- Verify DealsGrid properly updates filters state
- Check URL params update correctly

## Test Updates Needed

Update tests to be more resilient:
1. Test visual state (bg-indigo) instead of just aria-pressed
2. Test functional behavior (filters applied) vs DOM attributes
3. Add explicit waits for state updates
4. Test actual filter results change, not just button state

## Success Criteria

- [ ] All 19 Playwright tests pass
- [ ] Apply/Reset buttons visible and functional
- [ ] Selected nights option shows visual indicator
- [ ] Selected dropdown options show checkmarks or indicators
- [ ] Filter state persists after Apply
- [ ] Page size selector shows active state
- [ ] Build passes with no errors
- [ ] Manual testing at localhost:3000/deals confirms all functionality

## Next Steps

1. Read full FilterSelectionGrid.tsx to understand component structure
2. Verify ActionButtons component definition and import
3. Check MaterialIcon component implementation
4. Trace state management from child to parent
5. Implement fixes for each issue
6. Update tests as needed
7. Run full test suite
8. Manual verification in browser