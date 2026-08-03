# Pricing Data Verification + Fix Goal-Loop Plan

**Date:** 2026-08-02  
**Trigger:** User-flagged pricing contradiction on `carnival_horizon_2026-03-08_miami_6__big_31__v4m`  
**Blocking site:** RoyalCaribbean.com, CruiseCritic.com return bot walls (DataDome/CAPTCHA) to Playwright. Verified unusable for automated comparison.  
**Verified source:** Portly API (`/api/deals`) is the authoritative price feed — all code paths (hero, cabin table, forecast, deal badge) derive from it. Any mismatch found in our own UI is a bug; cross-site parity is a manual spot-check item.

---

## Goal Loop Contract

**Goal:** Eliminate the 3 pricing contradictions: (1) hero price ≠ cheapest cabin OTD, (2) `-73% Drop` compares against Suite peak not Inside historical price, (3) `deriveVerdict()` uses unverified provenance chain. After fixes, every sailings detail page's hero price, OTD total, drop badge, and Cabin Pricing table row must all derive from the same `cabinBreakdown` source of truth, and the drop baseline must be comparable (same cabin tier, same historical window).

**Stopping condition:** `npm run build` ✅, Playwright `assert(hero price == cheapest OTD from cabinBreakdown)` ✅, no user-visible unexplained gaps. Manual spot-checks Carnival.com for any sailing where OTD total > $500.

---

## Step 1 — Verify data contract on 5 sailings from /api/deals (verify)

Run:
```bash
curl -s "https://portly-api.vqh9mnrdbp.workers.dev/api/deals?limit=5" | jq '.[] | {id, price, originalPrice, dropPercent, cabinBreakdown, history}'
```
- [x] Done — API returns `price` (tier-agnostic deal stub), separate `cabinBreakdown` array with per-cabin OTD, and per-sailing `history`.
- [x] Five sailings sampled: prices range $176–$317; cabins include Inside + Balcony + Suite with disparate OTD totals.

**Verdict:** API contract is clean; the bug is in `SailingHero`'s interpretation, not the API.

---

## Step 2 — Root-cause fix: SailingHero.tsx derives hero price from cabinBreakdown (fix)

Current code path (lines 68-92):
```tsx
const roundedPrice = Math.round(price);  // ← $321 — raw deal stub
const heroOriginalPrice = ... originalPrice; // ← $1,182 — Suite peak
// OTD breakdown uses cabinTier from cabinBreakdown[0] — correct
```
**Fix:** Use `cabinBreakdown[0]` OTD total as hero price, derive *originalPrice* for the same cabin tier from its history array, compute drop from that.

- [ ] Patch `SailingHero.tsx` lines 68-110: heroPrice = min(cabinBreakdown[*].totalOutTheDoor || price); heroOriginalPrice = first element of cabinBreakdown's own history; heroDrop = computed from same tier.
- [ ] Fallback: if `cabinBreakdown` is empty, keep legacy behavior but add a visible warning banner.

---

## Step 3 — Root-cause fix: deriveVerdict() provenance (fix)

`SailingKeyTakeaways.tsx` `deriveVerdict()` (line 83): says "At $106/night out-the-door..." but:
- `perNight` is passed in from parent as `price / days` where `price` is the problematic raw value (e.g. 321/3 = 107, not 678/3 = 226).
- `history` comes from `data.sailing.history` (all tiers blended) — not tier-specific.

- [ ] Fix `SailingKeyTakeaways.tsx` to use `cabinBreakdown[0].totalOutTheDoor / days` for `perNight`.
- [ ] Note that per-tier history is not available from the API yet; add a `TODO` comment.

---

## Step 4 — Build gate (verify)

```bash
npx tsc --noEmit   # must pass
npm run build      # must pass
```

- [ ] tsc noEmit pass
- [ ] Build pass

---

## Step 5 — Playwright regression (verify)

```bash
BASE_URL=https://portly-1i0.pages.dev npx playwright test --grep "sailing-detail" --workers=1
```

Must pass existing sailing detail tests so we confirm no regressions.

- [ ] Run tests

---

## Step 6 — Manual spot-check protocol (human step — documented only)

For sailings where the new hero OTD > $500 (trip cost likely warrants verification):
1. Open `bookingUrl` from the sailing's API data (e.g. carnival.com/cruises/carnival-horizon).
2. Search for the sailing by departure date + ship.
3. Select Inside cabin.
4. Verify OTD = Base + Port Tax + Grat ≈ `cabinBreakdown[0].totalOutTheDoor` from API.
5. Acceptable delta: ±5% (we use static port_fees and per-night gratuity; cruise lines may round differently).

Document any delta > 5% in this file.

---

## Step 7 — Deploy + final comparators report (done/future)

Comparison report persisted at `docs/pricing-verification/comparison-report.html`.  
Five sailings verified from Portly API. External site comparison blocked by bot walls — manual spot-check in Step 6.

---

## Rollout

1. Commit + push pricing-verify fixes.
2. `BUILD_TARGET=export npm run build` + `wrangler pages deploy out`.
3. Manual spot-check Step 6 in parallel.
4. Update this `.md` with spot-check results.
5. Close the loop.
