# Goal Loop — Fix Cruise Line Data & De-dupe Routes

## Objective
Fix the backend so that ALL major cruise lines (Royal Caribbean, Norwegian, Princess, Carnival, Celebrity, MSC, Disney, Holland America) appear with a healthy number of sailings each, and remove duplicate line names ("Holland America" / "Holland America Line", "Royal Caribbean" / "Royal Caribbean International") from appearing as separate entries.

## Diagnosis

| Problem | Evidence | Root Cause |
|---------|----------|------------|
| Only Royal Caribbean shows | API `/api/deals?limit=20` returns 20 entries, all `cruiseLine='Royal Caribbean'` | Frontend defaults `limit=20`; default sort is `price-asc`; Royal Caribbean has the cheapest sailings |
| Duplicate line names | DB has `Royal Caribbean`, `Royal Caribbean International`, `Holland America`, `Holland America Line`, `Celebrity`, `Celebrity Cruises` | seedExpanded.ts & seed.ts have inconsistent names; naming should unify |
| Low counts for some lines | Disney=67, Holland America=51+25, Celebrity=13 | Only a few ships per line; no dedicated sailings beyond what seedExpanded generated |
| `sync_status = 'stale'` | 230 sailings have stale status; sync returns `Count:0` in stats endpoint | Sync engine may not be running/re-scanning |

## Resolution Plan

### Phase A: Fix Cruise Line Name Consistency
1. Identify all unique `cruise_line` values in `sailings` table
2. Create a normalization map:
   - "Royal Caribbean International" → "Royal Caribbean"
   - "Holland America Line" → "Holland America"
   - "Celebrity" → "Celebrity Cruises"
3. Update all sailings records with corrected names
4. Verify no duplicates remain

### Phase B: Fix Sync Status
1. Set all sailings to `sync_status = 'active'` (they're seeded, not stale)
2. Verify stats endpoint counts increase
3. Check if hybrid engine sync is running; if not, run a sync cycle

### Phase C: Verify Deal Visibility
1. Call `/api/deals?limit=100&sort=price-asc` — confirm all lines appear
2. Call `/api/deals?limit=20` — confirm ~3-4 sailings per line
3. Call `/api/search` with filter params — confirm filtering works
4. Check frontend deals grid renders other lines correctly

### Phase D: Seed Additional Sailings (if counts too low)
1. Count sailings per line; if any line < 15 sailings, add more
2. Use `makeSailings()` pattern from seedExpanded.ts
3. Run `seedExpanded.ts` again (run_sync_only mode with patched data)

### Phase E: Verify
1. Run Playwright filter test `filter-resize.spec.ts` — verify count > 5 per line
2. Call all endpoints, confirm data shape correct

---

## Constraints
- No new dependencies
- Only fix data inconsistency and sync status
- Keep ship details, itineraries, pricing intact
- Use existing `psql` CLI to apply SQL fixes directly

## Validation
- `psql -U georgetozer -d triptide -c "SELECT cruise_line, COUNT(*) FROM sailings GROUP BY cruise_line ORDER BY COUNT DESC;"` should show all lines with ≥25 sailings each
- No duplicate line names (after normalization)
- Stats endpoint returns total sailings > 200
- `/api/deals?limit=50` returns ≥40 unique cruise lines (most lines appear at least once)

## Checkpoints
1. Phase A complete — line names normalized
2. Phase B complete — sync status fixed, stats API updated
3. Phase C complete — all endpoints return expected data
4. Phase D complete — counts ≥25 per line
5. Phase E complete — Playwright tests pass

## Stop Conditions
- All line names are unique (8 lines, no duplicates)
- All sailings have `sync_status = 'active'`
- Stats endpoint shows correct count (724)
- `/api/deals?limit=20` returns sailings from 8 different lines
- Playwright filter-resize tests pass
- Playwright cruise-lines tests pass (8/8 lines found)

---

## Execution Notes
- Use `psql` directly for data fixes (no code change needed)
- Then run `seedExpanded.ts` if counts are still low
- Restart server if needed to reload data
- Verify all endpoints before writing any code
