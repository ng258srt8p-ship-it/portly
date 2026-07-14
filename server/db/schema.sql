-- ============================================================================
-- TripTide — Production PostgreSQL Schema
-- Multi-passenger data structure with daily price-change history tracking
-- Engine: PostgreSQL 16
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE cabin_tier AS ENUM (
    'Inside', 'Oceanview', 'Balcony', 'Suite', 'Solo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM (
    'pending', 'active', 'completed', 'failed', 'stale'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLE: sailings
-- Core cruise schedule data
-- ============================================================================

CREATE TABLE IF NOT EXISTS sailings (
    id                  SERIAL PRIMARY KEY,
    cruise_line         VARCHAR(100) NOT NULL,
    cruise_line_slug    VARCHAR(120) GENERATED ALWAYS AS (
                            LOWER(REGEXP_REPLACE(cruise_line, '[^a-zA-Z0-9]', '-', 'g'))
                         ) STORED,
    ship_name           VARCHAR(100) NOT NULL,
    ship_class          VARCHAR(100),
    departure_date      DATE NOT NULL,
    duration_days       INT NOT NULL CHECK (duration_days BETWEEN 1 AND 60),
    departure_port      VARCHAR(100) NOT NULL,
    departure_region    VARCHAR(100),
    itinerary           TEXT[] NOT NULL,
    destination_region  VARCHAR(100),
    total_cabins        INT,
    cabin_categories    cabin_tier[],
    is_repositioning    BOOLEAN DEFAULT FALSE,
    sync_source         VARCHAR(50) DEFAULT 'widgety',
    sync_status         sync_status DEFAULT 'pending',
    last_synced_at      TIMESTAMPTZ,
    raw_payload         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_sailing UNIQUE (cruise_line, ship_name, departure_date)
);

-- ============================================================================
-- TABLE: pricing_snapshots
-- Financial data captured from cruise line portals
-- NOTE: Derived columns (per_person_per_day, solo_supplement_percent, etc.)
-- are computed in the application layer (server/utils/formulas.ts), not as
-- GENERATED columns, because PostgreSQL does not allow subqueries or
-- certain numeric expressions in GENERATED ALWAYS AS expressions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_snapshots (
    id                      SERIAL PRIMARY KEY,
    sailing_id              INT NOT NULL REFERENCES sailings(id) ON DELETE CASCADE,
    cabin_type              cabin_tier NOT NULL,
    passenger_count         INT NOT NULL CHECK (passenger_count BETWEEN 1 AND 4),

    -- Core financial columns (all in USD)
    base_fare_usd           NUMERIC(10, 2) NOT NULL CHECK (base_fare_usd >= 0),
    port_fees_usd           NUMERIC(10, 2) NOT NULL CHECK (port_fees_usd >= 0),
    gratuities_usd          NUMERIC(10, 2) NOT NULL CHECK (gratuities_usd >= 0),

    -- Total out-the-door (immutable: only references its own row)
    total_out_the_door_usd  NUMERIC(10, 2) GENERATED ALWAYS AS (
                                base_fare_usd + port_fees_usd + gratuities_usd
                             ) STORED,

    -- Solo supplement flag
    is_solo_supplement_waived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Audit trail
    captured_by             VARCHAR(50) DEFAULT 'stealth_browser',
    captured_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_checkout_payload    JSONB,

    CONSTRAINT fk_sailing FOREIGN KEY (sailing_id) REFERENCES sailings(id)
);

-- ============================================================================
-- TABLE: pricing_history
-- Immutable daily snapshot log for time-series trend charts
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_history (
    id              SERIAL PRIMARY KEY,
    snapshot_id     INT NOT NULL REFERENCES pricing_snapshots(id) ON DELETE CASCADE,
    sailing_id      INT NOT NULL REFERENCES sailings(id) ON DELETE CASCADE,
    cabin_type      cabin_tier NOT NULL,
    passenger_count INT NOT NULL CHECK (passenger_count BETWEEN 1 AND 4),
    base_fare_usd   NUMERIC(10, 2) NOT NULL,
    port_fees_usd   NUMERIC(10, 2) NOT NULL,
    gratuities_usd  NUMERIC(10, 2) NOT NULL,
    total_usd       NUMERIC(10, 2) NOT NULL,
    recorded_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_daily_price UNIQUE (sailing_id, cabin_type, passenger_count, recorded_date)
);

-- ============================================================================
-- TABLE: price_alerts
-- User-defined threshold alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_alerts (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(100) NOT NULL,
    sailing_id      INT NOT NULL REFERENCES sailings(id) ON DELETE CASCADE,
    cabin_type      cabin_tier NOT NULL,
    passenger_count INT NOT NULL CHECK (passenger_count BETWEEN 1 AND 4),
    target_price    NUMERIC(10, 2) NOT NULL CHECK (target_price > 0),
    is_active       BOOLEAN DEFAULT TRUE,
    last_triggered  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: sync_log
-- Audit trail for the hybrid engine's daily runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_log (
    id              SERIAL PRIMARY KEY,
    sync_type       VARCHAR(50) NOT NULL CHECK (sync_type IN ('b2b_schedule', 'stealth_checkout', 'full')),
    status          sync_status NOT NULL DEFAULT 'pending',
    records_fetched INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================================
-- VIEW: v_out_the_door_pricing
-- Denormalized view for rapid API responses
-- ============================================================================

CREATE OR REPLACE VIEW v_out_the_door_pricing AS
SELECT
    s.id                                                                    AS sailing_id,
    s.cruise_line,
    s.ship_name,
    s.departure_date,
    s.duration_days,
    s.departure_port,
    s.departure_region,
    s.itinerary,
    s.destination_region,
    ps.id                                                                   AS snapshot_id,
    ps.cabin_type,
    ps.passenger_count,
    ps.base_fare_usd,
    ps.port_fees_usd,
    ps.gratuities_usd,
    ps.total_out_the_door_usd,
    ROUND(ps.total_out_the_door_usd / ps.passenger_count / NULLIF(s.duration_days, 0), 2) AS per_person_per_day_usd,
    ps.is_solo_supplement_waived,
    CASE
        WHEN ps.passenger_count = 1 AND NOT ps.is_solo_supplement_waived THEN
            ROUND(((ps.base_fare_usd * 2) - ps.base_fare_usd) / NULLIF(ps.base_fare_usd, 0) * 100, 2)
        ELSE 0
    END                                                                     AS solo_supplement_percent,
    ps.captured_at,
    s.booking_url,
    s.deal_analysis,
    s.deal_analysis_generated_at,
    ROW_NUMBER() OVER (
        PARTITION BY s.id, ps.cabin_type, ps.passenger_count
        ORDER BY ps.captured_at DESC
    )                                                                       AS rank
FROM sailings s
JOIN pricing_snapshots ps ON ps.sailing_id = s.id
WHERE ps.captured_at >= NOW() - INTERVAL '30 days';

-- ============================================================================
-- VIEW: v_solo_friendly
-- Surfaces cruises where solo supplement is waived or ≤25%
-- ============================================================================

CREATE OR REPLACE VIEW v_solo_friendly AS
SELECT DISTINCT ON (s.id)
    s.id                                                                    AS sailing_id,
    s.cruise_line,
    s.ship_name,
    s.departure_date,
    s.duration_days,
    s.departure_port,
    s.destination_region,
    ps.cabin_type,
    ps.total_out_the_door_usd                                               AS solo_total,
    ROUND(ps.total_out_the_door_usd / NULLIF(s.duration_days, 0), 2)        AS solo_per_day,
    CASE
        WHEN ps.is_solo_supplement_waived THEN 0
        WHEN ps.passenger_count = 1 THEN ROUND(((ps.base_fare_usd * 2) - ps.base_fare_usd) / NULLIF(ps.base_fare_usd, 0) * 100, 2)
        ELSE 0
    END                                                                     AS solo_supplement_percent,
    ps.is_solo_supplement_waived,
    CASE
        WHEN ps.is_solo_supplement_waived THEN 'waived'
        WHEN ps.passenger_count = 1 AND ROUND(((ps.base_fare_usd * 2) - ps.base_fare_usd) / NULLIF(ps.base_fare_usd, 0) * 100, 2) <= 25 THEN 'low'
        ELSE 'standard'
    END                                                                     AS solo_category
FROM sailings s
JOIN pricing_snapshots ps ON ps.sailing_id = s.id
WHERE ps.passenger_count = 1
  AND (ps.is_solo_supplement_waived = TRUE
       OR ROUND(((ps.base_fare_usd * 2) - ps.base_fare_usd) / NULLIF(ps.base_fare_usd, 0) * 100, 2) <= 25)
ORDER BY s.id, solo_supplement_percent ASC;

-- ============================================================================
-- VIEW: v_price_trends
-- Daily price history for chart visualization
-- ============================================================================

CREATE OR REPLACE VIEW v_price_trends AS
SELECT
    ph.sailing_id,
    s.cruise_line,
    s.ship_name,
    s.duration_days,
    ph.cabin_type,
    ph.passenger_count,
    ph.total_usd,
    ph.recorded_date,
    ph.total_usd - LAG(ph.total_usd) OVER (
        PARTITION BY ph.sailing_id, ph.cabin_type, ph.passenger_count
        ORDER BY ph.recorded_date
    )                                                                       AS day_over_day_change
FROM pricing_history ph
JOIN sailings s ON s.id = ph.sailing_id
ORDER BY ph.recorded_date DESC;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pricing_lookup
    ON pricing_snapshots (cabin_type, passenger_count, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_sailing_schedule
    ON sailings (departure_date, cruise_line);

CREATE INDEX IF NOT EXISTS idx_pricing_sailing_cabin
    ON pricing_snapshots (sailing_id, cabin_type, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_solo
    ON pricing_snapshots (passenger_count, is_solo_supplement_waived)
    WHERE passenger_count = 1;

CREATE INDEX IF NOT EXISTS idx_alerts_user_active
    ON price_alerts (user_id, is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_alerts_sailing_target
    ON price_alerts (sailing_id, cabin_type, passenger_count, target_price)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_price_history_trend
    ON pricing_history (sailing_id, cabin_type, passenger_count, recorded_date DESC);

-- ============================================================================
-- TRIGGER: auto-update updated_at on sailings
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sailings_updated_at ON sailings;
CREATE TRIGGER trg_sailings_updated_at
    BEFORE UPDATE ON sailings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_price_alerts_updated_at ON price_alerts;
CREATE TRIGGER trg_price_alerts_updated_at
    BEFORE UPDATE ON price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: archive daily snapshot to pricing_history on insert
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_pricing_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pricing_history (
        snapshot_id, sailing_id, cabin_type, passenger_count,
        base_fare_usd, port_fees_usd, gratuities_usd, total_usd, recorded_date
    ) VALUES (
        NEW.id, NEW.sailing_id, NEW.cabin_type, NEW.passenger_count,
        NEW.base_fare_usd, NEW.port_fees_usd, NEW.gratuities_usd,
        NEW.total_out_the_door_usd, CURRENT_DATE
    )
    ON CONFLICT (sailing_id, cabin_type, passenger_count, recorded_date)
    DO UPDATE SET
        snapshot_id = EXCLUDED.snapshot_id,
        base_fare_usd = EXCLUDED.base_fare_usd,
        port_fees_usd = EXCLUDED.port_fees_usd,
        gratuities_usd = EXCLUDED.gratuities_usd,
        total_usd = EXCLUDED.total_usd;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archive_pricing ON pricing_snapshots;
CREATE TRIGGER trg_archive_pricing
    AFTER INSERT ON pricing_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION archive_pricing_snapshot();
