# Feera + Feera Edition — Build Spec

> Source: M's prompt of 2026-05-17. Reproduced verbatim in `docs/spec-original.md`. This file holds the working spec; amendments are tracked as ADRs in `docs/decisions/`.

## TL;DR

Build Feera (consumer platform) and Feera Edition (members tier) as one monorepo. Phase 1 MVP in 10-14 weeks. Closed beta with 200 users across Lahore, Karachi, Islamabad, Dubai at the end of Milestone 8.

See README.md for the high-level summary and the full prompt in `docs/spec-original.md` for canonical detail.

## Milestone map

| # | Weeks | Theme | Checkpoint |
|---|---|---|---|
| 1 | 1-2 | Foundation: monorepo, auth, Glicko, observability | CHECKPOINT-1.md |
| 2 | 3-4 | DB + RLS + club/court CRUD + admin dash skeleton | CHECKPOINT-2.md |
| 3 | 5-6 | Booking flow + payment adapters end-to-end | CHECKPOINT-3.md |
| 4 | 6-7 | Matchmaking + chat + rating updates + score entry | CHECKPOINT-4.md |
| 5 | 8-9 | Tournament engine + live scoring + PPF stub | CHECKPOINT-5.md |
| 6 | 10-11 | i18n full (en/ur/ar RTL) + women's privacy + notifications | CHECKPOINT-6.md |
| 7 | 12-13 | Edition microsite + membership flow + Hermes skills | CHECKPOINT-7.md |
| 8 | 13-14 | Polish, hardening, closed beta launch | CHECKPOINT-8.md |
