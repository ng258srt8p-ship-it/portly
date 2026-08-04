# Cruise Data Integrity Audit (2026-08-04)

## Summary

**1,781 total sailings in D1:**
- `scraper`: 81 (real, scraped from cruise line APIs)
- `expander`: 1,200 (synthetic — algorithmically derived)
- `bulk-import`: 500 (synthetic — bulk imported)

**Deals API (`/api/deals?limit=200`):**
- Returns 200 sailings, ALL synthetic: 158 expander + 42 bulk-import
- Returns ZERO scraper sailings
- The deals page renders exclusively fake data

**Why 0 scraper sailings appear in deals:**
- `/api/deals` filters: `WHERE price IS NOT NULL AND sail_date >= date('now')`
- Only 18 of 81 scraper sailings pass this filter (63 have NULL price or sailed already)
- But the 18 eligible scraper sailings still don't appear because the ORDER BY
  and LIMIT favor expander sailings with lower prices

**Price inconsistency on sailing detail pages (even for real data):**
Four different "total" prices render on the same page:
1. SailingHero: `cabinTier.totalOutTheDoor` (base + portTax + gratuity × nights)
2. SailingKeyTakeaways: uses `price` (base fare only) for per-night calc
3. EnhancedDealAnalysis "Hidden Cost Detector": `realTotalCost` (different formula)
4. Cabin Pricing table: `base + taxes + gratuities` (gratuity shown per-night)

**Cabin prices table schema:**
- `total_per_person` is a GENERATED column = `base_fare_per_person + port_tax_per_person`
- It does NOT include gratuity
- The sailing detail endpoint synthesizes OTD as `base + portTax + grat * nights`

**Fake sailing example:**
- `carnival_horizon_2026-03-08_miami_6__big_3__v4m` (Nov 8, 2026)
- Source: `expander` (synthetic)
- Does NOT exist on Carnival.com search (verified by user)
- Renders $176, $503, $448, $504 on different components
