-- 0019-notif-prefs.sql
-- Per-user notification preferences. Each row is owner-private.
-- Channel booleans are the master switches; category_overrides is a sparse
-- {category: {channel: false}} map that the fanout worker honours after
-- the master switches.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0019-notif-prefs.sql

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push boolean NOT NULL DEFAULT true,
  sms boolean NOT NULL DEFAULT false,
  whatsapp boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT true,
  category_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notification_prefs_select_own ON user_notification_prefs;
CREATE POLICY user_notification_prefs_select_own ON user_notification_prefs
  FOR SELECT USING (auth.user_id() = user_id);
DROP POLICY IF EXISTS user_notification_prefs_upsert_own ON user_notification_prefs;
CREATE POLICY user_notification_prefs_upsert_own ON user_notification_prefs
  FOR INSERT WITH CHECK (auth.user_id() = user_id);
DROP POLICY IF EXISTS user_notification_prefs_update_own ON user_notification_prefs;
CREATE POLICY user_notification_prefs_update_own ON user_notification_prefs
  FOR UPDATE USING (auth.user_id() = user_id);
