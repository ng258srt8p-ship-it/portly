-- Migration 002: alerts table for price-drop notifications
-- Applied: 2026-07-25

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  sailing_id TEXT,                -- FK to sailings.id (nullable for general alerts)
  sailing_url TEXT,               -- full URL for display/link-back
  threshold_pct REAL NOT NULL DEFAULT 10.0,  -- minimum drop % to trigger
  is_active INTEGER NOT NULL DEFAULT 1,       -- 1 = active, 0 = disabled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sailing_id) REFERENCES sailings(id) ON DELETE SET NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alerts_email ON alerts(email);
CREATE INDEX IF NOT EXISTS idx_alerts_sailing_id ON alerts(sailing_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS trg_alerts_updated_at
AFTER UPDATE ON alerts
FOR EACH ROW
BEGIN
  UPDATE alerts SET updated_at = datetime('now') WHERE id = NEW.id;
END;