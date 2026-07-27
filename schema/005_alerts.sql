-- 005_alerts.sql — alert pipeline schema
-- Alert subscriptions + email dispatch queue + dedupe log.

-- Subscribers — folk who opt-in for deal alerts.
CREATE TABLE IF NOT EXISTS alert_subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  -- JSON: {lines:["carnival"], regions:["caribbean"], min_score:85, max_price:1500}
  filters     TEXT,
  confirmed   INTEGER DEFAULT 0,   -- 0 = pending opt-in, 1 = confirmed
  confirm_tok TEXT,                -- single-use confirmation token
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- outbound email queue — driver follows status: pending → sent | failed
CREATE TABLE IF NOT EXISTS alert_emails (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id INTEGER REFERENCES alert_subscribers(id) ON DELETE CASCADE,
  sailing_id   TEXT,             -- the sailing that triggered the alert
  -- Snapshot so the rendered email is reproducible (audit/debug)
  sailing_snapshot TEXT,         -- JSON {ship, line, date, price, score, url}
  subject      TEXT NOT NULL,
  html_body    TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',  -- pending|sent|failed|skipped
  attempts     INTEGER DEFAULT 0,
  last_error   TEXT,
  -- used by dedupe so we don't resend an alert for the same sailing twice
  -- if the score / price stayed within +/- 2 points.
  fingerprint  TEXT NOT NULL,    -- sub_id|sailing_id|score_bucket
  queued_at    TEXT DEFAULT (datetime('now')),
  sent_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_alert_emails_status ON alert_emails(status);
CREATE INDEX IF NOT EXISTS idx_alert_emails_fp ON alert_emails(fingerprint);

-- Dispatch log — append-only audit of every send attempt (success or fail)
CREATE TABLE IF NOT EXISTS alert_email_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id    INTEGER REFERENCES alert_emails(id) ON DELETE CASCADE,
  provider    TEXT,             -- 'resend' | 'mock' | 'mailgun'
  status      TEXT,             -- 'sent' | 'failed' | 'skipped'
  http_status INTEGER,
  message_id  TEXT,
  error       TEXT,
  ts          TEXT DEFAULT (datetime('now'))
);
