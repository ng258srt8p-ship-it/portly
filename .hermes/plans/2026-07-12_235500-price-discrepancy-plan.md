# Plan: Fix Price Discrepancy Between Deal Card and Detail Page

## Root Cause

`GET /api/deals` returns the cheapest cabin price (via `WHERE rank = 1` on the view, sorted incidentally).
`GET /api/sailing/:id` returns all cabin rows unsorted; the detail page picks `cabinBreakdown[0]` which is **not guaranteed to be the cheapest**.

The deal card shows **$2,212** (Inside cabin), detail page shows **$3,121** (Balcony cabin).

## Fix: Single source of truth for "default price"

Both the deal card and the sailing detail page should show the **cheapest cabin price** for that sailing. That way a user sees the same number everywhere.

### Step 1 — Backend: order cabin breakdown by price

In `GET /api/sailing/:id` (`server/routes/cruises.ts`), change the query to:

```sql
WHERE v.sailing_id = $1
ORDER BY v.base_fare_usd ASC
```

This ensures `cabinBreakdown[0]` is always the cheapest cabin, matching what the deal grid displays.

The `SailingHero` component uses `cabinBreakdown[0]?.raw?.totalOutTheDoor` which will now consistently be the cheapest.

### Step 2 — Backend: ensure deals grid picks cheapest cabin

The current `fetchSailingsFromDb` query uses `WHERE rank = 1` but returns **all** rows with rank=1. For sailing ID 1, both Inside ($849) and Balcony ($1,250) have rank=1. The dedup logic (`seen.set(id)`) keeps whichever row comes first.

Fix: order the query by `base_fare_usd ASC` so the cheapest row is always first:

```diff
 FROM v_out_the_door_pricing v
 WHERE v.rank = 1
+ORDER BY v.sailing_id, v.base_fare_usd ASC
```

This guarantees the dedup picks the cheapest cabin first.

### Step 3 — Verify

- Visit `/`, note the card price for a deal
- Click "View Deal" → the hero banner should show the same price
- Check a few different sailings to confirm consistency
