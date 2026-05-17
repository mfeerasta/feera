-- coaches + coaching_sessions
-- Coaches are public-read while accepting bookings. The coach themselves
-- can always read+update their own row. Coaching sessions are visible to
-- the coach, the learner, and the host club's staff.

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coaches_select_public ON coaches;
CREATE POLICY coaches_select_public ON coaches
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS coaches_insert_self ON coaches;
CREATE POLICY coaches_insert_self ON coaches
  FOR INSERT
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS coaches_update_self ON coaches;
CREATE POLICY coaches_update_self ON coaches
  FOR UPDATE
  USING (user_id = auth.user_id())
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS coaches_delete_self ON coaches;
CREATE POLICY coaches_delete_self ON coaches
  FOR DELETE
  USING (user_id = auth.user_id());


ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coaching_sessions_select_party ON coaching_sessions;
CREATE POLICY coaching_sessions_select_party ON coaching_sessions
  FOR SELECT
  USING (
    learner_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.id = coaching_sessions.coach_id
        AND c.user_id = auth.user_id()
    )
    OR (
      club_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM club_staff cs
        WHERE cs.club_id = coaching_sessions.club_id
          AND cs.user_id = auth.user_id()
          AND cs.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS coaching_sessions_insert_learner ON coaching_sessions;
CREATE POLICY coaching_sessions_insert_learner ON coaching_sessions
  FOR INSERT
  WITH CHECK (learner_user_id = auth.user_id());

DROP POLICY IF EXISTS coaching_sessions_update_party ON coaching_sessions;
CREATE POLICY coaching_sessions_update_party ON coaching_sessions
  FOR UPDATE
  USING (
    learner_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.id = coaching_sessions.coach_id
        AND c.user_id = auth.user_id()
    )
  );

DROP POLICY IF EXISTS coaching_sessions_delete_party ON coaching_sessions;
CREATE POLICY coaching_sessions_delete_party ON coaching_sessions
  FOR DELETE
  USING (
    learner_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.id = coaching_sessions.coach_id
        AND c.user_id = auth.user_id()
    )
  );
