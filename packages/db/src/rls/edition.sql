-- edition_memberships + edition_clubs
-- Memberships: read own + Edition staff (admin). Insert via apply endpoint only (service role).
-- edition_clubs: public-read where status='active', mutations by admin/service.

ALTER TABLE edition_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edition_memberships_select_self ON edition_memberships;
CREATE POLICY edition_memberships_select_self ON edition_memberships
  FOR SELECT
  USING (user_id = auth.user_id());

DROP POLICY IF EXISTS edition_memberships_select_admin ON edition_memberships;
CREATE POLICY edition_memberships_select_admin ON edition_memberships
  FOR SELECT
  USING (auth.role() IN ('admin', 'service_role'));

DROP POLICY IF EXISTS edition_memberships_write_service ON edition_memberships;
CREATE POLICY edition_memberships_write_service ON edition_memberships
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE edition_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_clubs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edition_clubs_select_public ON edition_clubs;
CREATE POLICY edition_clubs_select_public ON edition_clubs
  FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS edition_clubs_select_club_staff ON edition_clubs;
CREATE POLICY edition_clubs_select_club_staff ON edition_clubs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = edition_clubs.club_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

DROP POLICY IF EXISTS edition_clubs_write_service ON edition_clubs;
CREATE POLICY edition_clubs_write_service ON edition_clubs
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
