-- edition-realtime.sql
-- Postgres NOTIFY trigger so Hermes can react to new Edition applications
-- without polling. Channel: edition_application_inserted.
--
-- Payload (json):
--   {
--     "id": "<membership uuid>",
--     "user_id": "<uuid>",
--     "status": "applicant",
--     "applied_at": "<iso8601>",
--     "tier": "standard|founders"
--   }
--
-- Apply with:
--   psql "$DATABASE_URL" -f packages/db/src/sql/edition-realtime.sql

CREATE OR REPLACE FUNCTION notify_edition_application_inserted()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  IF NEW.status = 'applicant' THEN
    payload := json_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'status', NEW.status,
      'applied_at', NEW.applied_at,
      'tier', NEW.tier
    );
    PERFORM pg_notify('edition_application_inserted', payload::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS edition_memberships_after_insert ON edition_memberships;
CREATE TRIGGER edition_memberships_after_insert
  AFTER INSERT ON edition_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_edition_application_inserted();
