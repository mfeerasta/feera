-- 0005-booking-credits.sql
-- Player credit ledger. Credits accrue when an organizer cancels a booking
-- where the player held a confirmed seat (or was an approved joiner) and the
-- platform refunds them out of policy. Credits are drawn down on the player's
-- next booking checkout. Parent applies after sign-off; do not auto-run.

DO $$ BEGIN
  CREATE TYPE booking_credit_source AS ENUM ('cancellation', 'goodwill', 'refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS booking_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  source booking_credit_source NOT NULL,
  source_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  expires_at timestamptz,
  consumed_amount_minor integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_credits_amount_pos_ck CHECK (amount_minor > 0),
  CONSTRAINT booking_credits_consumed_bounds_ck
    CHECK (consumed_amount_minor >= 0 AND consumed_amount_minor <= amount_minor)
);

CREATE INDEX IF NOT EXISTS booking_credits_user_currency_idx
  ON booking_credits (user_id, currency);
CREATE INDEX IF NOT EXISTS booking_credits_user_open_idx
  ON booking_credits (user_id, expires_at);

ALTER TABLE booking_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_credits_select_own ON booking_credits;
CREATE POLICY booking_credits_select_own ON booking_credits
  FOR SELECT USING (auth.user_id() = user_id OR auth.role() = 'platform_admin');

DROP POLICY IF EXISTS booking_credits_insert_admin ON booking_credits;
CREATE POLICY booking_credits_insert_admin ON booking_credits
  FOR INSERT WITH CHECK (auth.role() = 'platform_admin');

DROP POLICY IF EXISTS booking_credits_update_admin ON booking_credits;
CREATE POLICY booking_credits_update_admin ON booking_credits
  FOR UPDATE USING (auth.role() = 'platform_admin');
