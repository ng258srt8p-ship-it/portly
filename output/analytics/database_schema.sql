-- ============================================================
-- Portly Cruise Platform — Production Database Schema
-- Designed for: Cruise pricing tracking, multi-passenger booking,
--               solo pricing, daily price history, push alerts
-- Engine: PostgreSQL 16 with TimescaleDB extension
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE cabin_tier AS ENUM ('interior', 'oceanview', 'balcony', 'suite', 'specialty');
CREATE TYPE deal_rating AS ENUM ('hot', 'great', 'good', 'average', 'poor');
CREATE TYPE alert_type AS ENUM ('price_drop', 'price_rise', 'solo_deal', 'new_deal', 'last_minute');
CREATE TYPE alert_channel AS ENUM ('push', 'email', 'sms', 'webhook');
CREATE TYPE booking_status AS ENUM ('watching', 'price_dropped', 'ready_to_book', 'booked', 'expired');
CREATE TYPE passenger_type AS ENUM ('adult', 'child', 'infant', 'solo');

-- ============================================================
-- CRUISE LINES & SHIPS
-- ============================================================

CREATE TABLE cruise_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    logo_url        TEXT,
    website         TEXT,
    rating          DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cruise_line_id  UUID NOT NULL REFERENCES cruise_lines(id),
    name            VARCHAR(200) NOT NULL,
    year_built      SMALLINT,
    passenger_capacity SMALLINT,
    crew_count      SMALLINT,
    tonnage         INTEGER,
    image_url       TEXT,
    amenities       JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cruise_line_id, name)
);

-- ============================================================
-- CRUISES (ITINERARIES)
-- ============================================================

CREATE TABLE cruises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(100),              -- CruisePlum/Cruise line reference ID
    name            VARCHAR(300) NOT NULL,
    slug            VARCHAR(320) NOT NULL UNIQUE,
    cruise_line_id  UUID NOT NULL REFERENCES cruise_lines(id),
    ship_id         UUID REFERENCES ships(id),
    destination     VARCHAR(100),
    region          VARCHAR(100),
    duration        SMALLINT NOT NULL CHECK (duration > 0), -- in nights
    departure_port  VARCHAR(100),
    departure_region VARCHAR(100),
    itinerary       JSONB NOT NULL DEFAULT '[]', -- Array of {day, date, port, arrival, departure}
    description     TEXT,
    highlights      TEXT[],
    images          JSONB DEFAULT '[]',
    rating          DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    review_count    INTEGER DEFAULT 0,
    scraped_from    VARCHAR(500),              -- Source URL
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CABIN TYPES (Normalized + Original Mappings)
-- ============================================================

CREATE TABLE cabin_types (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cruise_id           UUID NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
    tier                cabin_tier NOT NULL,
    normalized_name     VARCHAR(100) NOT NULL,  -- Our name: "Interior", "Oceanview", etc.
    original_name       VARCHAR(200) NOT NULL,  -- Cruise line's name: "Studio Stateroom", "Promenade View", etc.
    description         TEXT,
    max_occupancy       SMALLINT DEFAULT 2,
    has_balcony         BOOLEAN DEFAULT false,
    sqft_min            SMALLINT,
    sqft_max            SMALLINT,
    amenities           JSONB DEFAULT '[]',
    image_url           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRICING (Current + Historical via TimescaleDB)
-- ============================================================

-- Hyper table for time-series pricing data
CREATE TABLE pricing_history (
    time                TIMESTAMPTZ NOT NULL,
    cruise_id           UUID NOT NULL REFERENCES cruises(id),
    cabin_type_id       UUID NOT NULL REFERENCES cabin_types(id),
    base_fare           DECIMAL(10,2) NOT NULL CHECK (base_fare >= 0),
    taxes_and_fees      DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (taxes_and_fees >= 0),
    gratuities_per_person DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (gratuities_per_person >= 0),
    total_per_person    DECIMAL(10,2) NOT NULL CHECK (total_per_person >= 0),
    per_person_per_day  DECIMAL(8,2) CHECK (per_person_per_day >= 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    solo_supplement_pct DECIMAL(5,2) DEFAULT 100, -- 100% = double occupancy price
    is_promo            BOOLEAN DEFAULT false,
    promo_details       TEXT,
    available           BOOLEAN DEFAULT true,
    source              VARCHAR(50),  -- 'scraped', 'manual', 'partner_api'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
-- SELECT create_hypertable('pricing_history', 'time', chunk_time_interval => INTERVAL '7 days');

CREATE TABLE current_pricing (
    cruise_id           UUID NOT NULL REFERENCES cruises(id),
    cabin_type_id       UUID NOT NULL REFERENCES cabin_types(id),
    base_fare           DECIMAL(10,2) NOT NULL,
    taxes_and_fees      DECIMAL(10,2) NOT NULL DEFAULT 0,
    gratuities_per_person DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_per_person    DECIMAL(10,2) NOT NULL,
    per_person_per_day  DECIMAL(8,2),
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    solo_supplement_pct DECIMAL(5,2) DEFAULT 100,
    is_promo            BOOLEAN DEFAULT false,
    promo_details       TEXT,
    available           BOOLEAN DEFAULT true,
    deal_rating         deal_rating,
    price_drop_pct      DECIMAL(5,2),  -- % drop from 7-day average
    lowest_price_30d    DECIMAL(10,2),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cruise_id, cabin_type_id),
    FOREIGN KEY (cabin_type_id) REFERENCES cabin_types(id)
);

-- ============================================================
-- PRICE HISTORY AGGREGATES
-- ============================================================

CREATE MATERIALIZED VIEW daily_price_summary AS
SELECT
    time::DATE as date,
    cruise_id,
    cabin_type_id,
    MIN(total_per_person) as lowest_price,
    MAX(total_per_person) as highest_price,
    AVG(total_per_person) as avg_price,
    COUNT(*) as data_points
FROM pricing_history
WHERE time >= NOW() - INTERVAL '90 days'
GROUP BY date, cruise_id, cabin_type_id
ORDER BY date DESC;

-- ============================================================
-- USERS & ACCOUNTS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    preferences     JSONB DEFAULT '{}',
    email_verified  BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

-- ============================================================
-- WATCHLISTS (Saved Cruises)
-- ============================================================

CREATE TYPE booking_status AS ENUM ('watching', 'price_dropped', 'ready_to_book', 'booked', 'expired');

CREATE TABLE watchlist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cruise_id       UUID NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
    cabin_type_id   UUID REFERENCES cabin_types(id),
    target_price    DECIMAL(10,2),  -- Alert when price drops below this
    notes           TEXT,
    status          booking_status NOT NULL DEFAULT 'watching',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, cruise_id)
);

