-- matches
-- Read if you are one of the 4 players, or club staff of the booking's court's club, or public.
-- Insert via service role only (rating engine writes after score entry validation).

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matches_select_player ON matches;
CREATE POLICY matches_select_player ON matches
  FOR SELECT
  USING (
    auth.user_id() IN (team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2)
  );

DROP POLICY IF EXISTS matches_select_club_staff ON matches;
CREATE POLICY matches_select_club_staff ON matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      JOIN courts ct ON ct.id = b.court_id
      JOIN club_staff cs ON cs.club_id = ct.club_id
      WHERE b.id = matches.booking_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

DROP POLICY IF EXISTS matches_select_public ON matches;
CREATE POLICY matches_select_public ON matches
  FOR SELECT
  USING (is_ranked = true AND verification_status = 'club_verified');

DROP POLICY IF EXISTS matches_write_service ON matches;
CREATE POLICY matches_write_service ON matches
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
