-- Migration 0003: add club approval workflow.
--
-- Adds `clubs.approval_status` enum so public self-onboarding submissions
-- can be queued for an admin review before going live in the public
-- directory. Existing rows backfill to 'approved' so nothing currently
-- live in the admin shell disappears.
--
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0003-club-approval.sql
-- Parent integrator applies this against Neon prod.

DO $$ BEGIN
  CREATE TYPE club_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS approval_status club_approval_status
  NOT NULL DEFAULT 'pending';

-- Backfill: every row that existed before this migration is treated as
-- approved (admin team curated them by hand).
UPDATE clubs SET approval_status = 'approved' WHERE approval_status = 'pending';

-- New rows from the public onboarding endpoint default to 'pending'; the
-- endpoint sets is_active=false alongside this so the directory hides them
-- until an admin flips both.
CREATE INDEX IF NOT EXISTS clubs_approval_status_idx
  ON clubs (approval_status);
