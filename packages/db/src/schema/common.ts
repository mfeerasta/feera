import { sql } from 'drizzle-orm';
import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core';

export const idColumn = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`);

export const createdAtColumn = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const updatedAtColumn = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const deletedAtColumn = () => timestamp('deleted_at', { withTimezone: true });

export const localeEnum = pgEnum('locale', ['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt']);

export const genderVisibilityEnum = pgEnum('gender_visibility', [
  'public',
  'friends',
  'private',
]);

export const editionStatusEnum = pgEnum('edition_status', [
  'none',
  'applicant',
  'active',
  'lapsed',
  'suspended',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'in_progress',
  'cancelled',
  'completed',
  'no_show',
]);

export const matchVerificationEnum = pgEnum('match_verification_status', [
  'unverified',
  'peer_verified',
  'club_verified',
]);

export const genderPreferenceEnum = pgEnum('gender_preference', [
  'open',
  'men_only',
  'women_only',
  'mixed',
]);

/**
 * booking_participants.status lifecycle.
 *   invited     - organizer invited this user, no response yet
 *   accepted    - user confirmed they will play
 *   declined    - user actively declined
 *   removed     - organizer removed them
 *   no_show     - confirmed but did not show up
 *   waitlisted  - open-match queue position
 */
export const bookingParticipantStatusEnum = pgEnum('booking_participant_status', [
  'invited',
  'accepted',
  'declined',
  'removed',
  'no_show',
  'waitlisted',
]);

export const bookingPaymentStatusEnum = pgEnum('booking_payment_status', [
  'pending',
  'partial',
  'paid',
  'refunded',
  'waived',
]);

export const tournamentFormatEnum = pgEnum('tournament_format', [
  'americano',
  'mexicano',
  'round_robin',
  'single_elimination',
  'double_elimination',
  'king_of_the_court',
  'pplp',
]);

export const tournamentStatusEnum = pgEnum('tournament_status', [
  'draft',
  'open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const tournamentRegistrationStatusEnum = pgEnum('tournament_registration_status', [
  'pending',
  'confirmed',
  'waitlisted',
  'withdrawn',
  'rejected',
]);

export const tournamentMatchStatusEnum = pgEnum('tournament_match_status', [
  'scheduled',
  'in_progress',
  'completed',
  'walkover',
  'cancelled',
]);

export const coachingSessionStatusEnum = pgEnum('coaching_session_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export const chatTypeEnum = pgEnum('chat_type', [
  'direct',
  'group',
  'booking',
  'tournament',
  'coaching',
  'support',
]);

export const chatMessageKindEnum = pgEnum('chat_message_kind', [
  'text',
  'image',
  'system',
  'location',
  'booking_invite',
  'score_card',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
  'disputed',
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'raast',
  'jazzcash',
  'easypaisa',
  'stripe',
  'manual',
]);

export const paymentPurposeEnum = pgEnum('payment_purpose', [
  'booking',
  'tournament_entry',
  'coaching_session',
  'edition_membership',
  'shop',
  'other',
]);

export const payoutStatusEnum = pgEnum('payout_status', [
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
]);

export const clubStaffRoleEnum = pgEnum('club_staff_role', [
  'owner',
  'manager',
  'staff',
  'coach',
  'front_desk',
]);

export const editionMembershipTierEnum = pgEnum('edition_membership_tier', [
  'standard',
  'patron',
  'founding',
]);

export const editionClubStatusEnum = pgEnum('edition_club_status', [
  'pending',
  'active',
  'paused',
  'terminated',
]);

export const clubApprovalStatusEnum = pgEnum('club_approval_status', [
  'pending',
  'approved',
  'rejected',
]);

export const auditActorTypeEnum = pgEnum('audit_actor_type', [
  'user',
  'club_staff',
  'admin',
  'system',
  'service',
]);
