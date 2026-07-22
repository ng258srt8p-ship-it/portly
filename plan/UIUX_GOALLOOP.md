# /goal UI/UX Consistency Resolution — Full Remediation Loop

**Objective:** Resolve all 18 UI/UX inconsistencies documented in plan/UIUX_INCONSISTENCY_PLAN.md to achieve a unified, consistent design system across the entire TripTide frontend.

**Read first:** plan/UIUX_INCONSISTENCY_PLAN.md — then src/components/layout/Header.tsx, src/components/Footer.tsx, src/app/globals.css, tailwind.config.ts

**Constraints:**
- Do NOT rename the brand ("TripTide") — the user project is Portly but the public brand is TripTide
- Do NOT add new dependencies
- Do NOT change the MaterialIcon component interface
- Do NOT modify the database schema or API contracts
- Preserve all existing functionality (filters, live data polling, routing)
- When fixing duplicate headers/footers, ensure all 7 standalone pages (privacy, terms, disclosure, about, contact, press, careers) render identically to the shared component version
- Do not refactor unrelated code outside the scope of these 18 issues

**Validate:** `npx next build` after each change — the build must succeed with zero errors

**Document:** Write concise, targeted documentation for all changes — update plan/UIUX_INCONSISTENCY_PLAN.md with checkmarks as each item completes.

**Checkpoints:** Work in checkpoints. After completing each priority tier (Critical → High → Medium → Low), write a brief progress log entry to plan/UIUX_FIX_PROGRESS.md.

**Stop when:** All 18 items in plan/UIUX_INCONSISTENCY_PLAN.md are marked complete AND `npx next build` passes cleanly, OR when further changes require product/architecture decisions (e.g., color system preference between Triptide vs Portly tokens).

---

## Execution Order (follow exactly)

### Phase 1: Fix Broken CSS Utilities (5 min)
1. **Item #1** — Add `shadow-float` and `shadow-float-lg` to `tailwind.config.ts` `theme.extend.boxShadow` using the values from `globals.css` `--shadow-float` and `--shadow-float-lg`
2. **Item #2** — Add `--font-display`, `--font-body`, `--font-mono` CSS variables to `:root` in `src/app/globals.css` matching the Tailwind config font stacks
3. **Item #3** — Add `emerald` and `emerald-dark` to `tailwind.config.ts` colors (use `#10b981` for emerald, `#059669` for emerald-dark) OR change DealsGrid.tsx to use `bg-mint` instead
4. **Item #4** — Define `pulse-glow` @keyframes in `globals.css`
5. **Item #5** — Define `border-hard-bottom` in `globals.css` as `border-b-2 border-[var(--border-hard)]`

### Phase 2: Unify Logo & Headers (40 min)
6. **Item #6** — In `src/components/layout/Header.tsx`: Replace inline wave SVG with `<MaterialIcon name="directions_boat_filled" size="sm" className="text-white" />`
7. **Item #6** — In `src/components/Footer.tsx`: Same replacement
8. **Items #7+#8** — For each of the 7 pages (privacy, terms, disclosure, about, contact, press, careers):
   - Remove the inline `<header>` block (lines ~14-60 in each file)
   - Remove the inline `<footer>` block (last ~70 lines in each file)
   - Add `import Header from '@/components/layout/Header'` and `import Footer from '@/components/Footer'`
   - Wrap page content with `<Header />` and `<Footer />` (matching the pattern in page.tsx/homepage)
   - Ensure the `<main>` tag wraps the page content properly

### Phase 3: Unify Color Systems (1.5 hr)
9. **Item #9** — Decide canonical approach: Use Triptide tokens (`canvas`, `ink`, `indigo`, `mint`, `coral`) as the primary system. Map all `neon-*` and `obsidian-*` references to Triptide equivalents. Remove Portly-specific dark mode overrides that conflict.
10. **Item #10** — Replace hardcoded colors in all `src/components/sailing/` files:
    - `bg-slate-100` → `bg-ink-faint/10`
    - `text-slate-500` → `text-ink-faint`
    - `text-slate-600` → `text-ink-soft`
    - `text-emerald-600` → `text-mint-ink` or `text-neon-teal-500` (for positive)
    - `bg-emerald-500` → `bg-mint-ink` or `bg-neon-teal-500`
    - Any remaining hardcoded colors → use design tokens
11. **Item #11** — Fix `src/components/sailing/SailingHero.tsx`: Replace hardcoded dark gradient with a theme-aware approach or document as intentionally dark

### Phase 4: Minor Fixes & Cleanup (1 hr)
12. **Item #13** — Differentiate `.badge-hot` (coral/red) from `.badge-great` (mint/green) in `globals.css`
13. **Item #14** — Delete `/frontend/` directory (it's dead code)
14. **Item #15** — Consolidate font loading: Remove redundant `<link>` tags from `layout.tsx` that duplicate `@import` in `globals.css`. Keep only the Material Symbols preload in layout.tsx (unique to that file).
15. **Item #16** — Add `.font-brand` CSS class to `globals.css` for consistency
16. **Item #18** — Decide: either migrate 3-5 key button locations to use `<Button />` component, or delete the component. Recommend: delete it since it uses cva (new dep) and most buttons are already inline.
17. **Item #12** — Document the live indicator dot pattern as intentional (coral=loading, mint=ready)
18. **Item #17** — Resolved by Items #7+#8 (shared Footer)

**Validate:** `npx next build` after each phase completes
**Stop when:** All 18 items marked complete AND build passes
