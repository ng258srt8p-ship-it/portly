# GOAL: UI/UX Audit Remediation — Cruise Details Page

**Date:** 2026-07-21  
**Status:** 🟡 In Progress  
**Severity:** Critical (production-facing user experience)

---

## Goal Loop Contract

```
Objective: Audit and refactor the TripTide cruise details page to eliminate all UI/UX bugs,
raw data exposure, broken logic, and visual clutter — replacing with a modern, high-converting,
accessible design.

Components affected: SailingHero, SailingInfoPanel, EnhancedDealAnalysis, EnhancedPriceForecast,
PriceComparisonTable, SailingDetailPage (page.tsx)

Constraints: No new dependencies. Keep TypeScript strict / Prettier formatting conventions.
All color changes must meet WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text).

Validate with:
  - Playwright E2E tests (visual snapshot comparisons + accessibility audits)
  - Manual visual review

Stop when: All sections (Hero, Itinerary, Sailing Details, Price History, Deal Analysis,
Cabin Pricing, Price Forecast, Competing Sailings) meet professional design standards.
```

---

## Architecture Overview

### Affected Files
| File | Component | Purpose |
|------|-----------|---------|
| `src/components/sailing/SailingHero.tsx` | SailingHero | Ship/cruise landing section |
| `src/components/sailing/SailingInfoPanel.tsx` | SailingInfoPanel | Ship metadata, sync status |
| `src/components/sailing/EnhancedDealAnalysis.tsx` | EnhancedDealAnalysis | Deal scoring, tips, costs |
| `src/components/sailing/EnhancedPriceForecast.tsx` | EnhancedPriceForecast | Forecasts, competing sailings |
| `src/components/PriceComparisonTable.tsx` | PriceComparisonTable | Cabin pricing comparison |
| `src/app/sailing/[id]/page.tsx` | SailingDetailPage | Parent page orchestrating all components |

---

## Phase Breakdown

### PHASE 1: Hero & Top Navigation — Price Clarity + Badge Improvements

**Scope:** `SailingHero.tsx`  
**Effort:** ~2 hours  
**Risk:** Low

#### 1.1 Price Context — Show Which Cabin Type the Hero Price Represents
**Root Cause:** SailingHero displays `price` without identifying cabin tier.

**Fix:**
- Pass `cabinType: string` prop to SailingHero as optional.
- Render "Starting at $X,XXX from [Cabin Type]" when cabin info available.
- If not provided, display "Starting at $X,XXX" (generic phrasing).

**Implementation plan:**
```tsx
// SailingHero.tsx — add prop
interface SailingHeroProps {
  ...existing props...
  cabinType?: string; // e.g. "Oceanview", "Interior"
}

// Usage of $price should clarify:
//   "Starting at $X,XXX from Oceanview" OR "from Interior" etc.
```

**Test plan:** Playwright test verifying hero price text contains cabin type when provided, or generic phrase when not.

---

#### 1.2 Badge Contrast and Vertical Alignment
**Root Cause:** Metadata tags (`7 Nights`, `Departs...`) use white-on-transparent backdrop-blur which can be hard to read on dark backgrounds.

**Fix:**
- Use `bg-white/20` or higher contrast for badge backgrounds.
- Add `backdrop-blur-md` and ensure text remains clearly legible (>4.5:1 ratio against background).
- Add `align-items: center` with consistent `leading-normal`.

**Test plan:** Playwright test verifying badge contrast ratios against hero background.

---

### PHASE 2: Sailing Details — Empty State Handling

**Scope:** `SailingInfoPanel.tsx`  
**Effort:** ~1 hour  
**Risk:** Low

#### 2.1 Replace Raw Hyphens with User-Friendly Fallbacks
**Root Cause:** When fields like `Total Cabins`, `Cabin Categories`, `Sync Status` are null/undefined, they render as raw `-` characters.

**Fix:**
- Replace `-` with "N/A" (Not Applicable) or "Unknown" depending on context.
- Add empty-state styling (`text-muted` with opacity) instead of plain dark text.

**Implementation plan:**
```tsx
// SailingInfoPanel.tsx — update info row generation
const infoRows = [
  ...existing rows,
];

// Replace fallback logic:
//   value: totalCabins ? totalCabins.toLocaleString() : '-'
// becomes:
//   value: totalCabins ? totalCabins.toLocaleString() : 'N/A'

// For string values: value: cabinCategories?.join(', ') || '-'
// becomes: value: cabinCategories?.join(', ') || 'Unknown'

// For sync status:
//   value: syncStatus || '-' → 'Unsynched' or similar

// For ports of call
//   value: itinerary ? `${itinerary.length} port${...}` : '-' → `0 ports`
```

