-- 0004-slot-bookings.sql
-- Slot-level bookings + open-match join requests.
-- Adds bookings.seats_booked + booking_join_requests table.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0004-slot-bookings.sql
-- Parent integrator applies after sign-off.

-- 1. Add seats_booked to bookings. Default 1 (organizer always counts as a seat).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS seats_booked integer NOT NULL DEFAULT 1;

-- Existing rows: backfill seats_booked = max_participants so legacy
-- "organizer pays for whole court" semantics are preserved.
UPDATE bookings
  SET seats_booked = max_participants
  WHERE seats_booked = 1 AND max_participants > 1
    AND created_at < now() - interval '1 minute';

-- Guard: seats_booked must never exceed max_participants and must be >= 1.
DO $$ BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_seats_booked_bounds_ck
    CHECK (seats_booked >= 1 AND seats_booked <= max_participants);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. booking_join_status enum.
DO $$ BEGIN
  CREATE TYPE booking_join_status AS ENUM (
    'pending', 'approved', 'declined', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. booking_join_requests table.
CREATE TABLE IF NOT EXISTS booking_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats_requested integer NOT NULL DEFAULT 1,
  status booking_join_status NOT NULL DEFAULT 'pending',
  message text,
  requester_rating_display double precision,
  responded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_join_requests_seats_pos_ck CHECK (seats_requested >= 1 AND seats_requested <= 4)
);

CREATE INDEX IF NOT EXISTS booking_join_requests_booking_status_idx
  ON booking_join_requests (booking_id, status);
CREATE INDEX IF NOT EXISTS booking_join_requests_requester_status_idx
  ON booking_join_requests (requester_user_id, status);

-- Partial unique: at most one pending request per (booking, requester).
CREATE UNIQUE INDEX IF NOT EXISTS booking_join_requests_one_pending_per_user_uq
  ON booking_join_requests (booking_id, requester_user_id)
  WHERE status = 'pending';

-- 4. RLS.
ALTER TABLE booking_join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own request rows.
-- Booking organizer + accepted participants can see all requests for their booking.
-- Club staff (any active row in club_staff for the booking's club) can see all.
DROP POLICY IF EXISTS booking_join_requests_select ON booking_join_requests;
CREATE POLICY booking_join_requests_select ON booking_join_requests
  FOR SELECT USING (
    auth.user_id() = requester_user_id
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_join_requests.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
    OR EXISTS (
      SELECT 1 FROM booking_participants bp
      WHERE bp.booking_id = booking_join_requests.booking_id
        AND bp.user_id = auth.user_id()
        AND bp.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      JOIN club_staff cs ON cs.club_id = c.club_id
      WHERE b.id = booking_join_requests.booking_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );

-- Requester can insert a request as themselves.
DROP POLICY IF EXISTS booking_join_requests_insert ON booking_join_requests;
CREATE POLICY booking_join_requests_insert ON booking_join_requests
  FOR INSERT WITH CHECK (auth.user_id() = requester_user_id);

-- Organizer / club staff updates the status. Requester may cancel their own.
DROP POLICY IF EXISTS booking_join_requests_update ON booking_join_requests;
CREATE POLICY booking_join_requests_update ON booking_join_requests
  FOR UPDATE USING (
    auth.user_id() = requester_user_id
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_join_requests.booking_id
        AND b.organizer_user_id = auth.user_id()
    )
    OR EXISTS (
      SELECT 1
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      JOIN club_staff cs ON cs.club_id = c.club_id
      WHERE b.id = booking_join_requests.booking_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
    )
  );
