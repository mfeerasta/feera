-- Migration: pre-match check-in support.
-- Adds checked_in_at to booking_participants and an in_progress value to the
-- booking_status enum (slotted between confirmed and cancelled per the lifecycle
-- in packages/db/src/schema/common.ts).

ALTER TABLE booking_participants
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Add the in_progress value to booking_status if it isn't already there.
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