**Test plan:** Playwright test verifying page renders "N/A" or "Unknown" text for each field when data is absent.

---

### PHASE 3: Deal Analysis — Visual Hierarchy & Copy Cleanup

**Scope:** `EnhancedDealAnalysis.tsx`, parent page  
**Effort:** ~3 hours  
**Risk:** Medium

#### 3.1 Visual Clutter — Standardize Card Background Palette
**Root Cause:** Multiple distinct card colors (yellow for "Why This Is a Deal", pink/rose for Hidden Cost Detector, blue for Pricing Strategy, green for Itinerary Value) create a chaotic visual hierarchy.

**Fix:**
- Unify all informational cards into a single consistent palette (white background + colored borders only).
- Remove `bg-amber-50`, `bg-emerald-50`, `bg-blue-50` — keep border colors but backgrounds become uniform white.
- Maintain severity-based border color (coral for alerts, amber for tips, indigo for intelligence) — but strip backgrounds.

**Implementation plan:**
```tsx
// All cards in EnhancedDealAnalysis.tsx
// Replace:  "bg-amber-50" → "bg-white"
// Replace:  "bg-emerald-50" → "bg-white"
// Replace:  "bg-blue-50" → "bg-white"
// Replace:  "bg-violet-50" → "bg-white"
// Replace:  "bg-indigo-mist/50" → "bg-white"
// Replace:  "bg-rose-50" → "bg-white"
// Maintain colored borders: "border-amber-100", "border-emerald-500/15" etc.
```

**Test plan:** Visual regression test verifying card backgrounds are uniform white.

---

#### 3.2 Inline Text Dump — Restructure as UI Elements
**Root Cause:** Sections like `Pricing Deep-Dive`, `Hidden Costs` render raw strings (`"Royal Caribbean. Port count: 5..."`) as flat paragraphs.

**Fix:**
- Break multi-point explanations into `<ul>` lists with individual bullet points when content includes multiple distinct facts.
- Add structured metadata (e.g., "Port count: 5" becomes inline badges or key-value pairs).
- Keep single-point explanations as `<p>`.

**Implementation plan:**
```tsx
// EnhancedDealAnalysis.tsx — modify pricingDeepDive rendering
// Replace:  <p className="...">{cleanText(data.pricingDeepDive)}</p>
// With:    A component that detects multi-fact strings and renders as a structured list.

function structurableText(text: string): boolean {
  return text.match(/\.\s+/g)?.length > 1; // heuristic: multiple sentences may need breakdown
}
```

**Test plan:** Verify that multi-sentence text renders as list items with proper semantic markup.

---

#### 3.3 CTA Buttons — Consolidate Redundant Calls-to-Action
**Root Cause:** Multiple buttons (Book Now - Great Value, View All X Cabins, sticky Book This Cruise) create redundant actions.

**Fix:**
- Keep only ONE prominent CTA on the page (Book This Cruise).
- Remove "Book Now - Great Value" and "View All X Cabins" from EnhancedDealAnalysis.
- Keep the bottom CTA as the single conversion button, but ensure it's contextually relevant.
- Consider adding a subtle secondary action (e.g., "Compare Cabins") that scrolls to cabin-pricing section instead of duplicating.

**Implementation plan:**
```tsx
// EnhancedDealAnalysis.tsx — remove CTA section
// Delete the <div> with data-testid="deal-cta" entirely.

// Page.tsx — consolidate CTA:
// Remove duplicate Book This Cruise button if not needed.
// Keep single bottom CTA with clearer labeling.
```

**Test plan:** Verify no duplicate Book buttons on page; verify CTA count = 1.

---

### PHASE 4: Cabin Pricing — Table Alignment & Math Clarity

**Scope:** `PriceComparisonTable.tsx`, parent page  
**Effort:** ~2 hours  
**Risk:** Low

#### 4.1 Table Alignment, Row Heights, and Button Overflow Prevention
**Root Cause:** Rows have variable heights; buttons can overflow/clipping on right edge (button positioned as col-span-1).

**Fix:**
- Fix row heights with consistent padding (`py-3` on all rows).
- Add `min-w-0` and `overflow-hidden` to columns.
- Constrain button widths, add `flex-shrink-0` and `shrink-0`.

