-- chats + chat_members + chat_messages
-- Read if member. Insert messages if member.

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chats_select_member ON chats;
CREATE POLICY chats_select_member ON chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.chat_id = chats.id
        AND cm.user_id = auth.user_id()
        AND cm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS chats_insert_self ON chats;
CREATE POLICY chats_insert_self ON chats
  FOR INSERT
  WITH CHECK (created_by_user_id = auth.user_id());

DROP POLICY IF EXISTS chats_update_member ON chats;
CREATE POLICY chats_update_member ON chats
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.chat_id = chats.id
        AND cm.user_id = auth.user_id()
        AND cm.role IN ('owner', 'admin')
        AND cm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS chats_write_service ON chats;
CREATE POLICY chats_write_service ON chats
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_members_select_member ON chat_members;
CREATE POLICY chat_members_select_member ON chat_members
  FOR SELECT
  USING (
    user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM chat_members peer
      WHERE peer.chat_id = chat_members.chat_id
        AND peer.user_id = auth.user_id()
        AND peer.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS chat_members_insert_self_or_owner ON chat_members;
CREATE POLICY chat_members_insert_self_or_owner ON chat_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.user_id()
    OR EXISTS (
      SELECT 1 FROM chat_members peer
      WHERE peer.chat_id = chat_members.chat_id
        AND peer.user_id = auth.user_id()
        AND peer.role IN ('owner', 'admin')
        AND peer.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS chat_members_update_self ON chat_members;
CREATE POLICY chat_members_update_self ON chat_members
  FOR UPDATE
  USING (user_id = auth.user_id());

DROP POLICY IF EXISTS chat_members_write_service ON chat_members;
CREATE POLICY chat_members_write_service ON chat_members
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_messages_select_member ON chat_messages;
CREATE POLICY chat_messages_select_member ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.chat_id = chat_messages.chat_id
        AND cm.user_id = auth.user_id()
        AND cm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS chat_messages_insert_member ON chat_messages;
CREATE POLICY chat_messages_insert_member ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_user_id = auth.user_id()
    AND EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.chat_id = chat_messages.chat_id
        AND cm.user_id = auth.user_id()
        AND cm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS chat_messages_update_sender ON chat_messages;
CREATE POLICY chat_messages_update_sender ON chat_messages
  FOR UPDATE
  USING (sender_user_id = auth.user_id());

DROP POLICY IF EXISTS chat_messages_delete_sender ON chat_messages;
CREATE POLICY chat_messages_delete_sender ON chat_messages
  FOR DELETE
  USING (sender_user_id = auth.user_id());

DROP POLICY IF EXISTS chat_messages_write_service ON chat_messages;
CREATE POLICY chat_messages_write_service ON chat_messages
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
