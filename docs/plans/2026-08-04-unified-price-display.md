# Unified Price Display Plan

**Goal:** Make every dollar amount on each sailing page derive from one canonical source so the 4-way price contradiction ($759 hero, $759 cabin table, $898 ship-value, $982 hidden-cost) disappears for every user.

**Architecture:** The sailing detail API will expose a single "listed price" — the Inside cabin's `totalOutTheDoor` from `cabinBreakdown[0]`. All frontend components and deterministic worker-side insight text will derive from that same number instead of hardcoded constants and the raw `sailings.price` column.

**Tech:** Existing stack only. No new libs. Changes in:
- `workers/src/index.ts` (deterministic insight generator + API response)
- `src/components/sailing/SailingHero.tsx` (minor alignment)
- `src/components/sailing/SailingKeyTakeaways.tsx` (use canonical price)
- `src/components/sailing/EnhancedDealAnalysis.tsx` (use canonical price + actual cabin values)
- `src/components/sailing/HiddenCostDisplay.tsx` (use canonical price)

---

## Gate Table

| Gate | Check | Command / Evidence | Pass Condition |
|------|-------|-------------------|----------------|
| G1 | Build compiles | `cd /Users/georgetozer/Development/Portly && pnpm run build` exit 0 | exit 0 |
| G2 | Worker deploys | `cd workers && npx wrangler deploy` exit 0 | exit 0 |
| G3 | Real-data filter unchanged | `curl …/api/deals | jq 'length'` | `18` (no expander/bulk-import) |
| G4 | Pages deploy | `npx wrangler pages deploy out --project-name=portly` exit 0 | exit 0 |
| G5 | Full Playwright green | `BASE_URL=<preview> npx playwright test --project=chromium` | 0 failed |
| G6 | Price-consistency spot-check | `node scripts/audit.js` prints 4 equal numbers per sampled sailing | all equal |

---

## Phase 1 — Worker: canonical price in sailing detail response

### Task 1.1: Add `listedPrice` to `/api/sailing/:id`

**File:** `workers/src/index.ts` (around line 1195–1203)

**Root Cause:** The API returns `s.price` (raw DB column) but `cabinBreakdown[0]` already contains the Inside cabin's real `totalOutTheDoor`. Those two numbers differ (e.g. $588 vs $759 on Splendor).

**Step 1:** After `cabinBreakdown` is built, derive:

```ts
const listedCabin = cabinBreakdown?.[0] ?? null;
const listedPrice = listedCabin ? Math.round(listedCabin.totalOutTheDoor) : Math.round(price || 0);
const originalListedPrice = listedCabin
  ? Math.round((listedCabin as any).baseFarePerPerson + (listedCabin as any).portTaxPerPerson + ((listedCabin as any).gratuityPerPersonPerNight || 0) * nights)
  : Math.round(originalPrice || price || 0);
```

**Step 2:** Include `listedPrice` and `originalListedPrice` in the JSON response returned by `/api/sailing/:id`.

### Task 1.2: Fix deterministic insight generator to use cabin values

**File:** `workers/src/index.ts` (around lines 1196–1250, the `generateInsiderAnalysis` function)

**Current bug lines:**
```ts
const totalCost = Math.round(price + 180 + nights * 18.5);  // line 1202
const gratuities = 18.5 * days;                               // line 196
const portFees = 180;                                         // line 197
const wifiCost = 12 * days;                                   // line 198
const realTotalCost = Math.round(price + portFees + gratuities + wifiCost);  // line 199
```

**Fix:** Replace `price` with `listedPrice`, and compute gratuities / fees from the actual first cabin row when available:

```ts
const listed = cabinBreakdown?.[0] ?? null;
const baseFare     = listed ? listed.baseFarePerPerson  : price;
const portFees     = listed ? listed.portTaxPerPerson    : 180;
const gratuityRate = listed ? listed.gratuityPerPersonPerNight : 18.5;
const gratuities   = gratuityRate * days;
const wifiCost     = 12 * days; // Starlink Social estimate — acceptable constant
const realTotalCost = Math.round(baseFare + portFees + gratuities + wifiCost);
const totalCost     = Math.round(baseFare + portFees + gratuities);
```

Update `perNight` to `Math.round(totalCost / days)` so the "per night" figure matches the OTD total, not the raw base fare.

---

## Phase 2 — Frontend: every component reads from the same canonical price

### Task 2.1: SailingKeyTakeaways per-night

**File:** `src/components/sailing/SailingKeyTakeaways.tsx`

**Current:** receives `price` and computes `price / days` (base-fare per-night).  
**Fix:** prefer the new `listedPrice` prop; fall back to `price || perNight * days`.

### Task 2.2: EnhancedDealAnalysis hidden-cost block

**File:** `src/components/sailing/EnhancedDealAnalysis.tsx` (lines 112, 195-199)

**Current:** uses `price + 180 + 18.5*days + 12*days`.  
**Fix:** allow `context.listedPrice` and `context.nights` to override; remove hardcoded 18.5 / 180 constants. Derive from `cabinBreakdown?.[0]` when passed in context.

### Task 2.3: HiddenCostDisplay listedPrice

**File:** `src/components/sailing/HiddenCostDisplay.tsx` (line 45)

**Current:** `const realTotal = costs.realTotalCost || totalListed + mandatoryGratuities + wifiCost;`  
**Fix:** use `costs.realTotalCost` when present (matches the corrected worker value), otherwise derive from `listedPrice`.

### Task 2.4: SailingHero alignment check

**File:** `src/components/sailing/SailingHero.tsx` (line 86)

**Status:** Already uses `otdTotalPerPerson` from `cabinBreakdown[0]`. No structural change needed. Only verify it receives the same `cabinBreakdown` whose `totalOutTheDoor` is now guaranteed correct.

---

## Phase 3 — Add regression test

### Task 3.1: Price-consistency Playwright test

**New file:** `e2e/price-consistency.spec.ts`

Test that on any real scraper sailing detail page:
1. Hero headline price === cabin-table Inside total
2. Deal Score "per night" figure === hero price ÷ nights (integer math)
3. Hidden Cost "Real Total Cost" is within ±$1 of hero price + Wi-Fi + gratuities

### Task 3.2: Re-run full suite

**Command:**
```bash
cd /Users/georgetozer/Development/Portly && BASE_URL=https://portly-1i0.pages.dev npx playwright test --project=chromium
```
**Pass:** 0 failed.

---

## Rollback

```bash
git revert HEAD~3..HEAD   # revert the 3 commits implementing this plan
```
