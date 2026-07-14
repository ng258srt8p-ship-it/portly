-- ============================================================================
-- TripTide v2 — Data Enrichment Migration
-- New tables for ship details, destination insights, and market analytics
-- ============================================================================

-- ============================================================================
-- TABLE: ship_details
-- Rich metadata about each cruise ship
-- ============================================================================

CREATE TABLE IF NOT EXISTS ship_details (
    id              SERIAL PRIMARY KEY,
    ship_name       VARCHAR(100) UNIQUE NOT NULL,
    cruise_line     VARCHAR(100) NOT NULL,
    ship_class      VARCHAR(100),
    year_built      INT CHECK (year_built BETWEEN 1990 AND 2030),
    passenger_capacity INT CHECK (passenger_capacity BETWEEN 100 AND 10000),
    crew_count      INT,
    tonnage         INT,
    restaurants     TEXT[] DEFAULT '{}',
    pools           INT DEFAULT 0,
    entertainment   TEXT[] DEFAULT '{}',
    amenities       TEXT[] DEFAULT '{}',
    deck_count      INT DEFAULT 0,
    cabin_count     INT DEFAULT 0,
    image_url       VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: destination_insights
-- Market intelligence per destination region
-- ============================================================================

CREATE TABLE IF NOT EXISTS destination_insights (
    id                      SERIAL PRIMARY KEY,
    destination_region       VARCHAR(100) NOT NULL UNIQUE,
    avg_price_ppd           NUMERIC(10,2),           -- Average per-person-per-day across all sailings
    best_value_months       TEXT[],                    -- E.g., {'September', 'October', 'November'}
    peak_season_months      TEXT[],
    shoulder_months         TEXT[],
    avg_duration_days       NUMERIC(4,1),
    total_active_sailings   INT DEFAULT 0,
    top_cruise_lines        TEXT[] DEFAULT '{}',
    price_trend             VARCHAR(20) DEFAULT 'stable',  -- rising | falling | stable
    trend_pct               NUMERIC(5,2) DEFAULT 0,
    last_updated            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: market_comparisons
-- Cruise line pricing benchmarks
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_comparisons (
    id                      SERIAL PRIMARY KEY,
    cruise_line             VARCHAR(100) NOT NULL UNIQUE,
    avg_price_ppd           NUMERIC(10,2),
    min_price_ppd           NUMERIC(10,2),
    max_price_ppd           NUMERIC(10,2),
    avg_duration_days       NUMERIC(4,1),
    destination_count       INT DEFAULT 0,
    sailing_count           INT DEFAULT 0,
    overall_rating          NUMERIC(3,1) CHECK (overall_rating BETWEEN 0 AND 10),
    best_value_rating       NUMERIC(3,1) CHECK (best_value_rating BETWEEN 0 AND 10),
    last_updated            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: price_forecasts
-- AI-generated price forecasts per sailing
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_forecasts (
    id                      SERIAL PRIMARY KEY,
    sailing_id              INT NOT NULL REFERENCES sailings(id) ON DELETE CASCADE,
    cabin_type              cabin_tier NOT NULL,
    current_price_usd       NUMERIC(10,2),
    forecast_7d             NUMERIC(10,2),
    forecast_30d            NUMERIC(10,2),
    confidence_score        NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    trend_direction         VARCHAR(20) DEFAULT 'stable',
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_forecast UNIQUE (sailing_id, cabin_type, generated_at)
);

-- ============================================================================
-- TABLE: booking_insights
-- When to book for best value
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_insights (
    id                      SERIAL PRIMARY KEY,
    destination_region      VARCHAR(100) NOT NULL UNIQUE,
    optimal_booking_window  VARCHAR(100),   -- "3-6 months before departure"
    avg_days_before_departure INT,
    last_minute_deal_score  NUMERIC(3,1) CHECK (last_minute_deal_score BETWEEN 0 AND 10),
    early_bird_discount_pct NUMERIC(5,2),
    last_updated            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ship_details_name ON ship_details (ship_name);
CREATE INDEX IF NOT EXISTS idx_ship_details_line ON ship_details (cruise_line);
CREATE INDEX IF NOT EXISTS idx_destination_insights_region ON destination_insights (destination_region);
CREATE INDEX IF NOT EXISTS idx_market_comparisons_line ON market_comparisons (cruise_line);
CREATE INDEX IF NOT EXISTS idx_price_forecasts_sailing ON price_forecasts (sailing_id, cabin_type);
