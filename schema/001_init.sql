-- Portly D1 Database Schema
-- SQLite-compatible (D1 uses SQLite under the hood)

-- Reference tables
CREATE TABLE IF NOT EXISTS cruise_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_company TEXT,
  website TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cruise_line_id INTEGER NOT NULL REFERENCES cruise_lines(id),
  capacity INTEGER,
  year_built INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, cruise_line_id)
);

CREATE TABLE IF NOT EXISTS ports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  region TEXT,
  country TEXT,
  lat REAL,
  lon REAL
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  region TEXT
);

CREATE TABLE IF NOT EXISTS cabin_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Insert cabin categories
INSERT OR IGNORE INTO cabin_categories (name) VALUES
  ('Inside'),
  ('Oceanview'),
  ('Balcony'),
  ('Suite');

-- Data tables
CREATE TABLE IF NOT EXISTS sailings (
  id TEXT PRIMARY KEY, -- e.g., 'carnival_2025-03-15_mardi_gras_miami_caribbean'
  cruise_line_id INTEGER NOT NULL REFERENCES cruise_lines(id),
  ship_id INTEGER NOT NULL REFERENCES ships(id),
  destination_id INTEGER REFERENCES destinations(id),
  departure_port_id INTEGER REFERENCES ports(id),
  departure_port TEXT,
  departure_region TEXT,
  sail_date TEXT NOT NULL,
  nights INTEGER NOT NULL,
  duration TEXT,
  price REAL,
  original_price REAL,
  drop_percent REAL GENERATED ALWAYS AS (
    CASE WHEN original_price > 0
      THEN ROUND((original_price - price) / original_price * 100, 1)
      ELSE 0
    END
  ) STORED,
  badge_type TEXT GENERATED ALWAYS AS (
    CASE
      WHEN drop_percent >= 15 THEN 'drop'
      WHEN drop_percent >= 5 THEN 'solo'
      ELSE 'gold'
    END
  ) STORED,
  badge_text TEXT,
  booking_url TEXT,
  booking_label TEXT,
  history TEXT DEFAULT '[]', -- JSON array of prices
  itinerary TEXT, -- JSON array of port names
  source TEXT NOT NULL DEFAULT 'scraper',
  fingerprint TEXT NOT NULL UNIQUE, -- ship_id|sail_date|departure_port_id|nights
  first_seen_at TEXT DEFAULT (datetime('now')),
  last_updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sailings_cruise_line ON sailings(cruise_line_id);
CREATE INDEX idx_sailings_ship ON sailings(ship_id);
CREATE INDEX idx_sailings_date ON sailings(sail_date);
CREATE INDEX idx_sailings_fingerprint ON sailings(fingerprint);
CREATE INDEX idx_sailings_badge ON sailings(badge_type);
CREATE INDEX idx_sailings_price ON sailings(price);

CREATE TABLE IF NOT EXISTS cabin_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sailing_id TEXT NOT NULL REFERENCES sailings(id),
  cabin_category_id INTEGER NOT NULL REFERENCES cabin_categories(id),
  base_fare_per_person REAL NOT NULL,
  port_tax_per_person REAL DEFAULT 0,
  gratuity_per_person_per_night REAL DEFAULT 0,
  total_per_person REAL GENERATED ALWAYS AS (
    base_fare_per_person + port_tax_per_person
  ) STORED,
  UNIQUE(sailing_id, cabin_category_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sailing_id TEXT NOT NULL REFERENCES sailings(id),
  cabin_category_id INTEGER REFERENCES cabin_categories(id),
  price REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_price_history_sailing ON price_history(sailing_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_at);

-- Deals view (matches the UI's expected data shape)
CREATE VIEW IF NOT EXISTS deals_view AS
SELECT
  s.id,
  cl.name AS cruise_line,
  sh.name AS ship,
  d.name AS destination,
  s.departure_port AS departure_port,
  s.departure_region,
  s.duration,
  s.nights,
  s.sail_date,
  s.price,
  s.original_price,
  s.drop_percent,
  s.badge_type,
  s.badge_text,
  s.booking_url,
  s.booking_label,
  s.history,
  s.last_updated_at
FROM sailings s
JOIN cruise_lines cl ON s.cruise_line_id = cl.id
JOIN ships sh ON s.ship_id = sh.id
LEFT JOIN destinations d ON s.destination_id = d.id
WHERE s.price IS NOT NULL
ORDER BY s.drop_percent DESC;
