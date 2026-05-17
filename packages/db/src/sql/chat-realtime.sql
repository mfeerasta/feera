-- chat-realtime.sql
-- Postgres LISTEN/NOTIFY plumbing for the M4 chat skeleton.
--
-- Channel: chat_message_inserted
-- Payload (json):
--   {
--     "id": "<uuid>",
--     "chat_id": "<uuid>",
--     "sender_user_id": "<uuid|null>",
--     "kind": "text|image|...",
--     "body": "<text|null>",
--     "attachments": [...],
--     "created_at": "<iso8601>"
--   }
--
-- Apply with:
--   psql "$DATABASE_URL" -f packages/db/src/sql/chat-realtime.sql
--
-- Phase 1 transport: SSE endpoint at /api/v1/chats/[id]/messages/stream subscribes
-- via LISTEN. Phase 2 may swap to Soketi (see ADR-0007). Trigger stays useful either way.

CREATE OR REPLACE FUNCTION notify_chat_message_inserted()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  payload := json_build_object(
    'id', NEW.id,
    'chat_id', NEW.chat_id,
    'sender_user_id', NEW.sender_user_id,
    'kind', NEW.kind,
    'body', NEW.body,
    'attachments', NEW.attachments,
    'created_at', NEW.created_at
  );
  PERFORM pg_notify('chat_message_inserted', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_after_insert ON chat_messages;
CREATE TRIGGER chat_messages_after_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message_inserted();

-- Bump chats.last_message_at automatically so list queries stay cheap.
CREATE OR REPLACE FUNCTION touch_chat_last_message_at()
RETURNS trigger AS $$
BEGIN
  UPDATE chats SET last_message_at = NEW.created_at, updated_at = now()
   WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_touch_chat ON chat_messages;
CREATE TRIGGER chat_messages_touch_chat
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION touch_chat_last_message_at();
