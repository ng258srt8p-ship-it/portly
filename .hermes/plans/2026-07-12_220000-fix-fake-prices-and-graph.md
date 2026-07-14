# Plan: Fix Fake Original Price & Fake Price History Graph

## Problem

Two pieces of `/api/deals` response data are purely `Math.random()`-generated:

1. **`originalPrice`** (line 449 of `cruises.ts`): `Math.round(financials.totalOutTheDoor * (1.1 + Math.random() * 0.35))` — every refresh computes a different "strikethrough" price.

2. **`history`** (lines 458-465 of `cruises.ts`): Random walk from 85-115% of base price with random fluctuation — every refresh shows a completely different "90-day trend" sparkline.

The DB already has real price history data (`pricing_history` table, populated by a trigger on `pricing_snapshots` INSERT). After NIM syncs, each sailing has 3-4 cabin snapshots with `total_usd` values. The `v_price_trends` view surfaces this data ordered by date.

## Solution

Replace the two `Math.random()` blocks with queries against the real `pricing_history` table and the existing `v_price_trends` view.

### Task 1: Fetch real originalPrice from DB

Add a query to the `/api/deals` handler that gets the highest historical price per sailing:

```sql
SELECT MAX(total_usd) as max_price
FROM pricing_history
WHERE sailing_id = $1
```

`originalPrice = max_price || current_price` (fallback to current if no history)

`dropPercent` becomes real: `((originalPrice - currentPrice) / originalPrice) * 100`

### Task 2: Fetch real price history for sparkline

Query `v_price_trends` view for the sailing's price data points:

```sql
SELECT total_usd, recorded_date
FROM v_price_trends
WHERE sailing_id = $1 AND cabin_type = $2
ORDER BY recorded_date ASC
```

`history` array becomes the actual recorded prices, in chronological order.

After only 1 sync run, each sailing may have only 1 data point per cabin class (the sparkline shows as a single dot). After 2+ syncs, the trend line will grow organically. This is correct — real data takes time to accumulate.

Alternative: For the initial state (only 1 sync), we could use NIM to generate plausible price history trajectories. But that's scope creep — real accumulated data is more honest and will look correct after 2-3 sync cycles.

### Task 3: Ensure each NIM sync produces different prices

Currently the NIM pricing generator (`generatePricingForSailings` in `nimSyncGenerator.ts`) uses temperature 0.4. Each sync click already produces different ships/routes — but does it produce different prices for the same sailing on subsequent syncs?

Check: if the same sailing ID exists in the DB, subsequent syncs should insert NEW pricing snapshots with DIFFERENT prices. The NIM generator's temperature 0.4 should produce varied pricing per sync.

Fix: in `hybridEngine.ts`'s `runStealthCheckouts()` Phase 2, ensure the NIM pricing generator is called with fresh random seed (it already has temperature 0.4, so it should). If the same sailing gets new pricing on each sync, the history graph will show real downward/upward trends.

### Task 4: Update Deal type in frontend

Check if `Deal` type (`src/types/cruise.ts`) needs updating — `history` is already typed as `number[]` and `originalPrice` as `number`, so no type changes needed.

## Files Changed

| File | Change |
|---|---|
| `server/routes/cruises.ts` | Replace Math.random() for originalPrice + history with DB queries |
| `server/services/nimSyncGenerator.ts` | Verify pricing variation per sync (temp 0.4 should suffice) |

## Verification

1. `npm run build` — pass
2. `npm run vitest` — 27/27 pass
3. `npx playwright test` — 18/18 pass
4. `curl /api/deals` — originalPrice is stable across calls, history matches DB data
5. Hit refresh 3x — verify originalPrice does NOT change
6. Trigger sync → verify new prices appear in history
