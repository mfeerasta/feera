/**
 * Schema barrel. Each file groups closely related tables.
 *
 * M1 status:
 *   - users, user-ratings, user-social-scores: scaffolded
 *   - clubs, courts, court-pricing-rules: scaffolded
 *   - bookings, booking-participants: scaffolded
 *   - matches: scaffolded (rating_changes column reserved for Glicko deltas)
 *
 * Deferred to M2:
 *   - tournaments + tournament-registrations + tournament-rounds + tournament-matches
 *   - coaches + coaching-sessions
 *   - chats + chat-members + chat-messages
 *   - payments + payouts
 *   - club-staff, federations + federation-player-links
 *   - edition-memberships + edition-clubs
 *   - audit-log
 *
 * RLS policies live in `migrations/000X-rls-*.sql` and ship in M2 alongside the rest of the
 * schema, with integration tests that explicitly assert unauthorized access is denied.
 */
export * from './users.js';
export * from './clubs.js';
export * from './bookings.js';
export * from './matches.js';
