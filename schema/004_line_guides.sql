-- Line guides: per-line editorial fingerprints the LLM uses to anchor
-- its "insider" copy.  One row per cruise line.  Populated by Phase 2.2.
CREATE TABLE IF NOT EXISTS line_guides (
  cruise_line_id INTEGER PRIMARY KEY,
  cruise_line_name TEXT NOT NULL,
  personality TEXT NOT NULL,
  fleet_position TEXT NOT NULL,
  cabin_strategy TEXT NOT NULL,
  excursion_strategy TEXT NOT NULL,
  what_avoid TEXT NOT NULL,
  best_for TEXT NOT NULL,
  onboard_concessions TEXT NOT NULL,
  fleet_avg_age_years REAL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_line_guides_name ON line_guides(cruise_line_name);
