-- Migration: structured prize pool distribution per finishing position.
-- prize_pool_distribution jsonb keys are stringified positions ("1","2","3"),
-- values are the decimal share (sum should be 1.0). Empty {} means the
-- organizer has not configured a split yet and standings page renders without
-- prize amounts.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS prize_pool_currency text;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS prize_pool_distribution jsonb NOT NULL DEFAULT '{}'::jsonb;
