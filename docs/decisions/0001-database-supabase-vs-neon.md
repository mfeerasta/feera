# 0001. Primary database: Supabase Postgres (not Neon)

- Status: **SUPERSEDED by [0005](0005-database-neon.md)** on 2026-05-17
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: db, infra, auth

## Note

Original decision was Supabase. Superseded the same day after M opted for self-hosted on Hetzner with Neon as the DB. See ADR-0005 (Neon as primary DB), ADR-0006 (auth), ADR-0007 (realtime), ADR-0008 (storage), ADR-0009 (Hetzner hosting). Kept on file for context.

## Original context (preserved)

Feera needs a Postgres provider that gives RLS, Auth, Realtime, Storage, EU region. Two existing Supabase projects under the same Vercel account exist; reusing the stack would have minimized glue code.

## Why it was superseded

M chose Hetzner hosting + Neon DB. Decoupling the DB from the BaaS bundle:

- Lets us own the box (cost, latency to Pakistan via DE/FI, no vendor lock).
- Lets us pick best-of-breed for each layer (Neon for branching, better-auth for auth, Soketi for realtime, Hetzner Object Storage for blobs).
- Matches the existing ops pattern on `46.225.157.75` (Polymath, cards, sentinel, hermes).
