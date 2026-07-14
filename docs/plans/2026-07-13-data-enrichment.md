# Data Enrichment & Analytics Expansion Plan

## Goals
1. **Track much more data per sailing** — ship details, amenities, dining, deck info, cabin metadata
2. **Generate better analytics** — deal scores with market context, price forecasts with confidence, destination seasonality, cruise line comparisons
3. **Expand data volume** — from 6 seed sailings to 200+ across all major lines and destinations
4. **Serve richer APIs** — new routes for the enhanced data

## Schema Additions
- `ship_details` — amenities, restaurants, pools, entertainment, year built, passenger capacity
- `destination_insights` — best-value months, avg price per region, seasonality trends
- `market_comparison` — cruise line price positioning, cabin tier benchmarks
- Extra columns on `sailings` — `booking_window_days`, `price_per_person_per_day`, `value_score`

## Implementation
1. Migration: add new tables + columns
2. Sync generator: produce richer sailing data with ship details
3. Analytics: generate market comparisons, destination insights, price forecasts during sync
4. Seed: comprehensive dataset with 200+ real sailings
5. Routes: serve new data
6. Tests: verify everything works
