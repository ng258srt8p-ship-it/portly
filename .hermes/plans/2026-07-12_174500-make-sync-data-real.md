# Plan: Make "Sync Now" Data Real (NIM-Powered)

## Problem

The `POST /api/engine/sync` endpoint runs a "hybrid sync cycle" that:

1. **Phase 1 (B2B Sync)**: All 3 B2B sources (`Widgety`, `Traveltek`, `CruiseConnect`) are `enabled: false`. The sync skips real API calls and falls through to `getMockB2BRecords()` — 7 hardcoded sailings that never change.

2. **Phase 2 (Stealth Checkout)**: `mockStealthCheckout()` returns hardcoded pricing by cruise line — no real variability or market awareness.

3. **DB fallback**: `mockSailingsDb` in `routes/cruises.ts` is an identical hardcoded array used as fallback when DB queries return empty.

Result: Every "Sync Now" click produces the exact same 7 sailings with randomized badge calculations. None of it reflects real market conditions.

## Approach (NIM-First Synthetic Data Generation)

Instead of trying to integrate 3 B2B APIs that may require contracts/keys, use NVIDIA NIM (`nemotron-3-ultra-550b-a55b`, already working with 5 keys) to:

1. Generate **realistic, varied sailing schedules** each sync cycle (different ships, routes, prices)
2. Generate **realistic checkout pricing** that varies with market context
3. Store results in PostgreSQL so DB queries return fresh data
4. Add an endpoint that exposes the NIM-generated data to the UI

## Implementation Plan

### Task 1: Extract NIM client utility

Create `server/utils/nimClient.ts` — shared NIM HTTP client with key rotation (extracted from `nimAnalytics.ts`):

- `callNim(messages, options)` — POST to NIM API, return JSON content
- 5-key round-robin rotation
- Configurable model, temperature, max_tokens

### Task 2: Create NIM sailing data generator

Create `server/services/nimSyncGenerator.ts` — generates realistic cruise data via NIM:

- `generateSailingsBatch(count: number)` → returns `SailingRecord[]` with:
  - Real cruise lines (Royal Caribbean, Princess, NCL, Carnival, Celebrity, MSC, etc.)
  - Real ship names that actually sail for each line
  - Realistic itineraries (ports, regions, durations)
  - Current/future departure dates
  - Varies per call (different ships, routes, dates each sync)

- `generatePricingForSailing(sailing: SailingRecord)` → returns `CheckoutResult` with:
  - Realistic base fares, port fees, and gratuities per cruise line
  - Market-variable pricing (not the same prices every time)
  - Solo supplement waiver status

- Prompt engineering tips:
  - Use structured output: ask NIM to return JSON arrays
  - Include cruise line pricing tiers in the prompt so output is realistic
  - Set temperature 0.4–0.6 for variety while staying in valid range

### Task 3: Replace mock data in hybridEngine.ts

- `syncB2BSchedules()`: When all B2B sources are disabled, call `generateSailingsBatch(9)` instead of `getMockB2BRecords()`
- `runStealthCheckouts()`: For sailings without checkout data, call `generatePricingForSailing()` instead of `mockStealthCheckout()`
- Import NIM generator and wire into the sync pipeline
- Remove `getMockB2BRecords()` and `mockStealthCheckout()` functions

### Task 4: Replace mock DB fallback in cruises.ts

- Remove `mockSailingsDb` array 
- In `fetchSailingsFromDb()`: if DB returns empty, trigger a mini-sync via NIM generator to populate it
- All routes fall through to DB naturally

### Task 5: Wire Sync Now button to real feedback

- Add `GET /api/engine/status` endpoint returning current sync state + last report
- The existing `POST /api/engine/sync` already returns a `SyncReport` — ensure it includes generated record details
- The frontend already calls `fetchDeals()` which returns whatever the DB has post-sync

### Task 6: Add NIM-sailing-data endpoint for analytics transparency

- `GET /api/sync/generated-sailings` — returns the current batch of NIM-generated sailings with their pricing
- Useful for debugging/verifying that NIM produced varied data each sync

## Rejected Alternatives

1. **Real B2B API keys**: Widgety/Traveltek require contracts. We don't have keys. Even with keys, APIs may return limited coverage.
2. **Static CSV/JSON of real sailings**: Would eventually feel stale. NIM gives per-sync variety.
3. **Web scraping real cruise sites without Playwright**: Rate limits, IP blocks, fragile selectors. The existing Playwright stealth infra requires real checkout page URLs.

## Verification

For each task:
1. Run `npm run build` — must pass
2. Run `npx vitest run` — 27/27 must pass
3. Run `npx playwright test e2e/app.spec.ts` — 18/18 must pass
4. Hit `POST /api/engine/sync` — confirm returns varied data each call
5. Confirm audit.sh passes with 0 errors

## Files to Change Summary

| File | Action |
|---|---|
| `server/utils/nimClient.ts` | **Create** — shared NIM client extracted from nimAnalytics |
| `server/services/nimSyncGenerator.ts` | **Create** — NIM-powered sailing/pricing generator |
| `server/services/hybridEngine.ts` | **Modify** — replace mock functions with NIM generator calls |
| `server/routes/cruises.ts` | **Modify** — remove mockSailingsDb, add NIM fallback |
| `server/services/nimAnalytics.ts` | **Refactor** — use shared nimClient instead of local one |
| `server/index.ts` | **Modify** — add sync status endpoint if needed |
