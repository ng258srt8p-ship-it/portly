**Objective:** Implement real booking URLs for all 507 sailings, add "Book Now" buttons on deal cards, unblock the sync pipeline with provider fallbacks, expand seed data as backup, and add affiliate tracking — creating a shippable purchase path for every cruise.

**Read first:** 
- `.hermes/plans/2026-07-14-fill-db-booking-links-refined.md`
- `server/routes/cruises.ts`
- `src/components/DealsGrid.tsx`
- `src/types/cruise.ts`
- `server/utils/openCodeClient.ts`
- `server/services/hybridEngineOptimized.ts`
- `server/services/syncGeneratorOptimized.ts`
- `server/db/seedExpanded.ts`

**Constraints:**
- No changes to public API contracts (deal card shape, sailing detail response)
- No new npm dependencies without explicit approval
- Follow existing code patterns (TypeScript strict, Prettier, existing component structure)
- Keep sync engine running on 4-hour schedule; do not break existing cron
- Affiliate IDs from `.env` only — no hardcoded secrets
- Do not delete, skip, weaken, or narrow tests to make gates pass

**Validate:** `npx tsc --noEmit` (client) && `cd server && npx tsc --noEmit --skipLibCheck` (server) after each phase

**Document:** Write concise, targeted documentation for all changes — create new `.md` files or update existing docs as needed.

**Checkpoints:** Work in phases (1→2→3→4→5), log progress briefly after each phase completion.

**Stop when:** All 5 phases verified by their gates below, OR when a phase requires human/product input (new deps, architecture decisions, affiliate program approvals).

---

### Phase Gates (must pass before advancing)

**Phase 1 — Real Booking URLs:**
- `npx ts-node server/db/generateRealBookingUrls.ts` completes without errors
- `psql triptide -c "SELECT COUNT(*) FROM sailings WHERE booking_url IS NULL OR booking_url = '';"` returns 0
- Manual spot-check: 5 random sailings per cruise line → "Book This Cruise" opens correct sailing on cruise line site

**Phase 2 — Deal Card Booking Buttons:**
- `npx tsc --noEmit` = 0 errors
- `curl -s localhost:3001/api/deals | jq '.[] | select(.bookingUrl) | .bookingUrl'` returns URLs for 100% of deals
- Visit `/deals` → every card shows both "Book Now" (green, external) and "View Deal" (ink, internal)

**Phase 3 — Sync Pipeline Unblocked:**
- `curl -X POST localhost:3001/api/admin/trigger-sync` completes without 429 errors
- Logs show provider fallback chain executing (OpenCode → Groq → OpenRouter → Ollama)
- Sync finishes or fails gracefully with clear error, not silent hang

**Phase 4 — Seed Expansion (only if Phase 3 unreliable after 1 week):**
- `npx ts-node server/db/seedExpanded.ts` runs without errors
- Sailings count ≥ 750
- All new sailings have `booking_url` populated

**Phase 5 — Affiliate Tracking:**
- `curl -s "http://localhost:3000/sailing/<id>"` → "Book This Cruise" URL contains `utm_source=triptide`
- `POST /api/track/click` returns 200 and logs click
- `.env` has all 8 cruise line affiliate IDs configured

---

### Files to Create/Modify (by phase)

| Phase | Files |
|-------|-------|
| 1 | `server/db/generateRealBookingUrls.ts` (NEW) |
| 2 | `src/types/cruise.ts`, `server/routes/cruises.ts`, `src/components/DealsGrid.tsx` |
| 3 | `server/utils/openCodeClient.ts`, `server/services/hybridEngineOptimized.ts`, `server/services/syncGeneratorOptimized.ts` |
| 4 | `server/db/seedExpanded.ts` (expand) |
| 5 | `server/routes/clicks.ts` (NEW), `.env` (add affiliate IDs) |

---

### Progress Log Format (update after each phase)

```
[PHASE N] ✅|⚠️|❌ — <one-line outcome>
  - Key metrics: <numbers>
  - Blockers: <none or description>
  - Next: <what Phase N+1 needs>
```