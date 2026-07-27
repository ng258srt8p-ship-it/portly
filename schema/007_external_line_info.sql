-- 007_external_line_info.sql – enriched line information from external source

CREATE TABLE IF NOT EXISTS external_line_info (
  cruise_line_id INTEGER PRIMARY KEY,
  fleet_size INTEGER,
  loyalty_program TEXT,
  average_fare REAL,
  brand_tagline TEXT,
  -- any other fields you anticipate from the external source
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cruise_line_id) REFERENCES cruise_lines(id) ON DELETE CASCADE
);
