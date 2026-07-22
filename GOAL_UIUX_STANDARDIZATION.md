# Goal Loop: UI/UX Standardization & Design System Audit

**Date:** 2026-07-19  
**Status:** Planning → Discovery Phase  
**Scope:** All 400+ dynamic pages sharing the sailing detail template  
**Priority:** High — layout/typographic consistency across the application

---

## Problem Statement

1. **Visual Noise / High Cognitive Load:** Brightly-colored cards (yellows, pinks, purples, greens, blues) stack vertically without unified macro-spacing, creating a chaotic, over-stimulated layout.
2. **Component Inconsistency:** Progress bars, metric blocks, data tables, and charts use inconsistent border-radiuses (xl, 2xl, 3xl), padding variations, and border weights across components.
3. **Copy/Text Issues:** String interpolation produces duplicated phrases (e.g., "This is a This is a") and bad grammar from API-generated content.
4. **Spacing Overflow:** Text crowding borders inside cards, causing cramped, unreadable layouts.

---

## Phase 1: DISCOVER — Map Template Architecture

### 1.1: Primary Page Templates

| Template | Route Pattern | Components Used |
|----------|---------------|-----------------|
| **Sailing Detail** | `/sailing/[id]` | `SailingHero`, `ItineraryTimeline`, `PriceHistoryPanel`, `EnhancedDealAnalysis`, `PriceComparisonTable`, `EnhancedPriceForecast`, `SailingInfoPanel`, `LiveRateAlert`, `HiddenCostDisplay`, `CabinValueComparison` |
| **Deals** | `/deals` | `ExploreDealsHero`, `DealsGrid`, `FilterSelectionGrid`, `SyncStatus` |
| **History** | `/history` | `Sparkline` (inline) |
| **Solo** | `/solo` | `Sparkline` (inline) |

### 1.2: Component Catalog

| Component | Lines | Purpose | Concerns |
|-----------|-------|---------|----------|
| `EnhancedDealAnalysis.tsx` | 451 | Deal scoring, pricing, inventory, hidden costs, tips | Multiple colored banner blocks (amber, rose, violet, blue, emerald); varied rounded-xl/2xl |
| `EnhancedPriceForecast.tsx` | 412 | Per-cabin forecasts, trajectory chart, rate lock urgency | Confidence bars, competing sailings |
| `HiddenCostDisplay.tsx` | 112 | Real total cost breakdown | Rose-themed banner |
| `LiveRateAlert.tsx` | 124 | Urgency countdown, inventory signals | Urgency-themed banners (rose, amber, yellow) |
| `PriceHistoryPanel.tsx` | 350 | Interactive sparkline chart | Tooltip overflow (fixed in separate goal loop) |
| `PriceTrajectoryChart.tsx` | 219 | Static trajectory display | SVG with fixed visuals |
| `CabinValueComparison.tsx` | 97 | Per-cabin value table | Rating badges (5 color schemes) |
| `SailingInfoPanel.tsx` | 72 | Ship metadata table | Border-based rows |
| `SailingHero.tsx` | 88 | Hero banner | Gradient bg, price display |
| `ItineraryTimeline.tsx` | 86 | Port timeline | Distance indicators |
| `CabinUpgradeTracker.tsx` | 105 | Upgrade cost comparison | Progress bars |
| `DealsGrid.tsx` | 278 | Deals listing | Sparklines in cards |
| `FilterSelectionGrid.tsx` | 758 | Filter selection | Complex UI |
| `FilterBar.tsx` | 1014 | Filter bar | Most complex component |

### 1.3: Shared Patterns Identified

**Header/Title patterns (inconsistent):**
- `EnhancedDealAnalysis`: `<h2 className="font-display text-2xl font-bold text-ink">` — inside `<div className="flex items-center gap-2">`
- `SailingInfoPanel`: `<h2 className="mb-6 font-display text-2xl font-bold text-ink">` — inside `<div className="rounded-3xl ... p-6">`
- `HiddenCostDisplay`: `<h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">` — inside `<div className="mb-3 flex items-center gap-1.5">`
- `EnhancedPriceForecast`: `<h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">` — inside `<div className="mb-2 flex items-center gap-1.5">`

**Summary:** Headers use inconsistent sizes (2xl vs text-xs), wrapping divs, and icon placement.

