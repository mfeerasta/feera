-- tournaments + tournament_registrations + tournament_rounds + tournament_matches
-- Tournaments are public-read once status != 'draft'. Organizers + club staff
-- always read their own. Registrations are visible to the registrant, the
-- partner, the tournament organizer, and the host club's staff.

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournaments_select_public ON tournaments;
CREATE POLICY tournaments_select_public ON tournaments
  FOR SELECT
  USING (status <> 'draft' AND deleted_at IS NULL);

DROP POLICY IF EXISTS tournaments_select_organizer ON tournaments;
CREATE POLICY tournaments_select_organizer ON tournaments
  FOR SELECT
  USING (organizer_user_id = auth.user_id());

DROP POLICY IF EXISTS tournaments_select_club_staff ON tournaments;
CREATE POLICY tournaments_select_club_staff ON tournaments
  FOR SELECT
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = tournaments.club_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

DROP POLICY IF EXISTS tournaments_insert_organizer ON tournaments;
CREATE POLICY tournaments_insert_organizer ON tournaments
  FOR INSERT
  WITH CHECK (organizer_user_id = auth.user_id());

DROP POLICY IF EXISTS tournaments_update_organizer ON tournaments;
CREATE POLICY tournaments_update_organizer ON tournaments
  FOR UPDATE
  USING (
    organizer_user_id = auth.user_id()
    OR (
      club_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM club_staff cs
        WHERE cs.club_id = tournaments.club_id
          AND cs.user_id = auth.user_id()
          AND cs.is_active = true
          AND cs.role IN ('owner', 'manager')
      )
    )
  );

DROP POLICY IF EXISTS tournaments_delete_organizer ON tournaments;
CREATE POLICY tournaments_delete_organizer ON tournaments
  FOR DELETE
  USING (organizer_user_id = auth.user_id());


ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournament_registrations_select_member ON tournament_registrations;
CREATE POLICY tournament_registrations_select_member ON tournament_registrations
  FOR SELECT
  USING (
    user_id = auth.user_id()
    OR partner_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND (
          t.organizer_user_id = auth.user_id()
          OR (
            t.club_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM club_staff cs
              WHERE cs.club_id = t.club_id
                AND cs.user_id = auth.user_id()
                AND cs.is_active = true
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS tournament_registrations_insert_self ON tournament_registrations;
CREATE POLICY tournament_registrations_insert_self ON tournament_registrations
  FOR INSERT
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS tournament_registrations_update_self_or_organizer ON tournament_registrations;
CREATE POLICY tournament_registrations_update_self_or_organizer ON tournament_registrations
  FOR UPDATE
  USING (
    user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.organizer_user_id = auth.user_id()
    )
  );

DROP POLICY IF EXISTS tournament_registrations_delete_self_or_organizer ON tournament_registrations;
CREATE POLICY tournament_registrations_delete_self_or_organizer ON tournament_registrations
  FOR DELETE
  USING (
    user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.organizer_user_id = auth.user_id()
    )
  );


ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rounds FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournament_rounds_select_public ON tournament_rounds;
CREATE POLICY tournament_rounds_select_public ON tournament_rounds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_rounds.tournament_id
        AND (t.status <> 'draft' OR t.organizer_user_id = auth.user_id())
    )
  );

DROP POLICY IF EXISTS tournament_rounds_write_organizer ON tournament_rounds;
CREATE POLICY tournament_rounds_write_organizer ON tournament_rounds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_rounds.tournament_id
        AND t.organizer_user_id = auth.user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_rounds.tournament_id
        AND t.organizer_user_id = auth.user_id()
    )
  );


ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournament_matches_select_public ON tournament_matches;
CREATE POLICY tournament_matches_select_public ON tournament_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND (t.status <> 'draft' OR t.organizer_user_id = auth.user_id())
    )
  );

DROP POLICY IF EXISTS tournament_matches_write_organizer ON tournament_matches;
CREATE POLICY tournament_matches_write_organizer ON tournament_matches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.organizer_user_id = auth.user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.organizer_user_id = auth.user_id()
    )
  );
