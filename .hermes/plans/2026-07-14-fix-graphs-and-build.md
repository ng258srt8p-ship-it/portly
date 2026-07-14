# Plan: Fix Graph Mismatch & Build Error

## Problem Summary

Two separate but related issues prevent the user from seeing matching graphs:

1. **Build error in `PriceComparisonTable.tsx`** — a copy-paste duplication on lines 217–221
   causes SWC to fail on `<div>` JSX, blocking the entire Next.js app from loading.
   The error message is `Unexpected token 'div'. Expected jsx identifier`.

2. **Graph inconsistency** — even when the app builds, the sparkline on the deal card
   (`/deals`) and the sparkline on the sailing detail page (`/sailing/:id`) for the same
   sailing may appear different. The API data is now correct (both return identical
   6-point Oceanview history for sailing 1049), but discrepancies could arise from
   rendering differences or stale frontend state.

## Task 1: Fix the Build Error

### Root cause

`src/components/PriceComparisonTable.tsx` has a duplicated map/div block:

```
      {/* Price Row — per cabin tier */}        ← line 217 (keep for clarity)
            <div className="space-y-1">          ← line 218 DUPLICATE
              {sorted.map((cabin) => (           ← line 219 DUPLICATE
                <div                             ← line 220 DUPLICATE (no key)
                  {/* Price Row — per cabin tier */}  ← line 221 DUPLICATE
                        <div className="space-y-1">   ← line 222 ACTUAL START
                          {sorted.map((cabin) => (    ← line 223 ACTUAL MAP
```

This creates two nested maps and two closing `))}` + `</div>` pairs at the end
(lines 358–361) instead of one.

### Steps (2 patches, no new files)

1. **Remove the outer duplicated block** (lines 217–221), leaving only the inner
   proper block starting at line 222.

2. **Remove the extra closing pairs** at lines 360–361 (one `))}` + `</div>`), so the
   JSX tree has a single `<div className="space-y-1">…</div>` with one `sorted.map`.

### Verification after Task 1

- `npm run dev` reloads without the SWC syntax error
- `curl http://localhost:3000/` returns 200
- `curl http://localhost:3000/deals` returns 200
- App renders deal cards and sailing detail pages

## Task 2: Diagnose Remaining Graph Mismatch

Once the app loads, visually compare the sparkline for a specific sailing
(e.g., 1049) on the deals page and the sailing detail page.

### Possible causes of visual mismatch (post-build-fix)

| Cause | How to Test | Fix |
|-------|-------------|-----|
| **Stale frontend cache** — useLiveData polls every 30s; first render may use old data | Open DevTools Network tab, check request responses | Hard-refresh or clear SWR cache |
| **Different SVG dimensions make shapes look proportionally different** | Compare normalized SVG paths | Standardize on one Sparkline component if needed |
| **Price label vs sparkline last point don't align** | Check `deal.price` vs last history value | Verify `currentPrice` computation matches history's `total_usd` |
| **Different positive/negative color** — deals uses `dropPercent>0` (green); sailing computes `data[last]>=data[first]` | Check `positive` prop vs internal logic | Sync the positive-detection logic |
| **Sailing ID mismatch** — deal card links to wrong ID | Check router.push target | Verify `deal.id` matches `:id` in URL |

### Verification after Task 2

- Both pages show the same number of sparkline points for the same sailing
- Both sparklines have the same shape (up/down pattern), not necessarily the same
  absolute dimensions
- The last sparkline point approximately matches the displayed price
- For sailing 1049: 6 points, Oceanview, range $986–$2,799

## Task 3: If Graphs Still Don't Match — Frontend Rendering Alignment

If Task 2 reveals different shapes despite identical API data, align the rendering:

### Sub-tasks

1. **Rewrite `Sparkline.tsx` to accept an optional `cabinLabel` prop** so the deal
   card can show which cabin type the sparkline represents.

2. **Standardize positive/negative color detection** between the two components:
   - `Sparkline.tsx` (deals): `positive = deal.dropPercent > 0` (price dropped = green)
   - `SparklineChart.tsx` (sailing detail): `positive = data[last] >= data[first]`
   - Only one definition should exist; extract to a shared helper if needed.

3. **Add a `cabin_type` field to the `/api/deals` response** so `DealCard`
   can optionally label the sparkline with the cabin type.

4. **Normalize SVG viewBox** — both components should use the same
   `viewBox="0 0 140 44"` to produce geometrically identical paths.
   Currently the deal card uses 140×44 and sailing detail uses 400×80.

## Task 4: Clean Up

- Remove temporary test scripts (`debug_pricing.ts`, etc.)
- Kill stale background processes
- Verify `npx tsc --noEmit` on both `./` and `./server/`
