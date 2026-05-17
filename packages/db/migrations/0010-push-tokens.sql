-- Migration: push tokens table for apps/mobile (Expo / FCM / APNs).
-- See packages/db/src/schema/push-tokens.ts for the Drizzle source of truth.

DO $$ BEGIN
  CREATE TYPE push_platform AS ENUM ('expo', 'ios', 'android', 'web');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS push_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        text NOT NULL,
  platform     push_platform NOT NULL DEFAULT 'expo',
  device_name  text,
  app_version  text,
  locale       text,
  last_seen_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_uq ON push_tokens (user_id, token);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens (user_id);

-- RLS: only the owning user can read/write their tokens.
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY push_tokens_owner_select ON push_tokens
    FOR SELECT USING (user_id = auth.user_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY push_tokens_owner_write ON push_tokens
    FOR ALL USING (user_id = auth.user_id())
    WITH CHECK (user_id = auth.user_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
