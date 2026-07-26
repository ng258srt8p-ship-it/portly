-- AI enrichment cache on existing sailings rows.
-- All columns nullable — heuristic content remains the fallback.
ALTER TABLE sailings ADD COLUMN ai_insider_summary TEXT;
ALTER TABLE sailings ADD COLUMN ai_cabin_strategy TEXT;
ALTER TABLE sailings ADD COLUMN ai_excursion_strategy TEXT;
ALTER TABLE sailings ADD COLUMN ai_deal_score_narrative TEXT;
ALTER TABLE sailings ADD COLUMN ai_generated_at TEXT;
ALTER TABLE sailings ADD COLUMN ai_model TEXT;
ALTER TABLE sailings ADD COLUMN ai_score INTEGER;

-- Lookup index for the cron handler — find sailings due for enrichment
CREATE INDEX IF NOT EXISTS idx_sailings_ai_age
  ON sailings(last_updated_at, ai_generated_at);
