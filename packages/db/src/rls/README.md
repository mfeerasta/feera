# Row Level Security policies

Each `.sql` file in this directory enables RLS on one table group and installs
named policies. Policies assume the following helpers exist in the `auth` schema,
which is provisioned in M2 alongside the better-auth bootstrap:

- `auth.user_id() returns uuid` — the authenticated user's id, or NULL for anon.
- `auth.role() returns text` — one of: `anon`, `user`, `club_staff`, `admin`, `service_role`.
- `auth.country_code() returns text` — ISO 3166-1 alpha-2.
- `auth.edition_status() returns text` — one of: `none`, `applicant`, `active`, `lapsed`, `suspended`.

These helpers wrap claims encoded into the better-auth-issued JWT (ADR-0006).
The Postgres connection used by app traffic runs as `feera_app` (least privilege).
Migrations and admin tools connect as `neondb_owner` and bypass RLS.

## Deploy flow

The intended deploy sequence (M2 follow-up work tracks the actual implementation):

1. `pnpm -C packages/db db:generate` — Drizzle emits table DDL to `packages/db/drizzle/`.
2. `pnpm -C packages/db db:migrate` — applies the DDL to the target Neon branch.
3. Post-migrate hook executes every `.sql` file in `packages/db/src/rls/` in
   alphabetical order against the same connection. Files are idempotent
   (`DROP POLICY IF EXISTS` before `CREATE POLICY`).
4. Integration tests assume the `feera_app` role and assert that unauthorised
   reads and writes are denied.

## Conventions

- One file per table group, named after the schema file (`users.sql`,
  `bookings.sql`, etc.).
- Always `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` so even the
  table owner cannot bypass policies in regular sessions.
- Policy names follow `<table>_<action>_<scope>`, e.g. `bookings_select_member`,
  `payments_select_payer`.
- Service-role-only tables (audit log, payments insert) get a single permissive
  policy gated on `auth.role() = 'service_role'`.

## Friendships table

`users.sql` references a `friendships` table for the friends visibility scope.
That table is not in the Drizzle schema yet (deferred to M4 chat work) so the
policy uses a `EXISTS (... )` subquery that returns false until the table lands.
The policy compiles regardless; once `friendships` ships, friend-visible reads
start working without a policy rewrite.
