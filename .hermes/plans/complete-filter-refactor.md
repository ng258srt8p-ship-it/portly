# Plan: Complete Refactor of Filter Section

## Current State Analysis

**What's Broken:**
1. **FilterSelectionGrid not rendering** on `/deals` page - page shows only header and deals grid, NO filter controls
2. **Component has been iterated on 5+ times** with patches causing potential issues
3. **API works** (returns 5 deals) but frontend doesn't render filters
4. **No JavaScript errors** in console - likely conditional rendering issue
5. **Tests pass (11/12)** but test against wrong assumptions (Apply/Reset buttons don't exist)

**Root Cause:** The component renders conditionally: `{deals && !loading && <FilterSelectionGrid />}`. Either `deals` is null/undefined or `loading` is true, or the component crashes silently.

## Refactor Strategy: Clean Slate Approach

### Phase 1: Diagnose & Fix Rendering (30 min)
1. Add debug logging to see if component mounts
2. Check if `deals` and `loading` states are correct
3. Fix any silent crashes in FilterSelectionGrid

### Phase 2: Redesign FilterSelectionGrid (60 min)
**New Design Requirements:**
- **Single component** with all filters inline (no external Clear button)
- **Immediate onChange** - no draft state, no Apply/Reset
- **URL-synced filters** - all state in search params
- **Clean visual hierarchy:**
  ```
  Row 1: [Line ▼] [Region ▼] [Destination ▼]
  Row 2: [Nights: 0-3|4-7|8+] [Type: Drop|Solo|Value] [Price: Min$-Max$] [Sort ▼] [Show 5|10|20|All] [Clear]
  ```
- **Accessible** - proper ARIA labels, keyboard nav
- **Responsive** - stacks on mobile

### Phase 3: Update DealsGrid Integration (20 min)
- Remove old `hasActiveFilters` logic
- Pass `filters` and `onChange` directly
- Remove local `limit` state - move to FilterSelectionGrid

### Phase 4: Comprehensive Tests (30 min)
- Test actual user flows, not implementation details
- Verify URL updates, filter persistence, clear functionality

## Implementation Details

### New FilterSelectionGrid Props
```typescript
interface FilterSelectionGridProps {
  filters: DealFilters;           // Current filters from URL
  onChange: (filters: DealFilters) => void;  // Single handler
  availableLines: string[];
  availableRegions: string[];
  availableDestinations: string[];
}
```

### Filter Controls (all in one component)
1. **Line** - MultiSelectDropdown (deduplicated Holland America)
2. **Region** - MultiSelectDropdown
3. **Destination** - MultiSelectDropdown
4. **Nights** - Segmented buttons [0-3] [4-7] [8+]
5. **Type** - Toggle pills with checkmarks [Drop] [Solo] [Value]
6. **Price** - Inline Min $ / Max $ inputs
7. **Sort** - Dropdown
8. **Page Size** - Segmented [5] [10] [20] [All]
9. **Clear** - Button (only shows when any filter active)

### State Management
- **No local state** in FilterSelectionGrid
- All state in DealsGrid → URL search params
- `onChange` immediately calls parent → URL updates → re-render

### Visual Design (Tailwind)
- **Colors:** ink/indigo/coral/mint per existing design system
- **Focus rings:** indigo/50
- **Active states:** bg-indigo text-white
- **Hover:** bg-black/[0.04]
- **Spacing:** gap-3, px-3 py-2 for buttons, px-2 py-1 for inputs

## Acceptance Criteria
- [ ] Filter section visible on `/deals` page load
- [ ] All 9 filter controls render correctly
- [ ] Clicking any filter updates URL immediately
- [ ] Page reload preserves filters via URL
- [ ] Clear button appears when filters active, clears all
- [ ] Page size selector works and persists
- [ ] Build passes, no TypeScript errors
- [ ] All Playwright tests pass (15+ tests)

## Files to Modify
1. `src/components/FilterSelectionGrid.tsx` - **Complete rewrite**
2. `src/components/DealsGrid.tsx` - Simplify integration
3. `e2e/filter-selection-grid.spec.ts` - Rewrite tests for new design
4. Delete: old helper functions no longer needed

## Timeline: ~2.5 hours total
- Phase 1: 30 min
- Phase 2: 60 min  
- Phase 3: 20 min
- Phase 4: 30 min
- Buffer: 10 min