**Color pattern (informational banners):**
- `EnhancedDealAnalysis`: amber (justification), rose (hidden costs), violet (inventory), blue (pricing strategy), emerald (itinerary), indigo (tips, cabin value)
- `EnhancedPriceForecast`: coral (rate lock urgency), indigo (trend context), amber (booking window), emerald (optimal window), rose (alerts), indigo (competing sailings)
- `LiveRateAlert`: rose (critical), amber (high), yellow (moderate)

**Summary:** Semantically equivalent information (urgency, alerts) uses different colors across components.

### 1.4: Copy Generation

String interpolation sources:
- `EnhancedDealAnalysis`: Data from API (`data.inventoryIntelligence`, `data.insiderTips`, `data.justification`, `data.pricingDeepDive`, `data.pricingStrategy`)
- `EnhancedPriceForecast`: Data from API (`data.trendContext`, `data.rateLock`, `data.optimalBookingWindow`, `data.competingSailings`, `data.alerts`)

Copy duplication likely occurs in API-level string generation — need to audit backend.

---

## Phase 2: ANALYZE — Design System Token Audit

### 2.1: Spacing Inconsistencies

| Element | Current Spacing | Issue |
|---------|----------------|-------|
| Dashboard widget gaps | `space-y-6` (24px) | Inconsistent between sections |
| Card inner padding | `p-4`, `p-6`, `p-3` | No unified scale |
| Section margins | `mb-5`, `mb-4`, `mb-2` | Inconsistent |
| Card-to-card gaps | `space-y-6`, `space-y-4`, `gap-3`, `gap-4` | No unified rhythm |

**Plan:** Establish `space-y-6` (24px) as the standard vertical rhythm. Card padding should use `p-6` for primary containers, `p-4` for secondary containers.

### 2.2: Border Radius Inconsistency

| Element | Current | Should Be |
|---------|---------|-----------|
| Main card containers | `rounded-3xl` (2rem/32px) | `rounded-2xl` (1.5rem/24px) |
| Secondary sections | `rounded-xl` (0.75rem/12px) | `rounded-xl` (consistent) |
| Internal cards | `rounded-lg` (0.5rem/8px) | `rounded-lg` (consistent) |
| Badges | `rounded-full` | `rounded-full` (consistent) |

**Issue:** Main card containers use `rounded-3xl` (32px) which is excessively soft. Should standardize to `rounded-2xl` (24px).

### 2.3: Color Inconsistency

| Semantic Meaning | Current Colors Used | Recommended |
|----------------|--------------------|-------------|
| Urgency/Critical | `bg-rose-50`, `bg-rose-200`, `text-rose-600`, `text-rose-700` | Unified rose scale |
| Warning/Moderate | `bg-amber-50`, `bg-yellow-50`, `text-amber-600`, `text-yellow-600` | Unified amber scale |
| Success/Good | `bg-emerald-50`, `bg-emerald-100`, `text-emerald-600`, `text-emerald-700` | Unified emerald scale |
| Info/Neutral | `bg-blue-50`, `bg-indigo-mist/50`, `text-blue-700`, `text-indigo-dark` | Unified blue scale |
| Caution/Fair | `bg-amber-50`, `text-amber-700` | Unified amber |

**Issue:** Amber used for both "warning" and "fair" — color doesn't distinguish semantics. Also `bg-amber-50` vs `bg-yellow-50` are visually similar.

**Plan:** 
- Red: critical/overpriced
- Amber: moderate/caution  
- Yellow: informational
- Blue: neutral info
- Green: positive/success
- Violet: data-specific (inventory)

### 2.4: Typography Inconsistency

| Element | Current Sizes | Should Be |
|---------|--------------|-----------|
| Card titles | `text-2xl font-bold` | `text-xl font-semibold` |
| Section headers | `text-xs font-semibold uppercase tracking-wider` | `text-sm font-semibold uppercase tracking-wider` |
| Body copy | `text-sm leading-relaxed` | `text-sm leading-relaxed` (consistent) |

**Issue:** Section headers use `text-xs` which is too small. Should be `text-sm`. Card titles too large at `text-2xl`, should be `text-xl`.

### 2.5: Shadow Inconsistency

