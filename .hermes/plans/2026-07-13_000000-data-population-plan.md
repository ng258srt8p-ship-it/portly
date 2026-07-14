# Plan: NIM-Powered Scheduled Cruise Data Pipeline

## Architecture

```
                         ┌─────────────────────────────────────┐
  ┌──────────┐   every   │        Sync Engine                  │
  │  Cron     │──4h────▶ │  (hybridEngine.ts + nimSyncGen)     │
  │  Schedule │          │                                      │
  └──────────┘          │  ┌─────────────────────────────────┐  │
                         │  │  Phase 1: NIM generates 20-50  │  │
                         │  │  sailings with ALL fields       │  │
                         │  │  → writes to `sailings` table   │  │
                         │  └─────────────────────────────────┘  │
                         │  ┌─────────────────────────────────┐  │
                         │  │  Phase 2: NIM generates pricing  │  │
                         │  │  for each cabin tier x pax count │  │
                         │  │  → writes to `pricing_snapshots` │  │
                         │  │  → archive trigger populates     │  │
                         │  │    `pricing_history`              │  │
                         │  └─────────────────────────────────┘  │
                         │  ┌─────────────────────────────────┐  │
                         │  │  Phase 3: Log to `sync_log`      │  │
                         │  │  duration / records / NIM errors  │  │
                         │  └─────────────────────────────────┘  │
                         └─────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   PostgreSQL DB      │
                         │  sailings            │
                         │  pricing_snapshots   │
                         │  pricing_history     │
                         │  sync_log            │
                         │  price_alerts        │
                         └─────────────────────┘
                                    ▲
                                    │ (reads VIEW)
                         ┌─────────────────────┐
                         │  v_out_the_door_     │
                         │  pricing (live view) │
                         └─────────────────────┘
```

## Key changes from current system

| Aspect | Current | Target |
|---|---|---|
| **Data source** | Widgety seed (static) + NIM fallback | **NIM exclusively** (no static data) |
| **Sailings per sync** | 9 (hardcoded) | 20–50 (configurable, vary per cycle) |
| **Sync schedule** | 24h (1440 min) | **4h** (configurable via env var) |
| **Columns populated** | 8 of 15+ | **All 15+** (including ship_class, departure_region, cabin_categories, is_repositioning, raw_payload) |
| **Pricing detail** | Inside/Oceanview/Balcony/Suite × pax=2 | × pax=1,2 with real cabin category mappings |
| **Sync tracking** | In-memory only (`lastSyncReport`) | **`sync_log` table** (persistent history) |
| **Concurrency guard** | In-memory boolean | **Lock row in `sync_log`** (survives restarts) |

---

## Phase 1 — NIM Prompt Expansion (all `sailings` columns)

### 1a. Rewrite `generateSailings()` prompt

Current prompt asks for 7 fields. New prompt adds:

| New field | Type | Example |
|---|---|---|
| `shipClass` | string | `"Oasis-class"`, `"Vista-class"`, `"Spirit-class"` |
| `departureRegion` | string | `"Florida"`, `"Pacific Northwest"`, `"Western Europe"` |
| `cabinCategories` | CabinTier[] | `[{"tier": "Inside", "count": 500, "sqFt": 182, "maxOccupancy": 4}, …]` |
| `isRepositioning` | boolean | `false` |
| `itinerary` | string[] | Already exists — enrich with `departure_region` |

The count per sync is randomized between 20–50 so data changes each cycle.

### 1b. Update `syncB2BSchedules()` SQL INSERT

Current INSERT:
```sql
INSERT INTO sailings (cruise_line, ship_name, departure_date, duration_days,
  departure_port, itinerary, destination_region, total_cabins, sync_source, sync_status)
```

Expanded INSERT:
```sql
INSERT INTO sailings (cruise_line, ship_name, ship_class, departure_date,
  duration_days, departure_port, departure_region, itinerary,
  destination_region, total_cabins, cabin_categories, is_repositioning,
  sync_source, sync_status, raw_payload) VALUES (...)
```

Store the full NIM JSON response in `raw_payload` (jsonb).

---

## Phase 2 — Full Pricing Generation

### 2a. Use real cabin categories

Instead of hardcoding `['Inside', 'Oceanview', 'Balcony', 'Suite']`, read the `cabinCategories` from Phase 1's generated data and generate pricing per actual cabin tier.

### 2b. Generate 2 pax counts

For each cabin tier, generate pricing for:
- `passengerCount: 2` (standard couple)
- `passengerCount: 1` (solo traveler — set `isSoloSupplementWaived` randomly based on the sailing's solo policy)

### 2c. INSERT with `captured_by = 'nim_generator'`

Existing code already does this. The INSERT format stays the same.

---

## Phase 3 — Sync Schedule (4h cycle)

### 3a. Change interval from 1440 to 240 minutes

In `hybridEngine.ts`, the `intervalMs` is currently set from `B2B_SOURCES[0].syncIntervalMinutes * 60 * 1000`. Override to 240 minutes.

### 3b. Use `sync_log` as a persistent lock

Instead of an in-memory `isRunning` boolean, check/write a lock row in `sync_log`:
- On cycle start: INSERT with `status = 'running'`
- On cycle end: UPDATE to `completed` or `failed`
- Skip if the last `status = 'running'` row is < 60 minutes old (crash recovery)

This survives server restarts and prevents overlapping runs.

### 3c. Log every cycle to `sync_log`

Schema:
```sql
id SERIAL,
started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
completed_at TIMESTAMPTZ,
status sync_status,  -- 'running' | 'completed' | 'failed'
sailings_fetched INT,
sailings_inserted INT,
pricing_generated INT,
errors TEXT[],
nim_model VARCHAR(100),
duration_seconds INT
```

---

## Phase 4 — Wire `departureRegion` into frontend

### 4a. Add to `DealFilters` type
### 4b. Add to backend `GET /api/deals` filter params
### 4c. Add filter pill row in `DealsFilters.tsx`

---

## Phase 5 — Remove all static/seed data

Drop the old `widgety` seed sailings from the DB. The only sailings should come from NIM sync cycles. This ensures every piece of data the user sees is from current NIM output.

### File changes

| File | Changes |
|---|---|
| `server/services/nimSyncGenerator.ts` | Expand `generateSailings()` prompt, add cabinCategories, shipClass, departureRegion, isRepositioning; count range 20-50 |
| `server/services/hybridEngine.ts` | Expand SQL INSERT; change interval to 4h; replace `isRunning` with `sync_log` lock; write sync_log rows |
| `server/routes/cruises.ts` | Add `departureRegion` to filter params |
| `src/types/cruise.ts` | Add `departureRegion` to `DealFilters` |
| `src/services/cruiseApi.ts` | Add `departureRegion` to `fetchDeals` params |
| `src/components/DealsFilters.tsx` | Add departure region checkbox group |
| Migration SQL | Drop widgety seed sailings where `sync_source = 'widgety'` |
