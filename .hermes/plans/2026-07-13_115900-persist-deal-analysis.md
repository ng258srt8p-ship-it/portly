# Plan: Persist Deal Analysis to Database

## Problem

The `GET /api/analytics/deal-analysis/:sailingId` endpoint calls NVIDIA NIM **on every page load**. Each visit to a sailing detail page burns one NIM API call (with 6 keys at 40 RPM, that's 240 calls/minute max across all consumers). If the site gets traffic, API keys get hammered instantly.

## Solution

Add a `deal_analysis` column to the `sailings` table. Pre-generate the analysis during the existing 4-hour sync cycle (after pricing is generated). The endpoint reads from the DB — zero NIM calls at page-load time.

---

## Tasks

### Task 1: Add `deal_analysis TEXT` column to `sailings`

```sql
ALTER TABLE sailings ADD COLUMN deal_analysis TEXT;
ALTER TABLE sailings ADD COLUMN deal_analysis_generated_at TIMESTAMPTZ;
```

- Stores the full NIM-generated analysis markdown + a timestamp so we know when it was last refreshed.
- Also add to the `v_out_the_door_pricing` view as `s.deal_analysis` and `s.deal_analysis_generated_at`.

**Files:** direct SQL via terminal + view recreation script.

---

### Task 2: Add Phase 3 to the sync cycle (`hybridEngine.ts`)

In `runFullSyncCycle()`, after Phase 2 (pricing generation), add:

```
Phase 3: Batch Deal Analysis Generation
  1. Query sailings with pricing snapshots but no deal_analysis (or stale >4h)
  2. Chunk into batches (e.g. 10 at a time across 6 keys)
  3. For each sailing, call analyzeSailingDeal() and UPDATE sailings SET deal_analysis = ...
  4. Log progress and errors to sync_log
```

The `SyncReport` interface gets:
- `dealAnalysisGenerated: number`
- `dealAnalysisFailed: number`

**Key details:**
- Only generate for sailings that have at least one `pricing_snapshot` (without pricing, the analysis lacks hard data)
- Regenerate every sync cycle (all sailings with pricing, not just missing ones)
- Use the same NIM client with rate limiting
- Chunk at 10 per batch to stay within key limits (each call takes ~5s, 10 parallel = ~50s per batch)

**Files:**
- `server/services/hybridEngine.ts`

---

### Task 3: Rewrite analytics endpoint to serve from DB (`analytics.ts`)

The `GET /api/analytics/deal-analysis/:sailingId` endpoint changes from:

```
callNim() → return result     // LIVE NIM CALL — BAD
```

to:

```
SELECT deal_analysis FROM sailings WHERE id = $1
→ if found, return it (with generated_at timestamp)
→ if missing/null, return { success: true, data: null, note: "Analysis not yet generated. Will be available after next sync cycle." }
```

No NIM calls at runtime. The endpoint becomes a simple DB read.

**Note:** The `POST /api/analytics/analyze-all` endpoint remains as an admin trigger to manually kick off a batch re-analysis.

**Files:**
- `server/routes/analytics.ts`
- `server/services/nimAnalytics.ts` — remove the single-sailing NIM call from the endpoint path; keep the function for the batch sync cycle

---

### Task 4: Update frontend to handle missing analysis gracefully (`NimDealAnalysis.tsx`)

The component currently sends the request and renders whatever comes back. Change it to:
- If `data` is `null` or missing, show an informative "Analysis coming soon" message with a note about the next sync cycle (instead of an error)
- Keep the loading skeleton during fetch
- Keep the rich rendering when data IS present

NIM is never called from the frontend — it only calls the API endpoint which reads from DB.

**Files:**
- `src/components/sailing/NimDealAnalysis.tsx`

---

### Task 5: Full test gate

- `ALTER TABLE` migration (DB connectivity)
- `tsc --noEmit`: PASS
- `vitest run`: 27/27 PASS
- `npx playwright test`: 22/22 PASS
- Manual verification:
  - Visit sailing detail page → analysis loads from DB (not NIM)
  - Hit the same page 10 times → zero NIM calls, zero rate limit issues

---

## Data Flow (After Changes)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVERY 4 HOURS (sync cycle)                       │
│                                                                     │
│  Phase 1: NIM generates sailing schedules                          │
│  Phase 2: NIM generates pricing snapshots                          │
│  Phase 3: NIM generates deal_analysis for each active sailing      │
│           → writes to sailings.deal_analysis                        │
└─────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AT PAGE LOAD (no NIM calls)                      │
│                                                                     │
│  Frontend: NimDealAnalysis → GET /api/analytics/deal-analysis/:id   │
│  Backend:  SELECT deal_analysis FROM sailings WHERE id = :id       │
│            → return cached analysis or null                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Why This Works

- **Zero NIM calls at page-load time** — the endpoint is a pure DB read
- **Stale data is bounded** — analysis regenerates every 4h sync cycle
- **Uses existing infrastructure** — sync cycle already runs every 4h, uses the same NIM keys with rate limiting
- **Graceful fallback** — sailings without pricing data simply show "Analysis coming soon"
- **No new tables** — just one column on `sailings`
- **Reuses existing code** — `analyzeSailingDeal()` becomes the batch worker function called during Phase 3
