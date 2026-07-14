-- Migration: Remove widgety seed data
-- NIM is now the exclusive data source (4h sync cycle)
DELETE FROM sailings WHERE sync_source = 'widgety';
DELETE FROM pricing_snapshots WHERE captured_by = 'widgety';
