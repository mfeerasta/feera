-- Feera auth helpers for Postgres RLS.
--
-- Reads JWT claims set per-request from the Next.js app via:
--   SET LOCAL request.jwt.claims = '<json>';
--
-- All functions are STABLE so the planner can cache within a statement.
-- They return NULL when no JWT is present (anonymous request).
--
-- Apply this file with:
--   psql "$DATABASE_URL" -f packages/auth/src/sql/auth-helpers.sql

create schema if not exists auth;

create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;

create or replace function auth.user_id() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.country_code() returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'country_code', '')
$$;

create or replace function auth.locale() returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'locale', '')
$$;

create or replace function auth.edition_status() returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'edition_status', '')
$$;

create or replace function auth.is_coach() returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() ->> 'is_coach')::boolean, false)
$$;

create or replace function auth.is_club_staff() returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() ->> 'is_club_staff')::boolean, false)
$$;

-- Role helper. Returns the highest-privilege string for this JWT, used
-- by RLS policies that branch on actor type. Extend as new roles land.
create or replace function auth.role() returns text
language sql stable
as $$
  select case
    when auth.is_club_staff() then 'club_staff'
    when auth.is_coach() then 'coach'
    when auth.user_id() is not null then 'user'
    else 'anonymous'
  end
$$;

comment on function auth.user_id() is
  'Returns the better-auth user id from the request JWT, or NULL when anonymous.';
