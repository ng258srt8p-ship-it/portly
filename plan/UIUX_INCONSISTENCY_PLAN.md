# UI/UX Inconsistency Resolution Plan

**Project:** TripTide (frontend brand: TripTide)
**Date:** July 17, 2026
**Status:** COMPLETE — All major fixes done, low-priority items remaining

**User Directives:**
- Ship icon (boat) is the logo — keep it everywhere
- Light theme is the primary theme — keep it
- Brand name is ONLY "TripTide" — delete all Portly references
- All changes verified by Playwright (`e2e/ui-consistency.spec.ts`)
- Keep dev server alive on port 3003 for browser preview

---

## Executive Summary

Deep scan of the entire `src/` directory found **18 distinct UI/UX inconsistencies** across the codebase. These range from broken CSS utilities (zero visual output) to duplicated components, color system conflicts, and font variable references that resolve to nothing. The issues create visual jank, dead CSS classes, and two conflicting design systems (Triptide Light vs. Portly Dark) mixed together without a clear hierarchy.

---

## 🔴 Critical: Broken/Non-Functional CSS

### 1. `shadow-float` and `shadow-float-lg` — Dead Classes
**Severity:** CRITICAL — Used ~80+ times, produces ZERO visual output
**Files affected:** Header.tsx, Footer.tsx, PrivacyPage, TermsPage, DisclosurePage, ContactPage, PressPage, AboutPage, CareersPage, SearchHero.tsx, FilterBar.tsx, SyncStatus.tsx, DealsGrid.tsx, ExploreDealsHero.tsx, and 15+ more
**Issue:** These are used as standard Tailwind utility classes (`className="shadow-float"`) throughout the entire codebase, but:
- They are NOT defined in `tailwind.config.ts` `boxShadow` extension
- They are NOT defined as CSS classes in `globals.css` (only as CSS custom properties `--shadow-float`)
- Result: Every card, header, and badge that should have a floating shadow has NO shadow at all
**Fix:** Add `shadow-float` and `shadow-float-lg` to `tailwind.config.ts` `theme.extend.boxShadow`

### 2. CSS Custom Properties `--font-display`, `--font-body`, `--font-mono` — Undefined
**Severity:** CRITICAL — `.font-display`, `.font-mono-tab` CSS classes produce no font-family
**Files affected:** `globals.css` (base layer), ALL pages using `font-display` or `font-mono-tab`
**Issue:** `globals.css` defines `.font-display { font-family: var(--font-display); }` and `.font-mono-tab { font-family: var(--font-mono); }` but the `:root` block never sets `--font-display` or `--font-mono` or `--font-body`. The Tailwind config defines font families correctly, but the CSS helper classes are orphaned.
**Fix:** Add `--font-display`, `--font-body`, and `--font-mono` CSS variables to `:root` and `.dark` in `globals.css`

### 3. `bg-emerald` / `bg-emerald-dark` — Not Defined
**Severity:** HIGH — Used in DealsGrid.tsx for booking button
**Files affected:** `src/components/DealsGrid.tsx` line 269
**Issue:** `bg-emerald` and `hover:bg-emerald-dark` are used as Tailwind classes but `emerald` (without a shade number) is not defined in `tailwind.config.ts`. Only Tailwind's built-in numbered palette exists (emerald-500, emerald-600, etc.).
**Fix:** Either define `emerald` as a custom color in tailwind config OR replace with project design tokens (e.g., `bg-mint` for booking CTAs)

### 4. `animate-pulse-glow` — Not Defined
**Severity:** MEDIUM — Used in `badge-price-drop` component class
**Files affected:** `globals.css` component layer (`.badge-price-drop`)
**Issue:** `@keyframes pulse-glow` is never defined in the CSS file or tailwind config. The `badge-price-drop` class references it but it produces no animation.
**Fix:** Define `pulse-glow` keyframes in `globals.css`

### 5. `border-hard-bottom` — Not Defined
**Severity:** MEDIUM — Used in CruiseCard.tsx
**Files affected:** `src/components/CruiseCard.tsx`
**Issue:** `border-hard-bottom` used as a class but not defined anywhere in CSS or Tailwind config.
**Fix:** Define in `globals.css` or replace with `border-b-2 border-hard`

---

## 🟠 High: Logo & Header Inconsistencies

### 6. Two Different Logo Icons
**Severity:** CRITICAL — Visual brand inconsistency
**Issue:**
- **Header.tsx** and **Footer.tsx** use an inline SVG wave icon (3 curved wave lines)
- Privacy, Terms, Disclosure, About, Contact, Press, Careers pages use `<MaterialIcon name="directions_boat_filled" />` (boat icon)
- **User decision: KEEP THE BOAT ICON** (`directions_boat_filled`)
**Files affected:** `src/components/layout/Header.tsx`, `src/components/Footer.tsx`
**Fix:** Replace the inline wave SVG in Header.tsx and Footer.tsx with `<MaterialIcon name="directions_boat_filled" size="sm" />`

