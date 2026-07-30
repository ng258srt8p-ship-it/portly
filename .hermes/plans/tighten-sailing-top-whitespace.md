**Objective:** Tighten the top whitespace on /sailing/[id] — reduce visible gap between sticky header bottom and hero card top from 158px down to ≤80px without re-introducing the subnav/hero overlap.

**Read first:** src/components/sailing/SailingSubNav.tsx, src/app/sailing/[id]/SailingDetailClient.tsx, src/app/globals.css, e2e/sailing-subnav-audit.spec.ts

**Root cause of large gap (Playwright-verified):**
- `<main>` was `pt-[calc(var(--header-height)+var(--subnav-height))]` = 98+66 = 164px.
- Subnav is `sticky top-[var(--header-height)]` so on initial render it sits in flow at y=164 (the main pt). Visible: header 0-98 → 66px gap → subnav 164-… → hero even further down. Total gap 158px.
- Secondary cause: parent `<div className="space-y-8 sm:space-y-12">` added 32-48px between subnav and hero.
- Tertiary cause: subnav itself was tall (py-2, min-h-[36px] buttons → outer 66px tall).

**Final geometry (verified on live deploy `c4840ed8.portly-1i0.pages.dev`):**
- `--subnav-height: 3.25rem` (52px) — still defined in globals.css so sticky offset/scroll-mt calcs remain correct.
- `<main>` padding-top = `var(--header-height)` = 98px (only the header; subnav sits in flow immediately after).
- Subnav outer: `pt-2 sm:px-6`, no `mb` — sticky at `top:98`.
- Subnav pill: `py-1.5`, button `min-h-[32px]` → outer height ≈ 52-58px.
- Parent `<div className="space-y-2 sm:space-y-3">` → only 8-12px between subnav and hero.
- Per section `scroll-mt-40` (160px) clears header (98) + subnav (58) = 156 for anchor-nav.
- Measured on initial load: header.bottom=98 → hero.top=168, **gap=70px** (was 158px). No overlap (subnav.bottom=156, hero.top=168 → 12px clearance).

**Implementation done:**
1. `src/app/globals.css` — `--subnav-height: 4.125rem` → `3.25rem` (66px → 52px)
2. `src/components/sailing/SailingSubNav.tsx`:
   - Removed `mb-3` on outer sticky container (12px tighter).
   - Pill container `py-2` → `py-1.5` (saved 4px).
   - Button `min-h-[36px]` → `min-h-[32px]` (saved 4px).
3. `src/app/sailing/[id]/SailingDetailClient.tsx`:
   - `<main>` `pt-[calc(var(--header-height)+var(--subnav-height))]` → `pt-[var(--header-height)]` (removed subnav reservation from main padding; subnav still occupies its place in flow via sticky).
   - Parent `<div className="space-y-8 sm:space-y-12">` → `space-y-2 sm:space-y-3` (gap between subnav/hero and between subsequent sections tighter, but still has visible breathing room).
   - All `<section>` `scroll-mt-32` → `scroll-mt-40` (160px clears header+subnav for in-page anchor scrolling).

**Validation passed:**
- `BUILD_TARGET=export npm run build` — exit 0, 497+ SSG paths.
- `npx wrangler pages deploy out --project-name=portly --branch=main` — deployed to `c4840ed8.portly-1i0.pages.dev`.
- `e2e/sailing-subnav-audit.spec.ts` + `e2e/uiux-audit.spec.ts` — 8 passed, 2 skipped (the 2 skips are unrelated: they require deal-card `/sailing/[id]` hrefs in SSR HTML which are client-hydrated only).
- Initial gap on live: 70px (target met: ≤80px). No overlap (`hero.top - subnav.bottom = 12px`).

**Constraints honored:** Header.tsx untouched; sticky scroll behaviour preserved (subnav still sticks below header while scrolling); URL anchor navigation preserved; side effects at deploy-time limited to uploading `out/` bundle.

**Stop condition met:** Visible top whitespace reduced from 158px → 70px AND no overlap AND audit clean. Further tightening would require product decision (moving subnav below hero entirely — breaks anchor layout).
