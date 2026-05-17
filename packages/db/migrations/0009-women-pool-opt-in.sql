-- 0009-women-pool-opt-in.sql
-- Adds users.women_only_pool_opt_in: explicit opt-in to the women-only matchmaking pool.
-- Default false (opt-in required by women players). Apply against Neon prod once the
-- privacy panel UI ships and players have a chance to set it during onboarding.
-- Run with: psql "$DATABASE_URL" -f packages/db/migrations/0009-women-pool-opt-in.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS women_only_pool_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN users.women_only_pool_opt_in IS
  'When true, the user is eligible for the parallel women-only Glicko pool and women-only matchmaking. Gated on gender = ''f''.';
