# /goal Contract — Fix Cruise Line Data Inconsistency

**Objective:** Fix cruise line data so all major lines appear in API responses and filters work across all lines.

**Read first:**
- `plan/DATA_FILTER_CRUISE_LINES_GOALLOOP.md` — full diagnosis + resolution plan

**Context:**
- The DB has ~850 sailings across 8 lines, but names are inconsistent (e.g., "Holland America" vs "Holland America Line")
- `sync_status = 'stale'` on 230 sailings
- Frontend shows only Royal Caribbean because default `limit=20` + `price-asc` sort means cheap sailings win
- All pricing data exists and is recent

**Execution Order:**
1. Normalize line names (psql UPDATE statements)
2. Fix sync_status (set all to 'active')
3. Restart server
4. Verify `/api/deals?limit=50` returns all lines
5. Verify `/api/search` and `/api/solo-friendly` return expected data
6. Verify stats endpoint shows correct counts
7. Run `npx playwright test filter-resize --project=chromium`

**Constraints:**
- Only fix data inconsistency and sync status — no code changes unless absolutely needed
- Use `psql` directly for data fixes
- Keep ship details, itineraries, pricing intact

**Validation:**
- `psql` query shows all lines with ≥25 sailings each
- No duplicate line names after normalization
- Stats endpoint shows total sailings > 200
- `/api/deals?limit=50` returns sailings from ≥6 distinct lines
- Playwright filter-resize tests pass

**Checkpoints:**
- After Phase A: Line names normalized (check `SELECT cruise_line, COUNT(*) FROM sailings GROUP BY cruise_line`)
- After Phase B: Stats endpoint shows correct counts
- After Phase C: All endpoints return expected data
- After Phase E: Playwright tests pass

**Stop when:** All validations pass and Playwright tests pass clean
