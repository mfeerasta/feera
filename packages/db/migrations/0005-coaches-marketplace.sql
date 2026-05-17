-- 0005-coaches-marketplace.sql
-- Coaches marketplace M4: extends the coaches table with profile, schedule, and
-- verification columns to support the player marketplace and the admin
-- verification queue.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0005-coaches-marketplace.sql
-- Idempotent: every column add uses IF NOT EXISTS.

-- 1. Pricing band: keep existing hourly_rate as the primary rate. Add a max so
--    coaches can advertise a range while we keep a single rate per session for
--    Phase 1 pricing logic.
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS hourly_rate_max double precision;

-- 2. Weekly availability template. Shape:
--    { "mon": [{ "start": "07:00", "end": "11:00" }, ...], "tue": [...], ... }
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS weekly_availability jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Verification documents pending admin review. Shape:
--    [{ "kind": "certification" | "id" | "insurance", "url": "...", "uploadedAt": "..." }]
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS verification_documents jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Intro video URL (youtube or vimeo). NULL when not provided.
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS intro_video_url text;

-- 5. Response time SLA in hours, surfaced to players to set expectations.
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS response_time_avg_hours integer NOT NULL DEFAULT 24;

-- 6. Edition endorsement flag. Editorial endorsement is separate from the
--    operational verification flag (`is_verified_by_feera`).
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS is_edition_endorsed boolean NOT NULL DEFAULT false;

-- 7. session_type enum for coaching_sessions.
DO $$ BEGIN
  CREATE TYPE coaching_session_type AS ENUM ('single', 'group', 'clinic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS session_type coaching_session_type NOT NULL DEFAULT 'single';

-- 8. Helpful indexes for marketplace queries.
CREATE INDEX IF NOT EXISTS coaches_verified_idx
  ON coaches (is_verified_by_feera, is_accepting_bookings)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS coaches_currency_idx ON coaches (currency);

-- 9. Reuse a uniqueness guard so a learner cannot double-book the same coach
--    for the exact same start time (race-safe alongside the application check).
CREATE UNIQUE INDEX IF NOT EXISTS coaching_sessions_coach_start_uq
  ON coaching_sessions (coach_id, start_at)
  WHERE status IN ('pending', 'confirmed');
