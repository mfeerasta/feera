-- users + user_ratings + user_social_scores
-- Read own row always. Read other users' rows for product UX (club rosters,
-- match participants, open matches) regardless of gender_visibility — the
-- API serializer (apps/web/src/lib/api/user-serializer.ts) does the
-- column-level mask on the `gender` field per request. Writes restricted
-- to the user themselves or service role.
--
-- The previous version of this policy also gated row visibility on
-- friendship; that prevented strangers from seeing booking opponents in
-- the open-match feed which we need for matchmaking. Column masking via
-- the serializer is the spec-aligned approach: `gender_visibility`
-- controls the gender FIELD, not the row.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self ON users;
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (id = auth.user_id());

DROP POLICY IF EXISTS users_select_public ON users;
-- All signed-in users can read non-deleted user rows. The `gender` column
-- itself is masked at the API serializer per the user's
-- `gender_visibility` setting. See `apps/web/src/lib/api/user-serializer.ts`.
CREATE POLICY users_select_public ON users
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND auth.user_id() IS NOT NULL
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
