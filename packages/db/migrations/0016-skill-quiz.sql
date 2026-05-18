-- Migration: store onboarding skill-quiz answers on users.
-- Schema: jsonb with an array of 8 answer indices (0|1|2) plus the derived
-- starting display rating. Example:
--   { "answers": [1,0,2,1,1,0,1,2], "startingRating": 4.5, "completedAt": "..." }
-- The derived rating is only applied to user_ratings when match_count = 0.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS skill_quiz_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
