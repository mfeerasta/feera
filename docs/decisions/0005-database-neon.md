# 0005. Primary database: Neon Postgres

- Status: accepted (supersedes [0001](0001-database-supabase-vs-neon.md))
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: db, infra

## Context

M chose Hetzner for hosting. Supabase as a managed bundle (DB + Auth + Realtime + Storage) loses most of its value once we self-host the rest of the stack. Neon, by contrast, shines as a pure Postgres provider with branching and scale-to-zero compute.

A Neon project already exists in the workspace (`floral-resonance-47691082`, currently in `aws-ap-southeast-1` Singapore, Postgres 18) and the Neon MCP server is connected.

## Options considered

### Option A: Neon (Postgres-as-a-service, branching, scale-to-zero)
Pros:
- Per-PR DB branches → migration safety on every change.
- Scale-to-zero compute → near-zero idle cost in early markets.
- PgBouncer pooler built in (`-pooler` host suffix).
- Vercel-style provisioning even though we are not on Vercel.
- Postgres 18 (Glicko jsonb + native UUIDv7 once we adopt it).
- Already provisioned + API key + MCP connected.

Cons:
- Singapore region is wrong for GDPR posture and PK latency. Need to migrate to Frankfurt (`aws-eu-central-1`) or Helsinki (`aws-eu-north-1`) before any production traffic.
- No bundled Auth/Realtime/Storage. We pick and self-host those separately.

### Option B: Postgres on our own Hetzner box (Docker or apt)
Pros:
- Zero per-DB cost, full control.
- Same network as the app servers → submillisecond latency.

Cons:
- Backups, PITR, failover, branching, monitoring, upgrades are all on us. M does not need that yet.
- Single box failure = total outage. HA Postgres on Hetzner means we run Patroni or similar; nontrivial.

### Option C: Stay on Supabase, ignore the bundle
Pros: minimal pivot cost.
Cons: paying for managed Auth/Realtime/Storage we will not consume.

## Decision

**Neon Postgres** as the primary DB, in **`aws-eu-central-1` (Frankfurt)** for GDPR. Drizzle ORM stays the access layer. Migrations via `drizzle-kit generate` + `drizzle-kit migrate` on every deploy.

## Implementation

- Recreate the Neon project in `aws-eu-central-1` before any production data lands (the Singapore project stays as a sandbox).
- Use `-pooler` connection URL for the Next.js process. Direct URL only for migrations and admin tools.
- Adopt Neon branches per pull request via the GitHub integration (or manual `neonctl branches create` in CI).
- RLS still applies at the Postgres layer — we keep the policy-driven privacy model, just owned by us rather than enforced by Supabase's JWT-issued claims. Better-auth (ADR-0006) issues JWTs with the right `claims` for RLS to consume.

## Consequences

- Positive: branching workflow is best-in-class.
- Positive: cost scales with active CPU, not provisioned VMs.
- Positive: same provider for staging + per-PR previews + prod.
- Negative: scale-to-zero introduces a ~500ms cold-start on first query after idle. Mitigation: keepalive ping from the app every 60s in production.
- Negative: we own the rest of the stack (auth, realtime, storage). Mitigation: ADRs 0006, 0007, 0008 pick well-trodden self-hosted components.

## Migration plan

1. `neonctl projects create --name feera-prod --region-id aws-eu-central-1`.
2. `neonctl roles create --project-id <new> --name feera_app` (least-privilege role for app traffic; `neondb_owner` reserved for migrations only).
3. Update `~/Desktop/feerasta-credentials.md` with the new project id + URLs.
4. Apply baseline migration (Drizzle).
5. Smoke test from `46.225.157.75` (Falkenstein DE ↔ Frankfurt is < 5ms).
