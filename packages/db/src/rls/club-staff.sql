-- club_staff
-- Staff at a club can read fellow staff rows for that club. Only owners can mutate.

ALTER TABLE club_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_staff FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_staff_select_self ON club_staff;
CREATE POLICY club_staff_select_self ON club_staff
  FOR SELECT
  USING (user_id = auth.user_id());

DROP POLICY IF EXISTS club_staff_select_peer ON club_staff;
CREATE POLICY club_staff_select_peer ON club_staff
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_staff peer
      WHERE peer.club_id = club_staff.club_id
        AND peer.user_id = auth.user_id()
        AND peer.is_active = true
    )
  );

DROP POLICY IF EXISTS club_staff_insert_owner ON club_staff;
CREATE POLICY club_staff_insert_owner ON club_staff
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_staff owner
      WHERE owner.club_id = club_staff.club_id
        AND owner.user_id = auth.user_id()
        AND owner.is_active = true
        AND owner.role = 'owner'
    )
  );

DROP POLICY IF EXISTS club_staff_update_owner ON club_staff;
CREATE POLICY club_staff_update_owner ON club_staff
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_staff owner
      WHERE owner.club_id = club_staff.club_id
        AND owner.user_id = auth.user_id()
        AND owner.is_active = true
        AND owner.role = 'owner'
    )
  );

DROP POLICY IF EXISTS club_staff_delete_owner ON club_staff;
CREATE POLICY club_staff_delete_owner ON club_staff
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_staff owner
      WHERE owner.club_id = club_staff.club_id
        AND owner.user_id = auth.user_id()
        AND owner.is_active = true
        AND owner.role = 'owner'
    )
  );

DROP POLICY IF EXISTS club_staff_all_service ON club_staff;
CREATE POLICY club_staff_all_service ON club_staff
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
