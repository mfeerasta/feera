-- Migration: add coaches.photos for marketplace gallery uploads.
-- Source: packages/db/src/schema/coaching.ts (sibling addition).
-- Owner: M3 storage workstream (ADR-0008).
--
-- The verification_documents jsonb stays reserved for ID, insurance, and
-- certification scans (private bucket). photos is a public-bucket gallery the
-- coach shows on their marketplace profile.

ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN coaches.photos IS 'Public gallery photos for the coach profile. Array of { key, url, sizeBytes, contentType, uploadedAt }.';
