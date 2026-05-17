# 0001. Primary database: Supabase Postgres (not Neon)

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: db, infra, auth

## Context

Feera needs a Postgres provider that gives us:

- Row Level Security (mandatory for the privacy model).
- Auth (phone OTP, WhatsApp OTP, email magic, OAuth).
- Realtime channels for chat + live tournament scoring.
- Storage for photos.
- A region in Europe for GDPR posture, with paths to Mumbai + UAE later.

A Neon project (`floral-resonance-47691082`, Singapore) was provisioned earlier in the same workspace, and a Neon MCP server was wired into Claude Code. This is an option worth weighing because Neon offers branch-per-PR Postgres at very low cost.

## Options considered

### Option A: Supabase Postgres (eu-central-1 Frankfurt)
Pros:
- Built-in Auth covers phone OTP via Twilio, WhatsApp OTP, email magic, Google, Apple in one provider.
- Built-in Realtime over Postgres replication; chat and live tournament scoring work out of the box.
- Built-in Storage for photos with RLS-aware policies.
- Vault for PII encryption at rest.
- RLS-first ergonomics; policies are first-class.
- Two existing Supabase projects under the same Vercel account (`qcvxefbrzkspoldjydrx` for Tabl, `hwkcjswcxbhlhqvnbtbc` for Polymath), known operational model.

Cons:
- Branching is per-project (paid plan) and clunkier than Neon.
- Pooler quirks (Supavisor) on IPv4-only hosts.

### Option B: Neon + roll our own Auth/Realtime/Storage
Pros:
- Branch-per-PR Postgres is excellent for migration safety.
- Generous free tier; scale-to-zero compute.
- Already provisioned and connected via MCP for ad-hoc admin.

Cons:
- We rebuild Auth (better-auth or NextAuth + Twilio Verify), Realtime (Pusher / Ably / Soketi), Storage (R2 / S3) ourselves.
- More moving parts, more bills, more SDKs in the bundle.
- Region currently `ap-southeast-1` (Singapore); we want eu-central-1 for GDPR.

## Decision

Use **Supabase Postgres in eu-central-1 (Frankfurt)** as the primary database for Feera. Keep the existing Neon project as a sandbox for ad-hoc experiments and as a Phase-2 candidate for per-PR ephemeral DBs if Supabase branching disappoints.

## Rationale

The spec explicitly mandates Supabase ("Database Schema (Supabase Postgres)" and "Supabase: production project in eu-central-1"). The biggest Feera unknowns are product (matchmaking liquidity, women's privacy model, Edition tier) and operations (Pakistan payments, federations). Reusing the Supabase stack lets us focus engineering on those unknowns instead of rebuilding the Auth + Realtime + Storage triad.

We already operate two Supabase projects, so the runbooks and SDK patterns transfer cleanly.

## Consequences

- Positive: single provider for DB + Auth + Realtime + Storage + Vault. Less glue code. Familiar ops.
- Positive: GDPR posture day-one via Frankfurt region.
- Negative: branching is less ergonomic than Neon. We will revisit in Phase 2 if migration safety becomes a bottleneck.
- Negative: lock-in to Supabase pricing as we scale. Mitigation: keep Drizzle as the ORM layer so we always speak raw Postgres, and never use Supabase-specific SQL extensions without an ADR.
- Follow-up: ADR-0006 will cover the branching strategy (Supabase branches vs Neon-as-preview-DB).
