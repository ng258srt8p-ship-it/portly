-- 006_alert_preferences.sql – per‑email alert preferences (default price‑drop threshold)

CREATE TABLE IF NOT EXISTS alert_preferences (
  email TEXT PRIMARY KEY,
  default_threshold REAL NOT NULL DEFAULT 10.0,   -- percent drop (e.g., 10% = 10.0)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