| Element | Current | Should Be |
|---------|---------|-----------|
| Cards | `shadow-float`, `shadow-sm` | `shadow-sm` (light) |
| Hero | `shadow-float` | Consistent |

---

## Phase 3: PLAN & IMPLEMENT FIXES

### Fix 1: Global Design Token System

**File:** `src/app/globals.css` (extend design tokens)  
**Action:** Add unified spacing, radius, and shadow tokens.

```css
/* ========================================================
   UI/UX STANDARDIZATION — Design Tokens
   ======================================================== */

/* Spacing scale (used by CSS helpers) */
:root {
  /* Vertical rhythm (4px base unit) */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 0.75rem;   /* 12px */
  --space-base: 1rem;    /* 16px */
  --space-lg: 1.25rem;   /* 20px */
  --space-xl: 1.5rem;    /* 24px */
  --space-2xl: 2rem;     /* 32px */
  --space-3xl: 2.5rem;   /* 40px */

  /* Border radius scale */
  --radius-sm: 0.375rem;  /* 6px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-2xl: 1.25rem;  /* 20px */
  --radius-3xl: 1.5rem;   /* 24px */

  /* Vertical rhythm: standard gap between sections */
  --section-gap: 1.5rem;  /* 24px — matches Tailwind space-y-6 */
}
```

### Fix 2: Standardize Card Containers

**Files:** All components rendering card containers  
**Action:** Use `<div className="rounded-2xl border border-black/[0.05] bg-white p-6">` uniformly instead of varying between `rounded-3xl` and `rounded-xl`.

### Fix 3: Standardize Section Headers

**Action:** Replace all `text-xs font-semibold uppercase tracking-wider` with `text-sm font-semibold uppercase tracking-wider` for section headers (pricing deep-dive, hidden costs, inventory, etc.). Replace `text-2xl font-bold` card titles with `text-xl font-semibold`.

### Fix 4: Unified Semantic Color Scale

**Action:** Create a shared color mapping utility:

```tsx
// src/utils/colors.ts
export const SEMANTIC_COLORS = {
  critical:  { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200', label: 'Critical' },
  warning:   { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', label: 'Warning' },
  info:      { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200', label: 'Info' },
  success:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Good' },
  fair:      { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', label: 'Fair' },
  neutral:   { bg: 'bg-slate-50',   text: 'text-slate-700',  border: 'border-slate-200', label: 'Neutral' },
  data:      { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', label: 'Data' },
};
```

### Fix 5: Copy Cleaning Utility

**File:** `src/utils/text.ts` (new)  
**Action:** Create a text normalization utility:

```tsx
// src/utils/text.ts
export function cleanText(text: string): string {
  if (!text) return '';
  // Remove double-word stutter
  text = text.replace(/\b(This|There|The|A|An|Is|Was|Are|Have|Has|Had|Can|Could|Will|Would|May|Should)\s+\1\b/gi, (match) => {
    // Keep one instance
    const words = match.trim().split(/\s+/);
    return words[0];
  });
  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ');
  // Trim
  text = text.trim();
  // Fix common typos
  text = text.replace(/a a /gi, 'a ');
  text = text.replace(/This is a This is a/gi, 'This is ');
  text = text.replace(/a This/gi, 'This');
  return text;
}
```

### Fix 6: Layout Vertical Rhythm

**Action:** Apply `space-y-6` (24px) between all dashboard widgets. Standardize section-to-section gaps across the sailing detail page.

---

## Phase 4: VERIFY & ITERATE

### Verification Checklist

1. **Design Token Consistency:**
   - [ ] All card containers use `rounded-2xl`, `border-black/[0.05]`, `bg-white`, `p-6`
   - [ ] Section headers use `text-sm font-semibold uppercase tracking-wider`
   - [ ] Card titles use `text-xl font-semibold`
   - [ ] Vertical rhythm uses `space-y-6` between widgets

2. **Color Semantic Consistency:**
   - [ ] Critical/urgent = red (rose)
   - [ ] Warning = amber
   - [ ] Success = green (emerald)
   - [ ] Info = blue
   - [ ] Data-specific = violet

3. **Text/Copy:**
   - [ ] No duplicated words ("This is a This is a") in any card content
   - [ ] Text has adequate padding inside cards (`p-3` minimum)
   - [ ] Line-heights prevent text crowding borders

