# Goal-Loop #4: Fix Data Ingestion + Alert Emails

**Date:** 2026-07-26
**Branch:** main (continues on `5ad841a`)
**Owner:** George

## Problem Statement

Two clearly scoped problems:

1. **D1 has only 81 sailings across 13 lines (avg 6/line)** — too sparse for a credible cruise price tracker. Cruise lines have 30-100+ active sailings each. The cron triggered every 30 min but the `scheduledHandler` only does AI enrichment — it has no ingestion step. The scrapers (scrapers/run.ts) are stubbed static arrays that have to be run manually (and only add ~22 base sailings).

2. User wants **Phase 2 from prior loop**: cron-driven alert emails when a sailing crosses AI score threshold ≥ 85 ("Exceptional buy now"). The `alerts` table already exists from `002_alerts.sql`. Need: trigger evaluation on cron + dedupe + email dispatch.

## Constraints & Preferences

- Workers can't run headless Chrome (no real external scraping). Must generate data deterministically in-Worker.
- Free Tier: Workers AI 10k neurons/day. Mail providers: Resend free = 100/day (3,000/mo) — fine for alert volume.
- Don't fabricate cabin prices beyond realistic per-tier multipliers (Inside 0.7×, Oceanview 0.9×, Balcony 1.3×, Suite 2.4× is industry standard)
- BUILD_TARGET=export still
- Playwright-first verification

## Phased Plan

### Phase 1 — Fix Data Ingestion (Worker-side scheduled expander)

| Step | Action |
|---|---|
| 1.1 | Analyze: each existing sailing becomes a "base itinerary". Generate 6 dated variants per sailing: departures +1mo, +2mo, +3mo, +4mo, +6mo, +9mo from original `sail_date`. |
| 1.2 | **New module `workers/src/ingest-expander.ts`:** takes existing sailings, generates dated variants with realistic price drift (±5-15% from base price based on shoulder/peak/last-minute). |
| 1.3 | **Wire into `scheduledHandler`**: every cron tick, run `runIngestExpansionTick(env, { maxPerTick: 10 })` BEFORE `runEnrichmentTick`. Idempotent (dedupe on computed fingerprint). |
| 1.4 | Add `POST /api/admin/ingest-tick` admin endpoint to trigger manually. |
| 1.5 | Preserve original 81 sailings as "real" (don't overwrite); add new as "synthetic variants" so future manual updates don't conflict. |
| 1.6 | Target: 5× expansion → 400+ sailings in D1. |

### Phase 2 — Alert Emails

| Step | Action |
|---|---|
| 2.1 | Extend `alerts` table: add `last_alerted_at` TEXT NULL (dedupe window), `last_alerted_score` REAL NULL (avoid re-alerting unchanged), `alert_frequency_days` INTEGER DEFAULT 7 (min days between alerts for same user+sailing). Applied via `schema/005_alerts_email.sql` |
| 2.2 | Add `alert_email_log` table: (id, alert_id, sent_at, sailing_id, score, message_id TEXT NULL) — so we can dedupe mail sends. |
| 2.3 | **New module `workers/src/alert-evaluator.ts`**: for each alert subscription, fetch the sailing's current `ai_score` (or heuristic `dealScore`), match against `alert_threshold` (configurable, default 85). Skip if `last_alerted_at` within `alert_frequency_days`. Returns list of `PendingAlert`. |
| 2.4 | **New module `workers/src/email-sender.ts`**: abstract email provider. Default to Resend (`https://api.resend.com/emails`), fallback to Cloudflare Email Workers (when configured). Reads `RESEND_API_KEY` from env secret. |
| 2.5 | **Wire alert evaluation into `scheduledHandler`**: on each tick, after enrichment, call `runAlertEvaluationTick(env, { maxPerTick: 10 })`. Cap at 10 alerts/tick to stay in Resend free tier (100/day = 24 ticks × ~4 alerts/tick). |
| 2.6 | Add `POST /api/admin/alert-tick` for manual trigger. |
| 2.7 | Email body HTML: ship, line, departure date, current price + drop %, AI score, "Track Price Alert" link to the sailing page. Plain-text fallback. |
| 2.8 | Set up Resend env secret `RESEND_API_KEY`. Test from / from email (Resend requires onboarding@sailing-tracker… domain or on@resend.dev sandbox). |

### Phase 3 — Verification

| Gate | Pass criteria |
|---|---|
| Sailings count | `SELECT count(*)` increases after `/api/admin/ingest-tick` |
| Alert emails | `POST /api/admin/alert-tick` returns sent > 0 when sailings with AI score ≥ 85 exist and alerts table has matching subscriptions |
| Dedupe | Second alert-tick returns sent: 0 for same alerts |
| Build | Clean |
| E2E | Funnel 4/4 + Enrichment 5/5 + new `e2e/alerts.spec.ts` PASS |
| Real email | Manual: send a test alert to a real email and confirm receipt (or check Resend logs) |

## Out of Scope

- ❌ Real cruise line API integration (would need genuine scraping infra)
- ❌ Alert SMS (email only for now)
- ❌ Alert frequency user-configuration UI (default 7d is fine)
- ❌ Activity log visualization (data exists in `alert_email_log` table for future)
