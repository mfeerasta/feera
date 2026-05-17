-- federations + federation_player_links
-- Federations are public-read. Federation player links are public-read
-- (a user's federation rating is a public credential) but mutations
-- restricted to the linked user themselves.

ALTER TABLE federations ENABLE ROW LEVEL SECURITY;
ALTER TABLE federations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS federations_select_public ON federations;
CREATE POLICY federations_select_public ON federations
  FOR SELECT
  USING (is_active = true);


ALTER TABLE federation_player_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE federation_player_links FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS federation_player_links_select_public ON federation_player_links;
CREATE POLICY federation_player_links_select_public ON federation_player_links
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS federation_player_links_insert_self ON federation_player_links;
CREATE POLICY federation_player_links_insert_self ON federation_player_links
  FOR INSERT
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS federation_player_links_update_self ON federation_player_links;
CREATE POLICY federation_player_links_update_self ON federation_player_links
  FOR UPDATE
  USING (user_id = auth.user_id())
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS federation_player_links_delete_self ON federation_player_links;
CREATE POLICY federation_player_links_delete_self ON federation_player_links
  FOR DELETE
  USING (user_id = auth.user_id());
