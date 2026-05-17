-- Migration: notifications outbox for durable fan-out via services/workers.
-- See packages/db/src/schema/notifications-outbox.ts for the Drizzle source of truth.

DO $$ BEGIN
  CREATE TYPE notification_outbox_state AS ENUM (
    'queued', 'sending', 'delivered', 'failed', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_outbox_template AS ENUM (
    'booking_confirmed',
    'booking_cancelled',
    'booking_join_requested',
    'booking_join_approved',
    'booking_join_declined',
    'match_invite',
    'match_score_submitted',
    'match_disputed',
    'tournament_update',
    'chat_message',
    'payment_succeeded',
    'otp_fallback',
    'edition_application_update',
    'coaching_session_reviewed',
    'coaching_verification_approved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_outbox_urgency AS ENUM ('high', 'medium', 'low', 'marketing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notifications_outbox (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template            notification_outbox_template NOT NULL,
  variables           jsonb NOT NULL DEFAULT '{}'::jsonb,
  urgency             notification_outbox_urgency NOT NULL,
  idempotency_key     text NOT NULL,
  state               notification_outbox_state NOT NULL DEFAULT 'queued',
  channels_attempted  jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_error          text,
  retries             integer NOT NULL DEFAULT 0,
  scheduled_for       timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_outbox_idem_uq
  ON notifications_outbox (idempotency_key);
CREATE INDEX IF NOT EXISTS notifications_outbox_state_idx
  ON notifications_outbox (state, scheduled_for);
CREATE INDEX IF NOT EXISTS notifications_outbox_recipient_idx
  ON notifications_outbox (recipient_user_id);

-- RLS: service role only. App code talks to this table through the lib helper
-- using the service connection; user roles never read or write it directly.
ALTER TABLE notifications_outbox ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY notifications_outbox_service_all ON notifications_outbox
    FOR ALL
    USING (current_setting('app.role', true) = 'service')
    WITH CHECK (current_setting('app.role', true) = 'service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