**Implementation plan:**
```tsx
// PriceComparisonTable.tsx — fix CSS classes on each `<div key={tier}>`
// Replace:  "px-4 py-4 md:py-3" → "px-4 py-3" (consistent row height)
// Add:      "items-center" (vertical center alignment on grid columns)

// For action column — prevent button overflow
// Add:  "w-full flex justify-end" (full width, right-align)
// On button: "px-3 py-1.5 text-xs" (shrink properly)
```

**Test plan:** Playwright snapshot test verifying button does not overflow right edge; all rows visually consistent.

---

#### 4.2 Price Sum Breakdown — Make It Transparent
**Root Cause:** Users cannot visually connect "Base + Taxes + Gratuities" = "Total". Sum appears disconnected.

**Fix:**
- Add a vertical alignment bar between columns (like `→`).
- Show the sum inline: e.g., `Base $X,XXX + Fees $Y,YYY + Gratuities $Z,ZZZ = Total $W,WWW`.
- Alternatively, add a subtle label ("Total includes base fare + taxes + gratuities") below total column.

**Implementation plan:**
```tsx
// PriceComparisonTable.tsx — Total column enhancement
// Add helper: total = base + taxes + gratuities (verify server-side)
// Update display in mobile expanded view to explicitly show the sum.

// Mobile expansion currently has this structure — make it explicit:
<div>Base Fare: ${baseFare}</div>
<div>+ Taxes & Fees: ${taxesAndFees}</div>
<div>+ Gratuities: ${gratuities}</div>
<hr/>
<div>Total Out-The-Door: $total</div>

// Desktop column Total could show breakdown on hover.
```

**Test plan:** Verify total = base + taxes + gratuities (arithmetic assertion); tooltip on Total column shows breakdown.

---

### PHASE 5: Price Forecast — Critical Bug Fixes (Priority: HIGH)

**Scope:** `EnhancedPriceForecast.tsx`  
**Effort:** ~3 hours  
**Risk:** Medium

#### 5.1 ISO Timestamp Formatting (Critical Bug)
**Root Cause:** Competing Sailings display raw `2026-08-08T04:00:00.000Z` ISO strings instead of readable dates.

**Fix:**
- Format all `departureDate` strings in competing sailings into readable formats.
- Use: `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` → "Aug 8, 2026".
- Apply consistent formatting across all dates.

**Implementation plan:**
```tsx
// EnhancedPriceForecast.tsx — fix competing sailings render
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// In competing sailings mapping:
// Replace: <p className="text-xs text-ink-faint">Departs: {s.departureDate}</p>
// With:    <p className="text-xs text-ink-faint">Departs: {formatDate(s.departureDate)}</p>
```

**Test plan:** Playwright test verifying competing sailings display formatted dates (e.g., "Aug 8, 2026") not ISO strings.

---

#### 5.2 Negative Countdown Logic (Critical Bug)
**Root Cause:** `minutesRemaining` can go negative (`-1440 minutes`) — the math is `(lockExpiry - now)`. When expired, it's negative.

**Fix:**
- Show "expired" if `minutesRemaining < 0`.
- Show "expires in X minutes" if `minutesRemaining > 60` (longer than an hour).
- Show "expires in X hours" if `minutesRemaining > 3600` (longer than a day).
- Hide completely if well past expiry.

**Implementation plan:**
```tsx
// EnhancedPriceForecast.tsx — fix rateLock minutesRemaining handling
function formatMinutesRemaining(minutes: number): string | null {
  if (minutes < 0) return 'expired';           // already expired — hide or show "expired"
  if (minutes < 60) return `expires in ${Math.round(minutes)} minutes`;
  if (minutes < 1440) return `expires in ${Math.round(minutes / 60)} hours`;
  if (minutes < 10080) return `expires in ${Math.round(minutes / 60 / 24)} days`;
  return `expires in ${Math.round(minutes / 60 / 24 / 7)} weeks`;
}

// Apply to rateLock urgency section:
// Only show if minutesRemaining > 0 (or use "expired" state).
```

**Test plan:** Mock API with negative minutes → verify displays "expired" and not "-1440 minutes".

---

#### 5.3 Duplicate Forecast Data Across Time Windows
**Root Cause:** Same `+40.1% / 2 snapshots` rendered across 4-week, 12-week, and 24-week cards (identical values from server data).

**Fix:**
- Investigate server-side trendContext generation — each window should have unique data.
- As a defensive fix, display "—" or "No data" when magnitude is identical across windows.
- Add uniqueness heuristic in component (if first and last magnitudes differ, display normally).

**Implementation plan:**
```tsx
// EnhancedPriceForecast.tsx — add uniqueness check
const windows = data.trendContext.windows;
// Filter or annotate: if magnitude same across all windows, indicate "trend context"
// but don't duplicate identical cards.

if (new Set(windows.map(w => w.magnitude)).size === 1) {
  // Only render one card with combined info, rather than identical cards.
} else {
  // Render each window individually (unique values present).
}
```

