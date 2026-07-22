# Component Library Documentation — TripTide (Portly)

## Overview

TripTide is a React SPA built on Vite + TypeScript with Tailwind CSS. It implements several domain-specific components for a cruise fare tracking platform.

## Core Components

### `Header` (src/components/Header.tsx)
**Purpose:** Site-wide navigation with mobile menu toggle and "Price Alerts" CTA.

**Pattern:**
- Skip-to-content link for keyboard navigation (`skip-to-content` class + `aria-label="Skip to main content"`)
- Mobile toggle button uses `aria-expanded` attribute toggled with state, `aria-label="Toggle navigation"`
- Nav links use `aria-current="page"` when active
- "Price Alerts" button and mobile menu items have dedicated click handler (`handleAlertsClick`)

**Accessibility compliance:**
- ✅ aria-label on toggle button (aria-expanded)
- ✅ aria-current on active nav link
- ✅ Nav wrapper has `role="navigation" aria-label="Main navigation"` (desktop) and `role="navigation" aria-label="Mobile navigation"` (mobile)
- ✅ Skip-to-content link present

**Known TODO:** Alert button has CTA but no functional handler — should navigate to `/alerts` page.

---

### `Hero` (src/components/Hero.tsx)
**Purpose:** Search/filter deck at top of landing page.

**Pattern:**
- Dropdown components (`Dropdown`) used for Destination/Cruise Line filters — these accept `aria-label` with `${label} filter (current: ${value})`
- Passengers counter uses `aria-label="Decrease passengers"` and `aria-label="Increase passengers"` buttons flanking a counter display
- "Search Voyages" CTA button with `aria-label="Search voyages"`

**Accessibility compliance:** ✅ aria-labels on all interactive controls

---

### `DealsGrid` (src/components/DealsGrid.tsx)
**Purpose:** Displays curated cruises loaded from static JSON (live API simulated).

**Pattern:**
- Cards with "View Deal" buttons labeled `aria-label="View deal — ${cruiseLine} ${ship}"`
- Skeleton cards used during loading states (`DealCardSkeleton`)

**Known TODO:** View Deal buttons are static, no real CTA — should link internally to `/sailing/:id`

---

### `ComparisonMatrix` (src/components/ComparisonMatrix.tsx)
**Purpose:** Transparent breakdown of cabin fares, taxes, gratuities across cruise lines.

**Pattern:**
- Table component with interactive "View Analytics Deal" buttons labeled `aria-label="View analytics deal — ${cabinClass} in ${cruiseLine}"`
- Passengers toggle (`+` / `-`) controls dynamically recalculate total via `passengers: number` state

**Accessibility compliance:** ✅ aria-labels on buttons within table cells

**Known TODO:** Graph render issue (PriceTrajectoryChart → null), should display "Loading" state; enhancedDealAnalysis data flow from API to UI needs fixing.

---

### `Dropdown` (src/components/Dropdown.tsx)
**Purpose:** Reusable dropdown filter in search deck.

**Pattern:**
- `aria-label` with context `${label} filter (current: ${value})` 
- Role `group` on container
- Keyboard accessible — options inside dropdown are `type="button"` elements

---

### `SyncStatus` (src/components/SyncStatus.tsx)
**Purpose:** Visual indicator of live data sync status.

**Pattern:**
- "Refresh live fares" button with `aria-label="Refresh live fares"` and `disabled` state
- Live clock via interval (`window.setInterval`)

---

### `TrustStrip` (src/components/TrustStrip.tsx)
**Purpose:** Social proof strip with stats.

---

### `Sparkline` (src/components/Sparkline.tsx)
**Purpose:** Mini price history chart within deals cards.

---

## Shared Design System

### CSS Custom Properties (`src/index.css`)
| Token | Value | Purpose |
|-------|-------|---------|
| `--color-canvas` | `#f8f9fa` (light) / `#0f1115` (dark via media query) | Page bg |
| `--color-ink` | `#12131a` (light) / `#f0f1f5` (dark) | Primary text |
| `--color-indigo` | `#2a44e7` | Brand/accent |
| `--shadow-float` | soft popup shadow | Card/card-group backgrounds |
| `--font-display` | "Syne" (headings) | Visual emphasis |
| `--font-body` | "Plus Jakarta Sans" (body) | Readability |
| `--font-mono-tab` | "JetBrains Mono" (tabular numbers) | Prices, dates |

### Color Semantic Map
| Token | Light | Dark (via media query) | Use |
|-------|-------|----------------------|-----|
| `--color-mint` | `#a9f3e0` | `#6bd9c4` (light) | Price drop, success |
| `--color-mint-ink` | `#0b6b57` | — | Text on mint bg |
| `--color-coral` | `#f2a65a` | `#f8c68b` (light) | Price rise, warning |
| `--color-coral-ink` | `#8a4e0f` | — | Text on coral bg |

### Dark Mode
Implemented via `@media (prefers-color-scheme: dark)` in index.css. Inverts canvas, ink, and adjusts shadows.

---

## Accessibility Compliance (Phase 2 Verification via Playwright)

All tests pass — see `tests/accessibility.spec.ts` for exact assertions. Summary of implementations:
- ✅ Skip-to-content link (`a.skip-to-content`), off-screen by default, visible on focus
- ✅ aria-labels on all interactive elements (Header toggle, Hero search/passes/alert buttons, Dropdown labels, Sync refresh button)
- ✅ aria-expanded on toggle elements (mobile nav)
- ✅ aria-current="page" on active nav links (Header)
- ✅ role="navigation" aria-label wrapper for desktop/nav menus
- ✅ No "#"-only links (all nav links use internal `/` routes)
- ✅ aria-labels on all visible button elements without text

---

## Performance / Rendering Notes
- `useLiveData` hook (src/hooks/useLiveData.ts) polls simulated API every 45 seconds with `fetcher` factory
- Component `ComparisonMatrix` has known issues: PriceTrajectoryChart returns null when cabinForecasts data is missing (graph rendering); EnhancedDealAnalysis/EnhancedPriceForecast require backend API fixes
- Mobile nav toggle bug (header mobile menu) — resolved in Phase 3
- Skeleton loading states (`DealCardSkeleton`, `RowSkeleton`) used during data fetch

---

## Known TODOs (Phase 4 polish remaining)
1. Graph rendering fallback for missing cabinForecasts → "Loading" state
2. AlertsPage (if it exists) — needs back-end alert submission handler
3. Price history graph — data flow fix from live API
4. Component library docs (ongoing)
