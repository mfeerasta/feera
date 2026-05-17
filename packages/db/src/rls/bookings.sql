-- bookings + booking_participants
-- Read if organizer or participant or club staff. Insert if organizer is self.
-- Update if organizer or club staff.

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_select_member ON bookings;
CREATE POLICY bookings_select_member ON bookings
  FOR SELECT
  USING (
    organizer_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM booking_participants bp
      WHERE bp.booking_id = bookings.id
        AND bp.user_id = auth.user_id()
    )
    OR EXISTS (
      SELECT 1
      FROM courts ct
      JOIN club_staff cs ON cs.club_id = ct.club_id
      WHERE ct.id = bookings.court_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

DROP POLICY IF EXISTS bookings_select_open_match ON bookings;
CREATE POLICY bookings_select_open_match ON bookings
  FOR SELECT
  USING (is_open_match = true AND status IN ('pending', 'confirmed'));

DROP POLICY IF EXISTS bookings_insert_self ON bookings;
CREATE POLICY bookings_insert_self ON bookings
  FOR INSERT
  WITH CHECK (organizer_user_id = auth.user_id());

DROP POLICY IF EXISTS bookings_update_organizer ON bookings;
CREATE POLICY bookings_update_organizer ON bookings
  FOR UPDATE
  USING (
    organizer_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1
      FROM courts ct
      JOIN club_staff cs ON cs.club_id = ct.club_id
      WHERE ct.id = bookings.court_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager', 'front_desk')
    )
  );

DROP POLICY IF EXISTS bookings_delete_organizer ON bookings;
CREATE POLICY bookings_delete_organizer ON bookings
  FOR DELETE
  USING (organizer_user_id = auth.user_id());

DROP POLICY IF EXISTS bookings_write_service ON bookings;
CREATE POLICY bookings_write_service ON bookings
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_participants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_participants_select_member ON booking_participants;
CREATE POLICY booking_participants_select_member ON booking_participants
  FOR SELECT
  USING (
    user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_participants.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
    OR EXISTS (
      SELECT 1 FROM booking_participants peer
      WHERE peer.booking_id = booking_participants.booking_id
        AND peer.user_id = auth.user_id()
    )
  );

DROP POLICY IF EXISTS booking_participants_insert_organizer ON booking_participants;
CREATE POLICY booking_participants_insert_organizer ON booking_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_participants.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
    OR user_id = auth.user_id()
  );

DROP POLICY IF EXISTS booking_participants_update_self_or_organizer ON booking_participants;
CREATE POLICY booking_participants_update_self_or_organizer ON booking_participants
  FOR UPDATE
  USING (
    user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_participants.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
  );

DROP POLICY IF EXISTS booking_participants_write_service ON booking_participants;
CREATE POLICY booking_participants_write_service ON booking_participants
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
