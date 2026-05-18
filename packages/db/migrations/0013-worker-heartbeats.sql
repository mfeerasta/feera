-- Migration: worker heartbeats for admin observability dashboard.
-- See packages/db/src/schema/worker-heartbeats.ts for the Drizzle source of truth.

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  ticked_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worker_heartbeats_job_idx ON worker_heartbeats (job_name, ticked_at DESC);
CREATE INDEX IF NOT EXISTS worker_heartbeats_ticked_idx ON worker_heartbeats (ticked_at DESC);

ALTER TABLE worker_heartbeats ENABLE ROW LEVEL SECURITY;

-- Service role + platform admins only. Anonymous and player roles get nothing.
DO $$ BEGIN
  CREATE POLICY worker_heartbeats_admin_read ON worker_heartbeats
    FOR SELECT
    USING (
      coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'isClubStaff')::boolean, false)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY worker_heartbeats_service_write ON worker_heartbeats
    FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
