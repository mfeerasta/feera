-- users + user_ratings + user_social_scores
-- Read own row always. Read other users' public fields when their
-- gender_visibility = 'public' or there is an accepted friendship.
-- Writes restricted to the user themselves or service role.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self ON users;
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (id = auth.user_id());

DROP POLICY IF EXISTS users_select_public ON users;
-- Friend-visible branch reads the `friendships` table (M4). We still guard
-- with `to_regclass` so the policy compiles in dev DBs that haven't applied
-- the friendships migration yet.
CREATE POLICY users_select_public ON users
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      gender_visibility = 'public'
      OR auth.user_id() = id
      OR (
        to_regclass('public.friendships') IS NOT NULL
        AND auth.user_id() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.requester_user_id = auth.user_id() AND f.addressee_user_id = users.id)
              OR (f.addressee_user_id = auth.user_id() AND f.requester_user_id = users.id)
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS users_select_service ON users;
CREATE POLICY users_select_service ON users
  FOR SELECT
  USING (auth.role() IN ('admin', 'service_role'));

DROP POLICY IF EXISTS users_update_self ON users;
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (id = auth.user_id())
  WITH CHECK (id = auth.user_id());

DROP POLICY IF EXISTS users_insert_service ON users;
CREATE POLICY users_insert_service ON users
  FOR INSERT
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

DROP POLICY IF EXISTS users_delete_service ON users;
CREATE POLICY users_delete_service ON users
  FOR DELETE
  USING (auth.role() IN ('service_role', 'admin'));

ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_ratings_select_all ON user_ratings;
CREATE POLICY user_ratings_select_all ON user_ratings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS user_ratings_write_service ON user_ratings;
CREATE POLICY user_ratings_write_service ON user_ratings
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE user_social_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_social_scores FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_social_scores_select_self ON user_social_scores;
CREATE POLICY user_social_scores_select_self ON user_social_scores
  FOR SELECT
  USING (user_id = auth.user_id());
