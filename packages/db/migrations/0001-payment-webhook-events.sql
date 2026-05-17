-- Migration 0001: add payment_webhook_events table for Stripe webhook idempotency.
--
-- Apply separately from the baseline. Run via `psql $DATABASE_URL -f` before
-- the apps/web `/api/v1/payments/webhook/stripe` route goes live in prod.
--
-- Coordinated by the payments subagent. The baseline (0000) is not regenerated.

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider payment_provider NOT NULL,
  event_id text NOT NULL,
  event_type text,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_uq
  ON payment_webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS payment_webhook_events_received_idx
  ON payment_webhook_events (received_at);

-- RLS: only the platform itself (service role) writes here. Nothing reads it
-- except admin tooling. Lock it down.
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_webhook_events_admin_only ON payment_webhook_events;
CREATE POLICY payment_webhook_events_admin_only ON payment_webhook_events
  FOR ALL
  USING (auth.role() = 'platform_admin')
  WITH CHECK (auth.role() = 'platform_admin');
