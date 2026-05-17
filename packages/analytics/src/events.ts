/**
 * Single source of truth for product event taxonomy.
 * Any new emitter MUST add its event name + payload shape here. PRs that
 * introduce an emit() without a typed entry fail in CI (via `pnpm i18n:check`-style gate
 * once the lint rule lands in M6).
 */

export type EventName =
  // Auth & onboarding
  | 'user_signed_up'
  | 'user_signed_in'
  | 'onboarding_completed'
  | 'level_self_assessed'
  // Discovery
  | 'club_viewed'
  | 'court_viewed'
  | 'discovery_filter_applied'
  // Booking
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  // Match
  | 'match_created'
  | 'match_joined'
  | 'match_score_submitted'
  | 'match_verified'
  | 'match_disputed'
  | 'match_played'
  // Rating
  | 'rating_updated'
  | 'rating_provisional_cleared'
  | 'sandbag_flag_raised'
  // Tournament
  | 'tournament_viewed'
  | 'tournament_registered'
  | 'tournament_round_started'
  | 'tournament_completed'
  // Coaching
  | 'coach_viewed'
  | 'coaching_session_booked'
  | 'coaching_session_reviewed'
  // Edition
  | 'edition_microsite_viewed'
  | 'edition_applied'
  | 'edition_accepted'
  | 'edition_member_activated'
  // Payments
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payout_processed'
  // Chat
  | 'chat_opened'
  | 'chat_message_sent';

export interface EventProperties {
  // Allow free-form context, but encourage typed shapes per-event in M2.
  [key: string]: string | number | boolean | null | undefined;
}

export type AnalyticsEvent = {
  name: EventName;
  properties?: EventProperties;
  /** Distinct id (Feera user id or anonymous device id). */
  distinctId: string;
};
