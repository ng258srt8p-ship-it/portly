# NIM Sync Cycle — Blocker Fix Plan

> **Goal:** Resolve two DB-level blockers preventing the 4h NIM sync cycle from completing.

**Architecture:** Two independent fixes: (1) add missing column `is_solo_supplement_waived` to the `v_out_the_door_pricing` view definition, (2) add `'running'` to the `sync_status` enum so the `sync_log` lock INSERT succeeds. Apply both via psql, then restart the backend and verify the full sync cycle completes.

**Tech Stack:** PostgreSQL 15, Express/tsx, NimSyncGenerator

---

## Gate Table

| Gate | Description | Verification | Pass Condition |
|------|-------------|-------------|----------------|
| G1 | TypeScript compiles | `npx tsc --noEmit` | exit code 0 |
| G2 | Backend starts clean | `npm run server` → no errors in first 10s | log shows healthy status |
| G3 | NIM sync completes | `curl /api/health` → `lastSync.status` | `"completed"` |
| G4 | Sailings + pricing populated | `psql -c "SELECT COUNT(*) FROM sailings WHERE sync_status='active'"` | > 0 |
| G5 | Vitest still passes | `npx vitest run` | 27/27 |
| G6 | Playwright still passes | `npx playwright test` | 18/18 |

---

## Task 1: Add `is_solo_supplement_waived` to the view

**Objective:** The view `v_out_the_door_pricing` references `ps.is_solo_supplement_waived` only inside a `CASE WHEN` expression for `solo_supplement_percent`, but does **not** expose it as a direct column. Queries in `cruises.ts` (`v.is_solo_supplement_waived`) fail with `column does not exist`. Drop and recreate the view with `ps.is_solo_supplement_waived` added to the SELECT list.

**Files:** No TS files changed — only DB schema via psql.

**Step 1: Recreate the view with the missing column**

```sql
DROP VIEW IF EXISTS v_out_the_door_pricing;
CREATE VIEW v_out_the_door_pricing AS
SELECT
  s.id AS sailing_id,
  s.cruise_line,
  s.ship_name,
  s.departure_date,
  s.duration_days,
  s.departure_port,
  s.departure_region,
  s.itinerary,
  s.destination_region,
  ps.id AS snapshot_id,
  ps.cabin_type,
  ps.passenger_count,
  ps.base_fare_usd,
  ps.port_fees_usd,
  ps.gratuities_usd,
  ps.total_out_the_door_usd,
  ps.is_solo_supplement_waived,  -- ← THIS WAS MISSING
  round(ps.total_out_the_door_usd / ps.passenger_count::numeric / NULLIF(s.duration_days, 0)::numeric, 2) AS per_person_per_day_usd,
  CASE
    WHEN ps.passenger_count = 1 AND NOT ps.is_solo_supplement_waived THEN round((ps.base_fare_usd * 2::numeric - ps.base_fare_usd) / NULLIF(ps.base_fare_usd, 0::numeric) * 100::numeric, 2)
    ELSE 0::numeric
  END AS solo_supplement_percent,
  ps.captured_at,
  row_number() OVER (PARTITION BY s.id, ps.cabin_type, ps.passenger_count ORDER BY ps.captured_at DESC) AS rank
FROM sailings s
JOIN pricing_snapshots ps ON ps.sailing_id = s.id
WHERE ps.captured_at >= (now() - '30 days'::interval);
```

Run via psql:

```bash
psql -d triptide -c "DROP VIEW IF EXISTS v_out_the_door_pricing;"
psql -d triptide -c "CREATE VIEW v_out_the_door_pricing AS SELECT s.id AS sailing_id, s.cruise_line, s.ship_name, s.departure_date, s.duration_days, s.departure_port, s.departure_region, s.itinerary, s.destination_region, ps.id AS snapshot_id, ps.cabin_type, ps.passenger_count, ps.base_fare_usd, ps.port_fees_usd, ps.gratuities_usd, ps.total_out_the_door_usd, ps.is_solo_supplement_waived, round(ps.total_out_the_door_usd / ps.passenger_count::numeric / NULLIF(s.duration_days, 0)::numeric, 2) AS per_person_per_day_usd, CASE WHEN ps.passenger_count = 1 AND NOT ps.is_solo_supplement_waived THEN round((ps.base_fare_usd * 2::numeric - ps.base_fare_usd) / NULLIF(ps.base_fare_usd, 0::numeric) * 100::numeric, 2) ELSE 0::numeric END AS solo_supplement_percent, ps.captured_at, row_number() OVER (PARTITION BY s.id, ps.cabin_type, ps.passenger_count ORDER BY ps.captured_at DESC) AS rank FROM sailings s JOIN pricing_snapshots ps ON ps.sailing_id = s.id WHERE ps.captured_at >= (now() - '30 days'::interval);"
```

