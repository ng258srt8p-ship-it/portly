**Objective:** Fix the mobile sailing subnav popover so the white container renders as a properly proportioned rounded rectangle when expanded, instead of an awkward stadium/pill shape with excessive curvature.

**Read first:** src/components/sailing/SailingSubNav.tsx, e2e/mobile-subnav-popover.spec.ts

**Current state (Playwright-verified on `0e005053.portly-1i0.pages.dev`, mobile 375×812):**

When the mobile popover is expanded:
- Inner pill container: **311 × 236 px**, `border-radius: 9999px` (`rounded-full`)
- Contents inside it: `<summary>` 309×40 (top, the trigger row) + `<ul>` 309×194 (grid-cols-2 of buttons)
- Both children have **no horizontal padding on the container itself** — `summary` has `px-4 py-2`, `ul` has `px-3 pb-3 pt-1`. Container itself has padding 0.
- `border-radius: 9999px` with a 311×236 box → corner radius resolves to `min(9999px, 236/2) = 118px`, producing the **stadium/pill** look the user dislikes.

**Visual issue (confirmed):** When expanded, the container is much taller than a typical "pill" element (236px vs the 56px collapsed height). At this aspect ratio, `rounded-full` makes the container look like an oval/stadium with very pronounced top/bottom curves — the corners are literally 118px radius (~38% of the container width). That is not the visual intent of a navigation popover; it should look like a normal rounded card.

**Goal:** Make the expanded popover look like a clean rounded rectangle (e.g. `rounded-2xl` = 1rem/16px corners). When collapsed, keep it as a pill (`rounded-full`) so the trigger button still has the stadium feel — switching radius based on expanded state.

**Approach options:**

A. **CSS-only conditional radius.** Change the inner container className to use `[&[open]]:rounded-2xl` Tailwind arbitrary variant, OR use `rounded-full [&:has(details[open])]:rounded-2xl`. Keeps the trigger pill-shaped when collapsed, rounded-rectangle when expanded.

B. **Always `rounded-2xl`.** Simple, but loses the pill look when collapsed (the trigger row also has `rounded-full` inside it which can stay).

C. **JS state-driven radius.** Track `open` in React state, conditionally apply `rounded-full` vs `rounded-2xl`. Most explicit but adds re-render logic.

**Recommended: Option A** — use Tailwind's arbitrary variant `group-[[open]]:rounded-2xl` on the inner container. The inner wrapper already wraps a `<details className="group">`. Adding `group-[[open]]` selector inside the inner container is the cleanest CSS-only solution. If Tailwind variant doesn't compile, fall back to inline style conditional via `[&>details[open]]:rounded-2xl`.

**Implementation:**
1. Edit `src/components/sailing/SailingSubNav.tsx` — on the mobile-only inner container `<div className="md:hidden w-full max-w-6xl rounded-full …">`, append `group-[[open]]:rounded-2xl` (so when the inner `<details className="group" open>` opens, the container flattens to rounded-2xl).
2. If Tailwind's `group-[[open]]` arbitrary variant doesn't generate a selector in the compiled CSS, use a CSS rule in `globals.css`:
   ```css
   .sailing-subnav-mobile:has(> details[open]) { border-radius: 1rem; }
   ```
   and add class `sailing-subnav-mobile` to the inner container.
3. Validate via Playwright:
   - Mobile collapsed: `border-radius: 9999px` ✓ (unchanged pill)
   - Mobile expanded: `border-radius: <16px (1rem)>` ✓ (rounded rectangle)
   - Both should have `backdrop-blur-xl shadow-float bg-white/80` preserved.

**Constraints:** Don't change desktop subnav; don't change the `<summary>` (it remains pill-shaped internally); preserve `border border-black/[0.06]`; preserve `backdrop-blur-xl` and `shadow-float`; visual chrome of the pill when collapsed must remain (user explicitly liked it).

**Checkpoints:**
1. Edit SailingSubNav.tsx to add the conditional radius class.
2. Verify Tailwind compiles the arbitrary variant (check `out/_next/static/css/*.css`).
3. Rebuild with `BUILD_TARGET=export npm run build`.
4. Deploy with `npx wrangler pages deploy out --project-name=portly --branch=main`.
5. Run `e2e/mobile-subnav-popover.spec.ts` on the new deploy URL.
6. Commit + push.

**Stop when:**
- Collapsed pill radius still 9999px (visual unchanged when closed), AND
- Expanded container radius ≤ 1rem (clean rounded rectangle, no stadium), AND
- Audit `e2e/uiux-audit.spec.ts` still passes 7/2.

**Document:** Save the working `[&+details[open]]` pattern (or `sailing-subnav-mobile:has(...)` fallback) to ui-ux-pro-max skill if pattern emerges.
