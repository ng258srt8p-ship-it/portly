# Plan: Interactive Cabin-Type Graph Switching on Sailing Detail Page

## Goal

Allow users to click on any cabin type's price card (e.g. "$2,021" for Oceanview, "$3,280" for Balcony) and see that cabin type's price history sparkline update in real time — without reloading the page.

## Current State

- **`/api/sailing/:id`** returns `priceHistory` filtered to only the **cheapest cabin type** (query has `WHERE cabin_type::TEXT = $2`).
- **`PriceHistoryPanel`** receives this single-cabin history and renders one sparkline.
- The cabin price cards at the bottom of the panel are **static** — they show prices but aren't clickable.
- The user sees the cheapest cabin's sparkline and cannot explore other cabin types' trends without a different sailing query.

## Task 1: Backend — Return All Cabin Types' History

### What to change

**File:** `server/routes/cruises.ts` (line ~363–370)

Remove the `AND cabin_type::TEXT = $2` filter from the pricing history SQL query so the API returns **all** cabin types' history for the sailing. The query becomes:

```sql
SELECT recorded_date::TEXT, cabin_type::TEXT, passenger_count, total_usd
FROM pricing_history
WHERE sailing_id = $1
ORDER BY recorded_date ASC, passenger_count ASC
```

The response now includes entries for Interior, Oceanview, Balcony, and Suite — each with their own 6 data points (3 dates × 2 passenger counts).

### Why this is sufficient

The `PriceHistoryPanel` already receives the full `priceHistory` array. After this change, that array will contain history for every cabin type. The frontend will filter it client-side by the selected cabin type.

### Verification

```bash
curl -s http://localhost:3001/api/sailing/1049 | python3 -c "
import json,sys; d=json.load(sys.stdin)
types = set(p['cabin_type'] for p in d['priceHistory'])
print(f'Cabin types in history: {types}')
for t in sorted(types):
    pts = [(p['recorded_date'], p['total_usd']) for p in d['priceHistory'] if p['cabin_type']==t]
    print(f'  {t}: {len(pts)} points')
"
```

Expected: 4+ cabin types, each with 6 data points.

---

## Task 2: Frontend — Make Cabin Cards Clickable with State

### What to change

**File:** `src/components/sailing/PriceHistoryPanel.tsx`

### Sub-tasks

#### 2a. Add `selectedCabinType` state

```tsx
const cabinTypes = [...new Set(priceHistory.map((s) => s.cabin_type))];
const [selectedCabinType, setSelectedCabinType] = useState<string>(
  cabinTypes.includes(cheapestCabinType) ? cheapestCabinType : cabinTypes[0]
);
```

This defaults to the cheapest cabin type (same as current behaviour) but lets the user switch.

#### 2b. Filter sparkline data by selected cabin type

Replace the `sparkValues` computation to filter by `selectedCabinType`:

```tsx
const sorted = [...priceHistory]
  .filter((s) => s.cabin_type === selectedCabinType)
  .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime());
const sparkValues = sorted.map((s) => parseFloat(s.total_usd)).filter((v) => !isNaN(v));
```

#### 2c. Make cabin cards clickable buttons

Replace the static `<div>` in the cabin table (line ~148–163) with `<button>` elements that call `setSelectedCabinType(row.label)`:

```tsx
{cabinRows.map((row) => (
  <button
    key={row.label}
    onClick={() => setSelectedCabinType(row.label)}
    className={`... ${selectedCabinType === row.label ? '...' : '...'}`}
  >
    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{row.label}</p>
    <p className="font-mono-tab text-lg font-bold text-ink">{row.price}</p>
    {selectedCabinType === row.label && (
      <p className="text-[10px] font-medium text-mint-ink">Trend shown</p>
    )}
  </button>
))}
```

The visual changes:
- All cabin cards become clickable (cursor: pointer + hover effect)
- Active cabin gets the highlight style (previously only the cheapest was highlighted)
- The `"Lowest price · trend shown"` label changes to just `"Trend shown"` since the user chose it
- Non-selected cards get a dimmer style

#### 2d. Update the label text

Change line 133:

```tsx
<p className="mb-6 text-sm text-ink-soft">
  90-day trend for <strong>{selectedCabinType}</strong>
</p>
```

### Visual design notes

| State | Style |
|-------|-------|
| **Selected cabin** | `bg-mint-soft border-mint-ink/20` with "Trend shown" indicator |
| **Unselected cabin** | `bg-canvas border-black/[0.04] hover:border-default hover:bg-black/[0.02]` — subtle hover so it's clearly clickable |
| **No history for type** | Sparkline shows "No data for this cabin type" message |

---

## Task 3: Verify

1. `npx tsc --noEmit` passes on both `./` and `./server/`
2. Sailing detail page loads with default cheapest-cabin sparkline
3. Click each cabin card — sparkline updates instantly
4. Different cabin types show different price ranges (Oceanview ~$1K–$3K, Suite $5K–$10K)
5. The date labels at the bottom of the sparkline still show the correct range
6. All cards remain keyboard-accessible (`<button>` handles this automatically)

---

## Files Modified (summary)

| File | Change |
|------|--------|
| `server/routes/cruises.ts` | Remove `cabin_type` filter from history SQL (1 line) |
| `src/components/sailing/PriceHistoryPanel.tsx` | Add `selectedCabinType` state, filter data, make cards clickable (~20 lines changed) |

No new files. No new dependencies. No API contract changes (the response shape stays the same, just with more data).