**Test plan:** Verify no two time-window cards have identical magnitude+snapshots.

---

#### 5.4 Data Density & Contrast in Forecast Cards
**Root Cause:** Progress bars with low contrast (10% opacity) and small text make confidence percentages hard to read.

**Fix:**
- Increase contrast: `progress bar bg → bg-black/[0.12]` (from 0.1)
- Use `text-xs font-semibold` for confidence percentages (already done — just verify).
- Add visual separator between confidence bar and percentage text.

---

### PHASE 6: Global Aesthetics & Accessibility — Standardization

**Scope:** All components above (pages, components, globals.css)  
**Effort:** ~4 hours  
**Risk:** Medium (high impact on visual consistency)

#### 6.1 Standardized Spacing Scale
**Fix:**
- Use consistent padding/margin classes from Tailwind's spacing scale (`p-3`, `p-4`, `m-2` etc.).
- No ad-hoc values (e.g., `px-3.5 py-2` → normalize to `p-2` or `p-3`).

#### 6.2 Font Hierarchy
**Fix:**
- Headings (H1-H6): Use Clash Display, bold/extrabold.
- Body: Plus Jakarta Sans 14/16px.
- Caption/subtitle: text-xs or text-sm with muted color (`text-ink-faint`).
- Price/numbers: Monospace font (Geist Mono) with tabular nums.

#### 6.3 WCAG AA Color Contrast
**Fix:**
- Audit all badge text + background pairs against contrast ratio calculator.
- Badge backgrounds (`bg-amber-50`, `bg-emerald-50`, etc.) need text >= 4.5:1 contrast.
- Update muted colors to darker shades (e.g., `text-coral` → needs contrast verification).
- Hero tags (`bg-white/10` with `text-white`) need ≥4.5:1 contrast against the dark gradient background.

---

## Execution Strategy (Goal Loop)

### Phase Order
1. **Phase 5** (Price Forecast bugs) — most critical, prevents data exposure issues
2. **Phase 1** (Hero price clarity) — directly impacts conversion
3. **Phase 2** (Empty states) — quality of life fix
4. **Phase 3** (Visual clutter + CTA consolidation) — UX optimization
5. **Phase 4** (Table alignment) — conversion-critical, needs working forecast section
6. **Phase 6** (Accessibility) — wraps up all phases with audit

### Per-Phase Contract

Each phase follows this loop:
1. **Identify** — locate the specific code location for each issue.
2. **Implement** — apply fix using modular React patterns and consistent tokens.
3. **Verify** — run Playwright E2E tests (visual snapshots + behavior tests).
4. **Audit** — run `axe-core` accessibility check to ensure WCAG AA compliance.
5. **Commit** — push atomic commits with descriptive messages.

### Test Strategy
- Playwright E2E tests for each phase (written before implementation).
- Manual visual verification by team.
- Automated contrast ratio check using jest (`axe-core` integration).
- Snapshot comparison for layout changes.

---

## Deliverables Checklist (Per Phase)

| # | Phase | Deliverable |
|---|-------|-------------|
| 1 | Price Forecast bugs | ISO date formatted, countdown fixed, duplicates removed |
| 2 | Hero clarity | Cabin type shown with price, badge contrast fixed |
| 3 | Empty states | No more `-` → all fields show "N/A" or "Unknown" |
| 4 | Deal analysis | Single palette, structured text rendering, consolidated CTAs |
| 5 | Cabin pricing | Table rows uniform height, sums visually connected |
| 6 | Accessibility | WCAG AA contrast ratios verified for all badges and backgrounds |

---

## Estimation Summary

| Phase | Effort | Complexity |
|-------|--------|------------|
| 5: Price Forecast bugs (Critical) | ~3h | Medium |
| 1: Hero clarity + badges | ~2h | Low |
| 2: Empty state handling | ~1h | Low |
| 3: Deal analysis cleanup | ~3h | Medium |
| 4: Cabin pricing alignment | ~2h | Low |
| 6: Global accessibility audit | ~4h | Medium |
| **Total** | **~15 hours** | — |

---

## Notes
- Phase 6 (accessibility) should partially run in parallel with other phases as a "audit-as-you-go" approach.
- WCAG AA threshold: 4.5:1 for normal text, 3:1 for large text (≥18pt bold or ≥24pt normal).
- No new dependencies added — uses existing Tailwind + Material Icon packages.
