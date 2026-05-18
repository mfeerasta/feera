-- 0017-user-handles.sql
-- Adds users.handle: a short, public, URL-safe identifier so a profile can be
-- shared as https://feera.ai/p/{handle}. Case-insensitive uniqueness via a
-- functional unique index on lower(handle). Nullable so existing rows are
-- unaffected; a backfill script seeds handles for current users.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0017-user-handles.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS handle text;

CREATE UNIQUE INDEX IF NOT EXISTS users_handle_lower_uq
  ON users (lower(handle))
  WHERE handle IS NOT NULL;
