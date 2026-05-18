/**
 * Schema barrel. Each file groups closely related tables.
 *
 * M1:
 *   - users, user-ratings, user-social-scores
 *   - clubs, courts, court-pricing-rules
 *   - bookings, booking-participants
 *   - matches
 *
 * M2 additions:
 *   - tournaments, tournament-registrations, tournament-rounds, tournament-matches
 *   - coaches, coaching-sessions
 *   - chats, chat-members, chat-messages
 *   - payments, payouts
 *   - club-staff
 *   - federations, federation-player-links
 *   - edition-memberships, edition-clubs
 *   - audit-log
 *
 * RLS policies live in `src/rls/*.sql` and are applied via a post-migrate hook
 * (M2 follow-up) after `drizzle-kit migrate` lands the table DDL.
 */
export * from './common';
export * from './users';
export * from './clubs';
export * from './bookings';
export * from './booking-join-requests';
export * from './matches';
export * from './tournaments';
export * from './coaching';
export * from './chats';
export * from './payments';
export * from './club-staff';
export * from './federations';
export * from './edition';
export * from './audit';
export * from './friendships';
export * from './user-deletion-requests';
export * from './booking-credits';
export * from './match-disputes';
export * from './push-tokens';
export * from './notifications-outbox';
export * from './worker-heartbeats';
export * from './court-closures';
export * from './club-member-notes';
export * from './booking-invites';
