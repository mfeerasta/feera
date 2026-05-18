-- 0016-dm-chat-context-key.sql
-- Adds a text context_key to chats. For DM (type='direct') we set this to
-- the canonical-ordered "minUserId:maxUserId" so a unique lookup is O(1)
-- and a partial unique index prevents duplicate DM rows for the same pair.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0016-dm-chat-context-key.sql

ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_key text;

CREATE UNIQUE INDEX IF NOT EXISTS chats_dm_context_key_uq
  ON chats (context_key)
  WHERE type = 'direct' AND context_key IS NOT NULL;
