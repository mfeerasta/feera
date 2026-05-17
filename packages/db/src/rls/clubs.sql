-- clubs + courts + court_pricing_rules
-- Clubs are public-read while active. Mutations require club_staff membership.

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clubs_select_public ON clubs;
CREATE POLICY clubs_select_public ON clubs
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS clubs_select_staff ON clubs;
CREATE POLICY clubs_select_staff ON clubs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = clubs.id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

DROP POLICY IF EXISTS clubs_update_staff ON clubs;
CREATE POLICY clubs_update_staff ON clubs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = clubs.id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS clubs_write_service ON clubs;
CREATE POLICY clubs_write_service ON clubs
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_select_public ON courts;
CREATE POLICY courts_select_public ON courts
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM clubs c WHERE c.id = courts.club_id AND c.is_active = true
    )
  );

DROP POLICY IF EXISTS courts_write_staff ON courts;
CREATE POLICY courts_write_staff ON courts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = courts.club_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = courts.club_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  );

ALTER TABLE court_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_pricing_rules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS court_pricing_rules_select_public ON court_pricing_rules;
CREATE POLICY court_pricing_rules_select_public ON court_pricing_rules
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS court_pricing_rules_write_staff ON court_pricing_rules;
CREATE POLICY court_pricing_rules_write_staff ON court_pricing_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM courts ct
      JOIN club_staff cs ON cs.club_id = ct.club_id
      WHERE ct.id = court_pricing_rules.court_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM courts ct
      JOIN club_staff cs ON cs.club_id = ct.club_id
      WHERE ct.id = court_pricing_rules.court_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  );