-- ============================================================
-- PRICE ALERTS
-- ============================================================

CREATE TABLE price_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cruise_id       UUID NOT NULL REFERENCES cruises(id),
    cabin_type_id   UUID REFERENCES cabin_types(id),
    alert_type      alert_type NOT NULL,
    threshold_price DECIMAL(10,2),  -- Trigger when price crosses this
    threshold_pct   DECIMAL(5,2),   -- Trigger when price changes by this %
    channel         alert_channel NOT NULL DEFAULT 'push',
    destination     VARCHAR(500),   -- email address, phone, webhook URL
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOLO SUPPLEMENT TRACKING
-- ============================================================

CREATE VIEW solo_friendly_cruises AS
SELECT
    c.id as cruise_id,
    cl.name as cruise_line,
    c.name as cruise_name,
    c.duration,
    c.departure_port,
    ct.tier,
    ct.normalized_name,
    cp.total_per_person,
    cp.solo_supplement_pct,
    CASE
        WHEN cp.solo_supplement_pct <= 0 THEN '🟢 No supplement'
        WHEN cp.solo_supplement_pct <= 25 THEN '🟢 Low supplement'
        WHEN cp.solo_supplement_pct <= 50 THEN '🟡 Moderate supplement'
        WHEN cp.solo_supplement_pct <= 100 THEN '🟠 Standard supplement'
        ELSE '🔴 High supplement'
    END as solo_rating,
    (cp.total_per_person * (1 + cp.solo_supplement_pct / 100)) as solo_total
FROM current_pricing cp
JOIN cruises c ON c.id = cp.cruise_id
JOIN cruise_lines cl ON cl.id = c.cruise_line_id
JOIN cabin_types ct ON ct.id = cp.cabin_type_id
WHERE cp.available = true
AND cp.solo_supplement_pct <= 100
ORDER BY solo_supplement_pct ASC, solo_total ASC;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_pricing_cruise_cabin ON pricing_history(cruise_id, cabin_type_id, time DESC);
CREATE INDEX idx_pricing_time ON pricing_history(time DESC);
CREATE INDEX idx_cruises_destination ON cruises(destination);
CREATE INDEX idx_cruises_duration ON cruises(duration);
CREATE INDEX idx_cruises_departure ON cruises(departure_port);
CREATE INDEX idx_cruises_cruise_line ON cruises(cruise_line_id);
CREATE INDEX idx_current_pricing_deal ON current_pricing(deal_rating);
CREATE INDEX idx_current_pricing_total ON current_pricing(total_per_person);
CREATE INDEX idx_current_pricing_solo ON current_pricing(solo_supplement_pct);
CREATE INDEX idx_watchlist_user ON watchlist_items(user_id);
CREATE INDEX idx_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_cabin_types_cruise ON cabin_types(cruise_id);

-- ============================================================
-- TRIGGER: Update updated_at on row changes
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cruises_updated_at BEFORE UPDATE ON cruises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pricing_updated_at BEFORE UPDATE ON current_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_watchlist_updated_at BEFORE UPDATE ON watchlist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
