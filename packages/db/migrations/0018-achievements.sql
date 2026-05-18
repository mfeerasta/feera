-- 0018-achievements.sql
-- Achievement catalogue + per-user award log.
-- Catalogue rows are seeded via packages/db/scripts/seed-achievements.mjs.
-- Awards are inserted by the services/workers award-achievements job and are
-- unique per (user_id, achievement_id) so reruns are safe.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0018-achievements.sql

DO $$ BEGIN
  CREATE TYPE achievement_category AS ENUM (
    'progress', 'milestones', 'streaks', 'social', 'tournaments'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY,
  name_key text NOT NULL,
  description_key text NOT NULL,
  icon text NOT NULL,
  category achievement_category NOT NULL,
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT user_achievements_uq UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx
  ON user_achievements (user_id, awarded_at DESC);

-- RLS: achievements catalogue is world-readable. user_achievements is
-- owner-read; the public profile route reads via the service role.
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS achievements_select_public ON achievements;
CREATE POLICY achievements_select_public ON achievements
  FOR SELECT USING (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_achievements_select_own ON user_achievements;
CREATE POLICY user_achievements_select_own ON user_achievements
  FOR SELECT USING (auth.user_id() = user_id);
DROP POLICY IF EXISTS user_achievements_select_public ON user_achievements;
CREATE POLICY user_achievements_select_public ON user_achievements
  FOR SELECT USING (true);
DROP POLICY IF EXISTS user_achievements_insert_self ON user_achievements;
CREATE POLICY user_achievements_insert_self ON user_achievements
  FOR INSERT WITH CHECK (auth.user_id() = user_id OR auth.user_id() IS NULL);
