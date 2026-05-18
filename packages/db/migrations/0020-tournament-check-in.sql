-- Migration: per-registration check-in timestamp. Players self-check at the
-- club kiosk or via mobile prior to the first round.

ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

CREATE INDEX IF NOT EXISTS tournament_registrations_checked_in_idx
  ON tournament_registrations (tournament_id, checked_in_at);
