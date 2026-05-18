-- Migration: link tournament_matches to a specific court for scheduling /
-- live-board display. Column already exists in some envs as plain uuid;
-- add the FK + index idempotently.
-- See packages/db/src/schema/tournaments.ts.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_matches' AND column_name = 'court_id'
  ) THEN
    ALTER TABLE tournament_matches ADD COLUMN court_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tournament_matches'
      AND constraint_name = 'tournament_matches_court_id_fkey'
  ) THEN
    ALTER TABLE tournament_matches
      ADD CONSTRAINT tournament_matches_court_id_fkey
      FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tournament_matches_court_idx
  ON tournament_matches (court_id);
