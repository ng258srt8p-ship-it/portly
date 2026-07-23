# GOAL: Fix Blank Pages and Typography Issues

**Objective:** Fix all pages that show blank/empty states and revert problematic font rendering that causes unreadable titles.

**Read first:** 
- `src/app/page.tsx` - main page with blank pricing table
- `src/components/PriceComparisonTable.tsx` - table loading issue
- `src/components/search/SearchHero.tsx` - search functionality
- `src/styles/globals.css` - font configuration
- `src/app/layout.tsx` - font imports

**Constraints:** 
- Use system fonts for titles as fallback
- Fix data fetching to actually return values
- No empty states or loading states forever
- Prices must be readable with proper contrast
- Do not use Syne font for titles - use system fonts or Plus Jakarta Sans

**Validate:** `npx playwright test e2e` - all pages must load without blank screens
**Checkpoints:** Work in checkpoints, log progress briefly
**Stop when:** All pages render with actual data, not loading states; font readability passes

---

## Gap Summary

### Issues Found:
1. **Blank pricing table** - `PriceComparisonTable.tsx` stuck in loading state
2. **Syne font readability** - `font-display` headings are hard to read
3. **Multiple pages blank** - Need to check if other pages have same issue

### Root Cause:
- Data fetching likely failing silently
- Font styling not providing proper contrast

### Verification:
- Check page load time and data
- Verify table renders with actual prices