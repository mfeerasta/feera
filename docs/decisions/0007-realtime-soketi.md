# 0007. Realtime: Soketi (Pusher-compatible, self-hosted)

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: realtime, chat, tournaments

## Context

Supabase Realtime is out (ADR-0005). We need realtime for:

- 1:1 + match group + tournament chat.
- Live tournament scoring (big-screen view + score-entry confirmations).
- Booking participant invitations + acceptances.
- Open-match feed updates.

Volume: small in Phase 1 (hundreds of concurrent connections), but the protocol choice locks us in for a while.

## Options considered

### Option A: Soketi (Pusher protocol, self-hosted on Hetzner)
Single Docker container. Same wire protocol as Pusher → official Pusher SDKs work on web + RN. Free, MIT, runs on Node. Battle-tested by Laravel ecosystem.

### Option B: Centrifugo (Go-based)
Faster, smaller memory footprint. Custom protocol + own SDKs. More work to integrate with Expo.

### Option C: Postgres LISTEN/NOTIFY + SSE
Simplest. No extra process. Works for fan-out but not for in-app chat at scale (each tab opens an SSE; backpressure handling is on us).

### Option D: Managed (Pusher, Ably)
Paid + lock-in. Skip.

### Option E: Self-host Supabase Realtime
Drags in the rest of Supabase. Rejected.

## Decision

**Soketi** on Hetzner. Pusher SDK on web + mobile.

## Implementation

- `services/realtime/` (Docker Compose service) runs Soketi.
- Caddy reverse-proxies `realtime.feera.ai` → Soketi on port 6001.
- App-side: `pusher-js` on web, `@pusher/pusher-websocket-react-native` on mobile.
- Channel scheme:
  - `presence-club-{clubId}` for club-staff broadcasts.
  - `private-match-{matchId}` for in-match chat.
  - `private-tournament-{tournamentId}` for tournament scoring + chat.
  - `private-user-{userId}` for personal notifications.
- Authorisation endpoint at `/api/realtime/auth` (Next Route Handler) checks the better-auth session before signing channel tokens.

## Consequences

- Positive: free, self-hosted, Pusher-protocol-compatible (huge SDK ecosystem).
- Positive: scales horizontally with Redis when needed (Phase 2).
- Negative: one more process to babysit on the Hetzner box. Mitigation: Docker Compose + restart=always + a Sentry alert hook.