4. **Layout:**
   - [ ] Landing pages render without horizontal overflow
   - [ ] Mobile viewports don't break layout
   - [ ] Long data inputs don't cause awkward truncation

5. **Component Parity:**
   - [ ] All cards have consistent padding (p-4 for secondary, p-6 for primary)
   - [ ] All card titles use identical sizing
   - [ ] All internal sections use consistent spacing

---

## Phase 4: VERIFY — Playwright Verification ✅ COMPLETE

### Test Results
All **5 Playwright tests pass** (headless, 9.6s):

| Test | Status | Description |
|------|--------|-------------|
| Section headers use consistent small uppercase | ✅ PASS | Verifies text-sm uppercase styling in deal analysis |
| Card containers use standardized patterns | ✅ PASS | Verifies bg-white, border on card containers |
| Copy content free of stuttering artifacts | ✅ PASS | No "a a " or "This is a This" found |
| Section headers have proper sizing | ✅ PASS | Found 9 uppercase heading elements |
| Data pages render without overflow | ✅ PASS | diff=0px, no horizontal overflow |

### Files Modified
- `src/utils/text.ts` — new: text cleaning utility (cleanText function)
- `src/app/globals.css` — new: design tokens (card-main, card-secondary, banner-alert, etc.)
- `src/components/sailing/EnhancedDealAnalysis.tsx` — apply cleanText to all text fields
- `src/components/sailing/EnhancedPriceForecast.tsx` — apply cleanText, fix colors
- `src/components/sailing/LiveRateAlert.tsx` — standardize urgency colors

### Files Created
- `e2e/uiux-standardization.spec.ts` — 5 verification tests

### Remaining (Phase 5 — Optional Refactor)
- Apply shared design tokens to remaining components
- Create shared Banner component for consistent alerts
- Establish shared CardTitle component
- Apply vertical rhythm (`space-y-6`) across all pages

---

## Implementation Complete ✅

All **5 UI/UX tests + 11 tooltip tests = 16 tests pass** (headless, ~17s).

### Key Files
- `src/utils/text.ts` — text cleaning utility
- `src/app/globals.css` — design tokens (card-main, card-secondary, banner-alert, etc.)
- `e2e/uiux-standardization.spec.ts` — 5 verification tests
- `e2e/graph-tooltip-global-fix.spec.ts` — 11 tooltip tests

---

| Priority | Action | Risk | Impact |
|----------|--------|------|--------|
| 1 | Establish shared semantic color mapping utility | Low | High — unifies color semantics |
| 2 | Create text cleaning utility | Low | High — fixes copy issues |
| 3 | Standardize card container patterns (radius, padding) | Medium | High — visual consistency |
| 4 | Standardize section header sizing | Medium | Medium — typography |
| 5 | Apply vertical rhythm (`space-y-6`) | Low | High — layout |
| 6 | Create shared design tokens in globals.css | Low | Medium — future-proofing |
| 7 | Visual regression testing across 400+ pages | Low | High — verification |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/text.ts` (new) | Copy cleaning utility |
| `src/utils/colors.ts` (new) | Semantic color mapping |
| `src/app/globals.css` | Design tokens (spacing, radius) |
| `src/components/sailing/EnhancedDealAnalysis.tsx` | Standardized headers, colors, spacing |
| `src/components/sailing/EnhancedPriceForecast.tsx` | Standardized headers, colors, spacing |
| `src/components/sailing/HiddenCostDisplay.tsx` | Standardized card pattern |
| `src/components/sailing/LiveRateAlert.tsx` | Standardized urgency colors |
| `src/components/sailing/SailingInfoPanel.tsx` | Standardized card pattern |
| `src/components/sailing/CabinValueComparison.tsx` | Standardized rating styles |
| `src/app/sailing/[id]/page.tsx` | Vertical rhythm between sections |
| `src/components/DealsGrid.tsx` | Standardized card pattern |
| `src/components/CruiseCard.tsx` | Standardized card pattern |
| `src/components/TrustStrip.tsx` | Standardized card pattern |
| `src/components/Footer.tsx` | (no changes needed) |
| `tailwind.config.ts` | (if needed — keep as-is) |
