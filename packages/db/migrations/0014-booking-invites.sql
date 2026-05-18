-- Migration: booking_invites - private organizer-to-friend invitations for a booking.
-- Distinct from booking_join_requests (strangers asking to fill open slots).
-- See packages/db/src/schema/booking-invites.ts for the Drizzle source of truth.

-- Extend the notification template enum so the outbox can carry the new
-- 'booking_invite_received' template introduced in this migration.
DO $$ BEGIN
  ALTER TYPE notification_outbox_template ADD VALUE IF NOT EXISTS 'booking_invite_received';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_invite_status AS ENUM (
    'pending', 'accepted', 'declined', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS booking_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  inviter_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            booking_invite_status NOT NULL DEFAULT 'pending',
  message           text,
  responded_at      timestamptz,
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_invites_booking_status_idx
  ON booking_invites (booking_id, status);
CREATE INDEX IF NOT EXISTS booking_invites_invitee_status_idx
  ON booking_invites (invitee_user_id, status);
-- Partial unique: only one pending invite per (booking, invitee).
CREATE UNIQUE INDEX IF NOT EXISTS booking_invites_pending_uq
  ON booking_invites (booking_id, invitee_user_id)
  WHERE status = 'pending';

-- RLS: requester (inviter) sees own, invitee sees own, organizer sees all for
-- their bookings, club staff sees all for courts they manage.
ALTER TABLE booking_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_invites FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_invites_select_party ON booking_invites;
CREATE POLICY booking_invites_select_party ON booking_invites
  FOR SELECT
  USING (
    inviter_user_id = auth.user_id()
    OR invitee_user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_invites.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
    OR EXISTS (
      SELECT 1
      FROM bookings b
      JOIN courts ct ON ct.id = b.court_id
      JOIN club_staff cs ON cs.club_id = ct.club_id
      WHERE b.id = booking_invites.booking_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

DROP POLICY IF EXISTS booking_invites_insert_organizer ON booking_invites;
CREATE POLICY booking_invites_insert_organizer ON booking_invites
  FOR INSERT
  WITH CHECK (
    inviter_user_id = auth.user_id()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_invites.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
  );

DROP POLICY IF EXISTS booking_invites_update_party ON booking_invites;
CREATE POLICY booking_invites_update_party ON booking_invites
  FOR UPDATE
  USING (
    inviter_user_id = auth.user_id()
    OR invitee_user_id = auth.user_id()
  );

DROP POLICY IF EXISTS booking_invites_delete_party ON booking_invites;
CREATE POLICY booking_invites_delete_party ON booking_invites
  FOR DELETE
  USING (
    inviter_user_id = auth.user_id()
    OR invitee_user_id = auth.user_id()
  );

DROP POLICY IF EXISTS booking_invites_write_service ON booking_invites;
CREATE POLICY booking_invites_write_service ON booking_invites
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
