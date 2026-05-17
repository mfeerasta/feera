# 0011. Slot-level bookings and open-match join flow

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: bookings, matchmaking, social

## Context

Per M's product spec on 2026-05-17: two friends should be able to book a padel court without committing all four seats, leaving the remaining seats open for strangers to request and join. The original organizer (or club staff) approves or declines join requests.

This is the canonical padel social pattern (PlayTomic, Padel.fr, Padelo all do it). It is also the liquidity engine of the platform: clubs maximise utilisation, players find games faster, the matchmaking algorithm has more candidates to score.

## Decision

Make `bookings` slot-aware:

- `bookings.seats_booked` (int, default 1). The organizer counts as the first seat.
- `bookings.is_open_match` (bool, derived = `seats_booked < max_participants` at write time; existing column reused).
- `seats_open` is derived in queries (`max_participants - seats_booked`); no generated column to keep Postgres-version-agnostic.

Add `booking_join_requests` table:

- `id`, `booking_id`, `requester_user_id`, `seats_requested` (default 1), `status` (pending/approved/declined/cancelled/expired), `message`, `requester_rating_display` (snapshot), `responded_by_user_id`, `responded_at`, timestamps.
- RLS: requester sees their own; booking organizer + accepted participants see all for their booking; service role writes.

Endpoints under `/api/v1/`:

- `POST /bookings` — accepts `seats_booked` (1-4). Organizer pays full court price up front; participants who join later settle via Stripe split (deferred to M3-C webhook).
- `POST /bookings/[id]/join` — requester opens a request. Snapshots rating.
- `PATCH /bookings/[id]/join/[requestId]` — organizer/club-staff approves or declines.
- `DELETE /bookings/[id]/join/[requestId]` — requester cancels.
- `GET /bookings/open?city=&from=&to=&minLevel=&maxLevel=` — public open-match feed.

Approval flow runs inside a SERIALIZABLE transaction so two concurrent approvals cannot overfill the court.

## Considered alternatives

### Alternative A: per-seat booking rows (one row per seat)
Pros: trivial seat-availability arithmetic.
Cons: pricing semantics get weird (do we split price/seat?); breaks the existing "organizer pays full court" model that already works; needs full-table migration.

### Alternative B: "split bookings" (organizer creates booking, separate flow to invite strangers)
Pros: clean separation.
Cons: doubles the surface area (two booking sub-types). Players have to learn two flows.

### Alternative C: chat-room-style requests (free-form)
Pros: low schema cost.
Cons: no clean accept/decline state machine; no auditable trail for refunds; harder to surface in feeds.

## Why this design wins

- One booking row covers both "private full court" (`seats_booked = 4`) and "open match" (`seats_booked < 4`); the UI just toggles a single number.
- Join requests are a typed state machine, easy to render and easy to audit.
- The matchmaking algorithm (partner-finder) already reads `is_open_match` + participant ratings; nothing changes there.
- Pricing stays per-court (organizer commits the full slot); Stripe split-pay (M3-C webhook + M3 polish) settles participants later. No double-charging risk during the join-request phase because the requester hasn't paid yet.

## Consequences

- Positive: minimal schema change (one column + one table). Existing organizer-pays-all flow keeps working.
- Positive: open-match feed is a single index-friendly query (`is_open_match=true AND start_at > now() AND seats_open > 0`).
- Negative: organizer carries the upfront price risk if no joiners show up. Mitigation: surfaced in UI ("you will pay the full price now; joiners settle their share to you in-app"); a cancellation policy follows in M3 polish.
- Follow-up: ADR-00NN once we wire automatic refunds when an organizer cancels with confirmed joiners.

## Implementation status

Schema + endpoints + UI shipped together in M5 by subagents E1 + E2 + E3 (this session). Migrations: `0003-club-approval.sql` (E1) and `0004-slot-bookings.sql` (E2).
