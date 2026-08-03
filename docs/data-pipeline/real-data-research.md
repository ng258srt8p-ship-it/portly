# Real Data Pipeline Research — Fake Data Provenance Audit

> Created: 2026-08-03 | Status: ACTIVE — synthetic generators disabled

## Executive Summary

The Portly/TripTide sailing database contains **3,567 rows, 0% real data**. Every sailing is either a hand-typed stub or a procedurally generated variant with synthetic prices, dates, and physically impossible departure ports.

## Data Provenance Audit

| Source | Count | % | What It Actually Is |
|--------|-------|---|---------------------|
| expander | 2,986 | 83.7% | ingest-expander.ts — copies each base 6x with date shifts + synthetic price drift |
| bulk-import | 500 | 14.0% | bulk-import.ts — random departure ports from PORT_POOL + random nights |
| scraper | 81 | 2.3% | scraper-data.ts — hardcoded array of 81 hand-typed records. Not a scraper. |

## Carnival Horizon Case Study

URL `/sailing/carnival_horizon_2026-03-08_miami_6__big_10__v4m` shows a 3-night cruise from Athens to Amber Cove (Dominican Republic) — physically impossible. Created by: base stub (Miami) -> bulk import assigned Athens + 3 nights -> expander shifted to June 2027.

## Scale: 325 impossible port assignments (athens:175, southampton:50, amsterdam:50, rome:25, barcelona:25)

## Architecture: External Scraper -> Worker API

1. External scraper (GitHub Actions cron, daily): Playwright extracts structured data from cruise line search pages, POSTs to Worker
2. Worker endpoint /api/admin/ingest-real: validates port/itinerary consistency, INSERT OR REPLACE with source=real-scraper
3. Scheduled handler: KEEP enrichment + alerts, DISABLE expander + bulk-import + price drift
4. D1 cleanup: DELETE FROM sailings WHERE source IN ('expander','bulk-import')
