# Explore Deals Page & Homepage Simplification

**Goal:** Build a dedicated Explore Deals page (`/deals`) with full deep-dive filtering, sorting, and live sync, while simplifying the homepage by removing filters, sync, and the "All" button from the deal limit selector.

**Architecture:** Next.js App Router (src/app). Existing `/deals` page is a stub — needs rebranding as a "deals workspace" with a hero, always-visible filters, sorted grid, and per-card book links. Homepage gets stripped of deal-interaction surface area while keeping SearchHero, TrustStrip, PriceComparisonTable.

**Tech Stack:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, `useLiveData` hook, Material Symbols via CDN.

---

## Definition of Done

### Content / UX Gates
- [ ] Header "Explore Deals" link navigates to `/deals` on all pages (no more homepage scroll-behavior)
- [ ] Homepage has NO `<DealsFilters>`, NO `<SyncStatus>`/refresh button, and NO "All" button in the limit selector
- [ ] `/deals` page has a striking hero section (title, subtitle, sync status pill)
- [ ] `/deals` page shows filters always expanded (no mobile collapse — deep-dive mode)
- [ ] `/deals` page limit selector has "All" option (it's moved, not removed)
- [ ] Every deal card on `/deals` has a working "View Deal" link to `/sailing/[id]` detail page
- [ ] Sailing detail page "Book This Cruise" button directs to a real external booking URL (when data exists in DB)
- [ ] Backend `/api/sailing/:id` returns a `bookingUrl` field (from `sailings.booking_url` column or derived)
- [ ] Deal cards show the sailing ID in the URL so bookmarks work

### Technical Gates
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx vitest run` 27/27 passes
- [ ] `npx playwright test` 18/18 passes
- [ ] `npm run build` passes (production build)
- [ ] No broken links on homepage or `/deals` (check with curl/link checker)
- [ ] URL search params sync works on `/deals` (shareable filter links)

### Database / Infrastructure Gates
- [ ] `sailings.booking_url` column exists (or migration adds it)
- [ ] `/api/sailing/:id` endpoint returns booking URL in response
- [ ] NIM sync generator populates booking_url when generating sailings
- [ ] Existing data gets booking_url backfilled via batch UPDATE

---

## Current Context

### Existing Structure

```
src/app/page.tsx              — Homepage: Header, SearchHero, TrustStrip, DealsGrid, PriceComparisonTable, Footer
src/app/deals/page.tsx        — Stub: Header, DealsGrid, Footer (no hero, no filters)
src/app/sailing/[id]/page.tsx — Full sailing detail page with pricing, history, "Book This Cruise" button
src/components/DealsGrid.tsx  — Renders filters + limit selector + deal card grid + SyncStatus
src/components/DealsFilters.tsx — Checkbox + range filter component
src/components/ui/SyncStatus.tsx — Live-refresh pill
src/components/layout/Header.tsx — Fixed header with "Explore Deals" → /deals
src/types/cruise.ts           — Deal, DealFilters, etc.
src/services/cruiseApi.ts     — fetchDeals() calls /api/deals
server/routes/cruises.ts      — /api/deals endpoint + sailing detail endpoints
server/services/hybridEngine.ts — NIM sync engine
server/services/nimSyncGenerator.ts — NIM generation logic
```

### What currently lives inside DealsGrid

1. **Filters** — `<DealsFilters>` component with line, region, destination, nights, type, price range, sort
2. **Limit selector** — 4 buttons: 5, 10, 20, **All** (the "All" button the user wants removed from homepage)
3. **SyncStatus** — pill showing "Synced Xs ago" with a refresh button
4. **Card grid** — Deal cards with "View Deal" link to `/sailing/[id]`
5. **Deal count** — "N deals available" text

### Current header behavior

When on homepage and clicking "Explore Deals", the code scrolls to `#deals` section rather than navigating to `/deals`. The existing `/deals` page is a stub that is never reached via the header under normal navigation.

### Booking links

The sailing detail page has a "Book This Cruise" button but it does NOT link to an actual external booking URL. There is currently no `booking_url` column in the `sailings` table. The NIM generator does not produce booking URLs. The user wants "ensure links actually direct users to book cruises" — meaning real affiliate/booking links.

---

## Investigation Phase 0 (Run BEFORE implementing)

### 0.1 — Verify booking_url column + NIM output

- Check if `sailings.booking_url` exists in PostgreSQL schema
- Check NIM prompt for whether it generates affiliate/booking URLs
- Decide: generate demo booking URLs from NIM data (e.g. `https://www.vacationstogo.com/cruise_search.cfm?line=CRUISE_LINE&ship=SHIP_NAME`) or use a real affiliate program

### 0.2 — Baseline tests

- Run `npx tsc --noEmit`, `npx vitest run`, `npx playwright test` to confirm current passing state
- Check if there are existing E2E tests for the `/deals` route

---

## Implementation Plan

### Task 1: Add `booking_url` to DB schema + NIM generator

**Objective:** Give every sailing an external booking link. This is the customer-facing "book now" URL the user explicitly asked for.

**Files:**
- Create: `server/db/migrations/004-add-booking-url.sql`
- Modify: `server/services/nimSyncGenerator.ts` — add `bookingUrl` to prompt and generated output
- Modify: `server/services/hybridEngine.ts` — add booking_url INSERT to syncB2BSchedules
- Modify: `server/routes/cruises.ts` — return booking URL in sailing detail endpoint

**Step 1: Add booking_url column to sailings**

```sql
ALTER TABLE sailings ADD COLUMN IF NOT EXISTS booking_url TEXT;
```

Run via psql:
```bash
psql -d triptide -c "ALTER TABLE sailings ADD COLUMN IF NOT EXISTS booking_url TEXT;"
```

**Step 2: Update NIM sailing generation prompt**

In `nimSyncGenerator.ts`, add to the SailingRecord type:
```typescript
interface SailingRecord {
  // existing fields...
  bookingUrl?: string;
}
```

Add to the generation prompt at the `generateSailings` function:
```
- bookingUrl: A hypothetical booking URL for this sailing, formatted as:
  "https://www.vacationstogo.com/cruise_search.cfm?line={CRUISE_LINE}&ship={SHIP_NAME}&date={DEPARTURE_DATE}"
```

Note: NIM can't generate real booking URLs, but it CAN generate consistent, 
format-valid URLs based on the cruise line + ship name pattern. This gives us a working
link that can be replaced with a real affiliate program later.

**Step 3: Update syncB2BSchedules INSERT**

In `hybridEngine.ts`, add `booking_url` to the INSERT columns. Add `$14` parameter with the value.

**Step 4: Update sailing detail endpoint**

In `cruises.ts`, add `bookingUrl` to the sailing detail response under `sailing.bookingUrl`.

---

### Task 2: Update Header — always navigate to /deals

**Objective:** "Explore Deals" in header should always go to the `/deals` page, not scroll on homepage.

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: Remove the homepage-scroll special case**

In `Header.tsx`, change the `navigate` function so that clicking "Explore Deals" ALWAYS calls `router.push('/deals')` regardless of current pathname.

Remove the `if (href === "/deals" && pathname === "/")` scroll behavior — just do `router.push(href)` directly.

---

### Task 3: Strip homepage — remove filters, sync, "All" button

**Objective:** Homepage should show SearchHero, TrustStrip, PriceComparisonTable — no deal-interaction UI.

**Files:**
- Modify: `src/app/page.tsx` — remove `<DealsGrid>`
- Modify: `src/app/page.tsx` — optionally add a "Browse Deals →" call-to-action linking to `/deals`

**Step 1: Remove DealsGrid from homepage**

```tsx
// Before:
<section id="deals">
  <DealsGrid />
</section>
```

Replace with a link to the deals page:
```tsx
<div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 text-center">
  <p className="font-display text-2xl font-bold text-ink">
    Ready to find your next voyage?
  </p>
  <Link
    href="/deals"
    className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white hover:bg-indigo-dark"
  >
    Explore All Deals
    <MaterialIcon name="arrow_forward" size="sm" />
  </Link>
</div>
```

---

### Task 4: Build the full Explore Deals page

**Objective:** `/deals` becomes a rich deep-dive page with hero, always-expanded filters, synced grid, and booking links.

**Files:**
- Rewrite: `src/app/deals/page.tsx`
- Modify: `src/components/DealsGrid.tsx` — refactor to be configurable (optional filter auto-expand, optional sync pill)
- Create: `src/app/deals/ExploreDealsHero.tsx` — striking hero section for the deals page

**Step 1: Create ExploreDealsHero component**

A hero section with:
- Large headline: "Find Your Perfect Voyage"
- Subtitle: "Compare out-the-door pricing across 300+ sailings"
- Sync status pill (live count from `/api/stats`)
- Quick-actions row: "Solo Friendly", "Biggest Drops", "Best Value" chips

**Step 2: Refactor DealsGrid to accept a `variant` prop**

Support two variants:
- `'home'` (default — will be removed, kept for backward compat): collapsed filters, has sync, has all limit buttons
- `'full'` (for `/deals`): filters always expanded, has sync, has all limit buttons

Actually, since homepage will no longer use DealsGrid at all, we can simplify:
- DealsGrid becomes the "full exploration" mode
- Remove the mobile collapsed-filters state (always show)
- Keep the sync status + refresh
- Keep all 4 limit buttons (5, 10, 20, All)

**Step 3: Rewrite `/deals/page.tsx`**

```tsx
import Header from '@/components/layout/Header';
import ExploreDealsHero from './ExploreDealsHero';
import DealsGrid from '@/components/DealsGrid';
import Footer from '@/components/Footer';

export default function DealsPage() {
  return (
    <>
      <Header />
      <main className="pt-24">
        <ExploreDealsHero />
        <DealsGrid />
      </main>
      <Footer />
    </>
  );
}
```

**Step 4: Add metadata for the deals page**

```typescript
export const metadata = {
  title: 'Explore Cruise Deals | TripTide',
  description: 'Deep-dive into the best out-the-door cruise pricing across 20+ cruise lines.',
};
```

---

### Task 5: Make deal cards link to booking URLs

**Objective:** Deal card "View Deal" should link to `/sailing/[id]` detail page. The detail page "Book This Cruise" button should link to the actual booking URL from the database.

**Files:**
- Modify: `src/app/sailing/[id]/page.tsx` — use bookingUrl for the CTA button
- Modify: `src/components/DealsGrid.tsx` — add `bookingUrl` display on deal cards

**Step 1: Update sailing detail "Book This Cruise"**

Change from a `<button>` with no action to:
- If `data.sailing.bookingUrl` exists: an `<a href={bookingUrl} target="_blank" rel="noopener noreferrer">` styled as the CTA button
- If no booking URL: keep as-is (button with no-op, or hidden)

**Step 2: Optionally add a "Book Now" secondary CTA to deal cards**

Small "Book Now →" link on the card that points to the booking URL directly (or the sailing detail page as fallback).

---

### Task 6: Backfill booking URLs for existing sailings

**Objective:** All existing sailings in the DB need a booking_url so the detail page works immediately after deployment.

**Step 1: Write backfill SQL**

```sql
UPDATE sailings 
SET booking_url = 
  'https://www.vacationstogo.com/cruise_search.cfm?line=' 
  || replace(lower(cruise_line), ' ', '-') 
  || '&ship=' || replace(lower(ship_name), ' ', '-')
  || '&date=' || departure_date
WHERE booking_url IS NULL;
```

Run via psql.

---

### Task 7: Full test gate

**Objective:** Ensure nothing is broken.

**Step 1:** `npx tsc --noEmit`
**Step 2:** `npx vitest run`
**Step 3:** `npx playwright test`
**Step 4:** Manual verification:
- Visit `/` — no filters, no sync, no "All" button, no deal grid
- Visit `/deals` — hero visible, filters expanded, deals loading, cards link to detail pages
- Click a deal card → `/sailing/[id]` — booking URL button works
- Verify URL search params sync on `/deals` (shareable filter state)

---

## Files Changed (Summary)

| File | Action | Notes |
|---|---|---|
| `server/db/migrations/004-add-booking-url.sql` | Create | Booking URL migration |
| `server/services/nimSyncGenerator.ts` | Modify | Add bookingUrl to SailingRecord + prompt |
| `server/services/hybridEngine.ts` | Modify | INSERT booking_url + return in sailing detail |
| `server/routes/cruises.ts` | Modify | Return bookingUrl in sailing detail endpoint |
| `src/components/layout/Header.tsx` | Modify | Remove homepage scroll override |
| `src/app/page.tsx` | Modify | Remove DealsGrid, add "Explore All Deals" CTA |
| `src/app/deals/page.tsx` | Rewrite | Full deals page with hero + grid |
| `src/app/deals/ExploreDealsHero.tsx` | Create | Striking hero section |
| `src/components/DealsGrid.tsx` | Modify | Full exploration mode (always-expanded) |
| `src/app/sailing/[id]/page.tsx` | Modify | Booking URL CTA |

## Risks & Tradeoffs

1. **No real affiliate program**: The booking URLs are generated from NIM data using a Vacationstogo URL format. This gives a working link but isn't a monetized affiliate link. Worth noting for future growth.
2. **DealsGrid refactoring**: The component is currently 298 lines and bundles filters + grid + sync. Refactoring into a "full exploration mode" is manageable but the component could be split further later.
3. **All button removal from homepage**: The "All" button shows `limit=0`, which requests ALL deals from the API. On the homepage, removing it means the homepage no longer loads many deals at all since DealsGrid itself is removed. No concern.
4. **SyncStatus on deals page**: Kept on `/deals` so users can manually refresh. The auto-poll (30s) stays.

## Open Questions

1. Should "View Deal" on cards navigate to `/sailing/[id]` OR directly to the `bookingUrl`? Current plan: card → detail page → booking URL. If the user wants direct booking, change the card CTA to go straight to bookingUrl.
2. Should the `/deals` page have infinite scroll instead of the limit selector? Current plan: keep limit selector as-is (5/10/20/All buttons).
