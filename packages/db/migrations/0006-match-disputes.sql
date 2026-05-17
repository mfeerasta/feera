-- 0006-match-disputes.sql
-- Audit child table for matches: a player flags a recorded match as incorrect.
-- Admins triage from /admin/matches/disputes. Parent applies after sign-off.

DO $$ BEGIN
  CREATE TYPE match_dispute_kind AS ENUM (
    'wrong_score', 'wrong_winner', 'ineligible_player', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_dispute_status AS ENUM (
    'open', 'reviewed', 'upheld', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS match_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  raised_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind match_dispute_kind NOT NULL,
  note text NOT NULL,
  status match_dispute_status NOT NULL DEFAULT 'open',
  resolved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_disputes_match_idx
  ON match_disputes (match_id, status);
CREATE INDEX IF NOT EXISTS match_disputes_status_created_idx
  ON match_disputes (status, created_at);

ALTER TABLE match_disputes ENABLE ROW LEVEL SECURITY;

-- Players in the disputed match, the raiser, and admins can see the dispute.
DROP POLICY IF EXISTS match_disputes_select ON match_disputes;
CREATE POLICY match_disputes_select ON match_disputes
  FOR SELECT USING (
    auth.user_id() = raised_by_user_id
    OR auth.role() = 'platform_admin'
    OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_disputes.match_id
        AND auth.user_id() IN (
          m.team_a_player_1, m.team_a_player_2,
          m.team_b_player_1, m.team_b_player_2
        )
    )
  );

DROP POLICY IF EXISTS match_disputes_insert ON match_disputes;
CREATE POLICY match_disputes_insert ON match_disputes
  FOR INSERT WITH CHECK (
    auth.user_id() = raised_by_user_id
    AND (
      auth.role() = 'platform_admin'
      OR EXISTS (
        SELECT 1 FROM matches m
        WHERE m.id = match_disputes.match_id
          AND auth.user_id() IN (
            m.team_a_player_1, m.team_a_player_2,
            m.team_b_player_1, m.team_b_player_2
          )
      )
    )
  );

DROP POLICY IF EXISTS match_disputes_update_admin ON match_disputes;
CREATE POLICY match_disputes_update_admin ON match_disputes
  FOR UPDATE USING (auth.role() = 'platform_admin');
