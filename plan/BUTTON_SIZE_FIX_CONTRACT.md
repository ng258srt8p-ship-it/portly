# /goal Contract — Fix Deal Card Button Sizing

**Objective:** Make all "View Deal" and "Book" buttons in deal cards always the same size.

**Read first:** `plan/BUTTON_SIZE_FIX_GOALLOOP.md`

**Context:**
- `src/components/DealsGrid.tsx` renders deal cards with two buttons in the footer
- Book button conditional renders (`deal.bookingUrl && <a>`) — sometimes only 1 button visible
- Both buttons use `flex-1` but content length differs
- Container uses `w-full sm:w-auto` which may cause width inconsistency

**Execution Order:**
1. Always render both buttons (hide Book via CSS when no URL)
2. Give both buttons identical classes (padding, text, rounding, hover)
3. Use explicit equal sizing instead of `flex-1`
4. Verify with Playwright

**Constraints:**
- No new dependencies
- Only fix button size
- Keep test IDs, keep anchor-based book button

**Validation:**
- Playwright test confirms buttons are same size
- All existing tests still pass

**Checkpoints:**
- After Phase A: Buttons always render (hidden when no URL)
- After Phase B: Buttons have identical styling  
- After Phase C: No conditional render logic
- After Phase D: Playwright tests pass

**Stop when:** All buttons equal size AND all tests pass
