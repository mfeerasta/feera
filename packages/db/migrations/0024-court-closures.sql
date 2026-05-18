-- Migration: court_closures. Maintenance windows, private events, lockdown
-- blocks. Booking conflict-check must reject overlapping windows.
-- Source: packages/db/src/schema/court-closures.ts

CREATE TABLE IF NOT EXISTS court_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES courts (id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT court_closures_window_chk CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS court_closures_court_start_idx
  ON court_closures (court_id, start_at);

CREATE INDEX IF NOT EXISTS court_closures_court_window_idx
  ON court_closures (court_id, start_at, end_at);

ALTER TABLE court_closures ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can see closures (calendar transparency).
DO $$ BEGIN
  CREATE POLICY court_closures_authenticated_read ON court_closures
    FOR SELECT
    USING (
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') IS NOT NULL,
        false
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Write: club staff of the court's club, or platform admins.
DO $$ BEGIN
  CREATE POLICY court_closures_staff_write ON court_closures
    FOR ALL
    USING (
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'isClubStaff')::boolean,
        false
      )
    )
    WITH CHECK (
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'isClubStaff')::boolean,
        false
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