**Step 2: Verify the column exists**

```bash
psql -d triptide -c "\d+ v_out_the_door_pricing"
```

Expected output includes: `is_solo_supplement_waived | boolean`

**No commit needed** — schema changes only, no code to commit.

---

## Task 2: Add `'running'` to the `sync_status` enum

**Objective:** The `hybridEngine.ts` code inserts `INSERT INTO sync_log (status) VALUES ('running')` and checks `WHERE status = 'running'`. The `sync_status` enum currently has values `{pending, active, completed, failed, stale}` but NOT `'running'`. Adding the value resolves the lock acquisition failure.

**Files:** No TS files changed — only DB enum via psql.

**Step 1: Add the enum value**

```bash
psql -d triptide -c "ALTER TYPE sync_status ADD VALUE 'running';"
```

**Step 2: Verify**

```bash
psql -d triptide -c "SELECT enum_range(NULL::sync_status);"
```

Expected: `{pending,active,completed,failed,stale,running}`

**No commit needed.**

---

## Task 3: Restart backend & verify full sync cycle

**Objective:** Kill the stuck backend, restart with the fixed schema, wait for the initial NIM sync (Phase 1: generate sailings → Phase 2: generate pricing) to complete, then verify data populated correctly.

**Files:** None.

**Step 1: Kill existing backend**

```bash
lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null; sleep 2
```

**Step 2: Start backend in background**

```bash
cd /Users/georgetozer/Development/Portly && npm run server &
```

**Step 3: Wait for sync to complete**

The NIM sync runs `initializeDailySourcingSync()` on startup. With the smaller count (5-9 sailings), each NIM call should complete in ~30-60s. Wait up to 3 minutes:

```bash
sleep 120 && curl -s http://localhost:3001/api/health | python3 -c "import sys,json;d=json.load(sys.stdin);ls=d.get('lastSync');print('status:', ls['status'] if ls else 'null');print('b2bRecords:', ls['b2bRecords'] if ls else 0);print('checkoutSuccesses:', ls['checkoutSuccesses'] if ls else 0)"
```

Expected: `status: completed`

**Step 4: Verify data in DB**

```bash
psql -d triptide -c "SELECT COUNT(*) FROM sailings WHERE sync_status='active';"
psql -d triptide -c "SELECT COUNT(*) FROM pricing_snapshots WHERE captured_by='nim_generator';"
```

Expected: > 0 for both.

**Step 5: Verify deals API works**

```bash
curl -s http://localhost:3001/api/deals?limit=5 | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d), 'deals');print('first:', d[0]['departurePort'], d[0]['departureRegion'] if 'departureRegion' in d[0] else 'N/A') if d else print('empty')"
```

Expected: at least a few deals with `departureRegion` populated.

---

## Task 4: Run test gate

**Objective:** Run the full test suite to confirm no regressions.

**Step 1: Vitest unit tests**

```bash
cd /Users/georgetozer/Development/Portly && npx vitest run
```

Expected: 27/27 passed.

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exit code 0, no output.

**Step 3: Playwright E2E tests**

```bash
npx playwright test
```

Wait 2m+ for full run. Expected: 18/18 passed.

---

## Rollback

If either fix causes issues:

- **View rollback:** `DROP VIEW v_out_the_door_pricing;` → then recreate with the `CREATE VIEW` from the previous migration file (`003-nim-only-data-source.sql`).
- **Enum rollback:** Cannot remove an enum value in PostgreSQL. If `'running'` causes issues, the fallback is to change the hybridEngine.ts code to use `'active'` instead of `'running'` (both in the INSERT and the lock check query).
