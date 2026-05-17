-- 0001_friendships.sql
-- Adds the friendships table + supporting enum + indexes.
-- Apply with: psql "$DATABASE_URL" -f packages/db/migrations/0001_friendships.sql
-- Parent integrator runs this against Neon prod after M4 reviewer sign-off.

DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  note text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self_ck CHECK (requester_user_id <> addressee_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_uq
  ON friendships (requester_user_id, addressee_user_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_status_idx
  ON friendships (addressee_user_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_status_idx
  ON friendships (requester_user_id, status);

-- RLS: only the two participants may see / write the row.
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friendships_select_own ON friendships;
CREATE POLICY friendships_select_own ON friendships
  FOR SELECT USING (
    auth.user_id() IN (requester_user_id, addressee_user_id)
  );

DROP POLICY IF EXISTS friendships_insert_self ON friendships;
CREATE POLICY friendships_insert_self ON friendships
  FOR INSERT WITH CHECK (auth.user_id() = requester_user_id);

DROP POLICY IF EXISTS friendships_update_participant ON friendships;
CREATE POLICY friendships_update_participant ON friendships
  FOR UPDATE USING (
    auth.user_id() IN (requester_user_id, addressee_user_id)
  );

DROP POLICY IF EXISTS friendships_delete_participant ON friendships;
CREATE POLICY friendships_delete_participant ON friendships
  FOR DELETE USING (
    auth.user_id() IN (requester_user_id, addressee_user_id)
  );
