# Goal Loop — Fix Button Sizing on Deals Page

## Objective
Ensure all "View Deal" and "Book" buttons in deal cards are always the same size, regardless of content length.

## Diagnosis

Looking at `src/components/DealsGrid.tsx`, each deal card has a bottom section:

```html
<div className="flex items-center justify-between gap-2">
  <span>Sails {deal.sailDate}</span>
  <div className="flex items-center gap-2 w-full sm:w-auto">
    <a className="flex-1 ..." href={deal.bookingUrl}>...</a>  <!-- Book button -->
    <button className="flex-1 ..." >View Deal</button>
  </div>
</div>
```

Both buttons have `flex-1` which should make them equal width. However, there are issues:

1. **Occasional single button**: When `deal.bookingUrl` is falsy, only "View Deal" button renders — it spans full width alone, looking different than when two buttons exist.
2. **Text length differences**: "Royal Caribbean" vs "Book Now" — different text lengths cause different content width within `flex-1` which should still be equal but text wrapping could affect perceived size.
3. **Container width inconsistency**: `w-full sm:w-auto` on inner container means at small widths it takes full available space, but at sm+ it shrinks to content width. Combined with `flex-1` on each button, they should be equal but edge cases may break.

## Resolution Plan

### Phase A: Normalize button rendering
1. Always render BOTH buttons (hide Book button via CSS when no URL, don't skip render)
2. Add explicit `min-w-0` and `flex-none` where needed
3. Remove `flex-1` and use explicit equal sizing (`w-1/2` or fixed)

### Phase B: Normalize button styling
1. Give both buttons identical padding (`px-4 py-2`)
2. Ensure both buttons have same `text-xs font-bold text-white`
3. Ensure both buttons have same `rounded-full`
4. Ensure both buttons have same `hover:` states

### Phase C: Fix the "Book" button conditional render
- Instead of `{deal.bookingUrl && <a>}`, use `<a>` with conditional content that still renders but hides via `hidden` or `opacity-0`

### Phase D: Verify
1. Playwright test confirming all deal cards have exactly 2 buttons (or 1 if no URL)
2. Playwright test confirming button dimensions are equal
3. All existing tests still pass

---

## Constraints
- No new dependencies
- Only fix button size consistency
- Keep test IDs intact
- Keep anchor/book button as anchor (href-based)

## Validation
- All "View Deal" buttons same width across all cards
- All "Book" buttons same width across all cards  
- Both buttons exactly same dimensions when both present
- `npx playwright test` passes all existing tests

## Checkpoints
1. Phase A complete — buttons always render (hidden when no URL)
2. Phase B complete — buttons have identical styling
3. Phase C complete — no conditional rendering
4. Phase D complete — Playwright tests pass

## Stop Conditions
- Playwright test confirms all buttons equal size
- All existing tests still pass
- No console errors
