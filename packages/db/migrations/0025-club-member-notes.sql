-- Migration: club_member_notes. Club operator CRM for players (VIP flags,
-- bans, free text). RLS keeps notes private to the club staff.
-- Source: packages/db/src/schema/club-member-notes.ts

CREATE TABLE IF NOT EXISTS club_member_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  is_vip boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  notes text,
  last_updated_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS club_member_notes_club_user_uq
  ON club_member_notes (club_id, user_id);

CREATE INDEX IF NOT EXISTS club_member_notes_club_flags_idx
  ON club_member_notes (club_id, is_vip, is_banned);

ALTER TABLE club_member_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY club_member_notes_staff_rw ON club_member_notes
    FOR ALL
    USING (
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'isClubStaff')::boolean,
        false
      )
    )
    WITH CHECK (
      coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'isClubStaff')::boolean,
        false
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