### 7. Duplicate Header Components (7 pages)
**Severity:** HIGH — DRY violation, maintenance nightmare
**Issue:** The following pages have their ENTIRE header duplicated inline instead of using `<Header />`:
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/disclosure/page.tsx`
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/press/page.tsx`
- `src/app/careers/page.tsx`

Each has ~40 lines of duplicate header markup (nav links, logo, mobile menu, alert button). If the header changes, these 7 pages will diverge.
**Fix:** Replace inline headers with `<Header />` import + usage on all 7 pages.

### 8. Duplicate Footer Components (7 pages)
**Severity:** HIGH — Same DRY issue as #7
**Issue:** Same 7 pages above have inline footers duplicated instead of using `<Footer />`. Each footer is ~60 lines of identical markup.
**Fix:** Replace inline footers with `<Footer />` import + usage on all 7 pages.

---

## 🟡 Medium: Color System Conflicts

### 9. Two Design Systems Mixed Without Clear Hierarchy
**Severity:** HIGH — Colors look inconsistent, especially in dark mode
**Two systems coexist:**
- **Triptide Light** (default): `canvas` (#f8f9fa), `ink` (#12131a), `indigo` (#2a44e7), `mint` (#a9f3e0), `coral` (#f2a65a)
- **Portly Dark** (`.dark` class): `obsidian-*` palette, `neon-teal`, `neon-mint`, `neon-coral`, `neon-amber`, `neon-blue`
**Issue:** Both systems are defined in `tailwind.config.ts` and `globals.css` but used interchangeably. Some components reference `--color-indigo` (Triptide), others use `--neon-teal-500` (Portly). Dark mode CSS overrides exist but are incomplete.
**Fix:** Decide canonical system. Recommendation: Use Triptide tokens as the primary system for light mode, and map dark mode to Portly tokens. Unify all components to use the same token set.

### 10. Hardcoded Colors Outside Design System
**Severity:** MEDIUM — Breaks theme consistency
**Files affected:** Multiple sailing components, EnhancedDealAnalysis.tsx, EnhancedPriceForecast.tsx, CabinUpgradeTracker.tsx, CabinValueComparison.tsx
**Issue:** Throughout sailing components, colors like `bg-emerald-500`, `text-slate-500`, `text-slate-600`, `bg-slate-100`, and `#1a1b24` are hardcoded. These come from Tailwind's default palette, not the project's design tokens.
**Specific examples:**
- `EnhancedPriceForecast.tsx`: `text-slate-500`, `text-slate-600` for price direction
- `EnhancedDealAnalysis.tsx`: `bg-slate-100` for progress bars
- `SailingHero.tsx`: `via-[#1a1b24]` hardcoded dark gradient
**Fix:** Replace with design tokens: `slate-500` → `ink-faint`, `slate-600` → `ink-soft`, `slate-100` → `ink-faint/10`, etc.

### 11. SailingHero Dark Background on Light Pages
**Severity:** MEDIUM — Sailing detail page has dark hero regardless of theme
**Files affected:** `src/components/sailing/SailingHero.tsx`
**Issue:** `bg-gradient-to-br from-ink via-[#1a1b24] to-ink` with `text-white` — this is a dark-mode-only component. On a light-mode page, `ink` is `#12131a` (near-black) which works, but `text-white` on dark gives no contrast with the `ink` → `#1a1b24` gradient. The hardcoded `#1a1b24` isn't a defined token.
**Fix:** Use consistent token-based gradient, or make it theme-aware

### 12. `bg-coral` Live Indicator Dot — Inconsistent Use
**Severity:** LOW — Functional but inconsistent styling
**Files affected:** 12 locations across 7 pages + SearchHero + SyncStatus
**Issue:** The "live" indicator dot uses `bg-coral` (orange) for loading and `bg-mint-ink` (dark green) for ready. This is used everywhere but the coral color (`#f2a65a`) is the same as the "deal hot" color, creating semantic confusion.
**Fix:** Consider using `bg-coral` for loading (urgency) — this is actually correct semantically. But document it as a pattern.

### 13. `badge-hot` and `badge-great` Have Identical Styling
**Severity:** LOW — Visual distinction lost
**Files affected:** `globals.css` component layer
**Issue:** Both `.badge-hot` and `.badge-great` use `bg-coral-soft text-coral-ink border-coral-ink/15` — identical styling. A "Hot Deal" and "Great Value" badge look exactly the same.
**Fix:** Differentiate: `badge-hot` = coral/red (urgency), `badge-great` = mint/green (value)

---

## 🟢 Low: Typography & Minor

### 14. Unused Design System Files in `/frontend/`
**Severity:** LOW — Dead code
**Issue:** `/frontend/tailwind.config.ts`, `/frontend/styles/design-tokens.css`, `/frontend/styles/globals.css`, `/frontend/components/` exist as a parallel (unused) design system. The actual app uses `/src/` with its own CSS. The `/frontend/` files appear to be from a previous iteration.
**Fix:** Delete `/frontend/` directory or migrate to it as the canonical design source.

### 15. Two Font Source Systems
**Severity:** LOW — Redundant imports
**Issue:**
- `src/app/layout.tsx` loads: Syne, Plus Jakarta Sans, JetBrains Mono, Material Symbols (separate `<link>` tags)
- `src/app/globals.css` imports: Syne, Plus Jakarta Sans, JetBrains Mono, Clash Display, Inter, Geist Mono, Material Symbols (via `@import` statements)
- Plus `frontend/styles/design-tokens.css` references Clash Display, Plus Jakarta Sans, Geist Mono
**Fix:** Consolidate font loading to one place (preferably globals.css `@import` + layout.tsx minimal preload)

### 16. `font-brand` Class Reference Without CSS Definition
**Severity:** LOW — May work via Tailwind but inconsistent
**Issue:** `globals.css` uses `@apply font-brand` in `@layer base` for heading styles, and Tailwind config has `fontBrand` → but there's no explicit `.font-brand` CSS class defined. It works because Tailwind generates the utility, but the CSS class `.font-brand` is never written.
**Fix:** Either add `.font-brand` CSS class or rely solely on Tailwind utilities (consistent approach needed)

### 17. Footer Copyright Year Inconsistency
**Severity:** TRIVIAL — Dynamic vs static
**Issue:** Shared `Footer.tsx` uses `{new Date().getFullYear()}` (dynamic) but all 7 inline footers use hardcoded `© 2026 TripTide, Inc.`
**Fix:** After consolidating to shared Footer, this resolves automatically.

### 18. Button Component (`/src/components/ui/button.tsx`) Never Used
**Severity:** LOW — Dead component
**Issue:** A well-structured Button component using `cva` (class-variance-authority) exists at `src/components/ui/button.tsx` with primary/secondary/ghost/danger/outline-accent variants, but NO page or component imports it. Every button is hardcoded inline.
**Fix:** Either migrate all buttons to use `<Button />` component, or delete it to avoid confusion.

---

## Resolution Priority Order

| # | Issue | Priority | Effort | Files |
|---|-------|----------|--------|-------|
| 1 | shadow-float/lg dead classes | CRITICAL | 5 min | tailwind.config.ts |
| 2 | Undefined --font-* variables | CRITICAL | 5 min | globals.css |
| 3 | bg-emerald not defined | HIGH | 5 min | DealsGrid.tsx + tailwind.config.ts |
| 6 | Logo: replace wave SVG with boat icon | HIGH | 5 min | Header.tsx, Footer.tsx |
| 7 | Duplicate headers (7 pages) | HIGH | 30 min | 7 page files |
| 8 | Duplicate footers (7 pages) | HIGH | 30 min | 7 page files |
| 9 | Unify color systems | HIGH | 1 hr | Multiple files |
| 10 | Replace hardcoded colors | MEDIUM | 45 min | Sailing components |
| 11 | SailingHero dark/light fix | MEDIUM | 15 min | SailingHero.tsx |
| 4 | animate-pulse-glow missing | MEDIUM | 5 min | globals.css |
| 5 | border-hard-bottom missing | MEDIUM | 5 min | globals.css + CruiseCard.tsx |
| 13 | badge-hot vs badge-great | LOW | 5 min | globals.css |
| 14 | Delete unused /frontend/ dir | LOW | 5 min | filesystem |
| 15 | Consolidate font loading | LOW | 15 min | layout.tsx, globals.css |
| 16 | font-brand CSS class | LOW | 5 min | globals.css |
| 18 | Button component adoption | LOW | 30 min | All button locations |
| 12 | Live indicator pattern docs | TRIVIAL | 5 min | N/A (documentation) |
| 17 | Footer copyright year | TRIVIAL | 0 min | Resolved by #7+#8 |

**Total estimated effort:** ~3.5 hours

**Verification:** All changes validated via `npx playwright test e2e/ui-consistency.spec.ts`
**Dev server:** `npm run dev` on port 3003 (keep alive for manual audit)

---

## Post-Resolution State

After resolution:
- ✅ Single shared `<Header />` and `<Footer />` components used by ALL pages
- ✅ Single consistent boat logo icon (`directions_boat_filled`) everywhere
- ✅ All CSS utility classes functional (no dead classes)
- ✅ Unified color system (Triptide tokens for light, mapped Portly for dark)
- ✅ No hardcoded colors — all use design tokens
- ✅ Clean `/frontend/` directory removed
- ✅ Font loading consolidated
- ✅ Button component either adopted everywhere or removed
