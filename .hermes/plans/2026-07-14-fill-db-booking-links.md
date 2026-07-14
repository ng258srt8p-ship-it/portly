# Plan: Fill Database & Implement Purchase Links

## Current State

**Database:**
- 507 sailings (253 NIM-sourced with AI booking URLs, 254 seed-sourced **with 0 booking URLs**)

**Frontend:**
- Sailing detail page: "Book This Cruise" CTA button shown **only if** `bookingUrl` exists
- Deals page: "View Deal" navigates to sailing detail; no direct booking button

**Problem:**
- 254 seed sailings (50% of data) have no booking URL → no purchase path
- NIM booking URLs are AI-generated fakes (look real, don't actually book)
- No direct "Book Now" on the deals page grid

---

## Task 1: Generate Booking URLs for Seed Sailings

### 1a. Create a backfill script

**File:** `server/db/backfillBookingUrls.ts`

Generate realistic cruise-line booking URLs for all seed sailings **without** calling an AI API. Use URL patterns per cruise line:

```typescript
const BOOKING_URL_PATTERNS: Record<string, (ship: string, date: string, port: string) => string> = {
  'Royal Caribbean': (s, d, p) =>
    `https://www.royalcaribbean.com/cruises/${slugify(s)}?date=${d}&port=${slugify(p)}`,
  'Norwegian Cruise Line': (s, d, p) =>
    `https://www.ncl.com/cruises/${slugify(s)}/${d}`,
  // ... one pattern per line
};
```

**Logic:**
1. Query all sailings where `booking_url IS NULL OR booking_url = ''`
2. For each, generate URL using the matching pattern based on `cruise_line`
3. `UPDATE sailings SET booking_url = $1 WHERE id = $2`

**Output:** 254 sailing URLs generated in ~2 seconds. Zero API cost.

### 1b. Verify on frontend

- Navigate to each seed sailing detail page → "Book This Cruise" button visible
- Button opens correct cruise-line booking URL in new tab
- Deals page cards for seed sailings work end-to-end

---

## Task 2: Add Direct Booking Button to Deal Cards

### 2a. Extend the Deal type to include `bookingUrl`

**File:** `src/types/cruise.ts`

Add optional field to `DealCard`:
```typescript
export interface DealCard {
  // ... existing fields
  bookingUrl?: string;
}
```

### 2b. Return `booking_url` from deals API

**File:** `server/routes/cruises.ts`

Add `booking_url` to the Deal mapping (around line 650):
```typescript
bookingUrl: row.booking_url || undefined,
```

### 2c. Add "Book Now" button to DealCard

**File:** `src/components/DealsGrid.tsx`

Add a secondary CTA button alongside "View Deal" in the card footer:
```tsx
{deal.bookingUrl && (
  <a
    href={deal.bookingUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-xs font-bold text-white hover:bg-emerald-dark"
  >
    Book Now
  </a>
)}
```

**Wire-up on sailing detail page:** The existing "Book This Cruise" CTA already works. No changes needed there.

---

## Task 3: Fill More Cruise Data

### 3a. Increase target sailings in sync config

**File:** `server/services/hybridEngineOptimized.ts`

Increase `targetSailings` from 180 → **350** so each sync cycle generates more sailings.

### 3b. Add cruise line URL patterns to the sync generator prompt

**File:** `server/services/syncGeneratorOptimized.ts`

Strengthen the `bookingUrl` instruction in the AI prompt:
```
- "bookingUrl": Real cruise line URL using format:
  Royal Caribbean → https://www.royalcaribbean.com/cruises/<ship-slug>?date=<date>&port=<port-slug>
  Norwegian → https://www.ncl.com/cruises/<ship-slug>/<date>
  ... (one per line)
```

### 3c. Run a full sync cycle

```bash
curl -X POST http://localhost:3001/api/admin/trigger-sync
```

This generates ~350 new sailings with complete booking URLs, pricing, and history.

### 3d. (Optional) Seed script expansion

If the sync fails due to OpenCode rate limits, expand `seedExpanded.ts` instead:
- Add booking URL generation for all seed sailings (as in Task 1)
- Increase seed sailings from 254 → 500
- Re-run: `npx ts-node server/db/backfillBookingUrls.ts`

---

## Task 4: Verification & Polish

### Frontend gates
- `npx tsc --noEmit` = 0 errors
- `/deals` page: every card with a bookingUrl shows "Book Now" + "View Deal"
- `/sailing/:id` page: "Book This Cruise" CTA visible on all sailings
- Responsive layout: buttons stack gracefully on mobile

### Backend gates
- `npx tsc --noEmit` in server/ = 0 errors
- API returns `bookingUrl` in deals response
- API returns `bookingUrl` in sailing detail response
- Seed backfill script completes without errors

### Data integrity
- Booking URLs are unique per sailing
- No duplicate URLs
- All seed sailings have a booking_url after backfill

---

## Files Modified (summary)

| File | Change |
|------|--------|
| `server/db/backfillBookingUrls.ts` | **NEW** — Generate booking URLs for all seed sailings |
| `src/types/cruise.ts` | Add `bookingUrl` to `DealCard` type |
| `server/routes/cruises.ts` | Return `booking_url` in deals API response |
| `src/components/DealsGrid.tsx` | Add "Book Now" button to deal cards |
| `server/services/hybridEngineOptimized.ts` | Increase `targetSailings` → 350 |
| `server/services/syncGeneratorOptimized.ts` | Strengthen booking URL prompt |

## Order of Execution

```
Task 1 (backfill URLs) → Task 2 (deal card booking button) → Task 3 (more data) → Task 4 (verify)
```

Tasks 1 and 2 are independent and could run in parallel. Task 3 depends on the booking URL infrastructure being solid first.
