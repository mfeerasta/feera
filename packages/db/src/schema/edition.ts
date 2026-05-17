import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clubs } from './clubs';
import {
  createdAtColumn,
  editionClubStatusEnum,
  editionMembershipTierEnum,
  editionStatusEnum,
  idColumn,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * edition_memberships - paid membership records. One active row per user at a time.
 */
export const editionMemberships = pgTable(
  'edition_memberships',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: editionMembershipTierEnum('tier').notNull().default('standard'),
    status: editionStatusEnum('status').notNull().default('applicant'),
    appliedAt: createdAtColumn(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    annualFee: doublePrecision('annual_fee'),
    currency: text('currency'),
    paymentId: uuid('payment_id'),
    applicationAnswers: jsonb('application_answers').notNull().default(sql`'{}'::jsonb`),
    referralUserId: uuid('referral_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('edition_memberships_user_status_idx').on(t.userId, t.status),
    index('edition_memberships_expires_idx').on(t.expiresAt),
  ],
);

/**
 * edition_clubs - partner clubs in the Edition network with their negotiated terms.
 */
export const editionClubs = pgTable(
  'edition_clubs',
  {
    id: idColumn(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    status: editionClubStatusEnum('status').notNull().default('pending'),
    memberDiscountPct: doublePrecision('member_discount_pct').notNull().default(0),
    priorityBookingHours: doublePrecision('priority_booking_hours').notNull().default(0),
    reservedSlotsPerWeek: doublePrecision('reserved_slots_per_week'),
    contractStartAt: timestamp('contract_start_at', { withTimezone: true }),
    contractEndAt: timestamp('contract_end_at', { withTimezone: true }),
    contractTerms: jsonb('contract_terms').notNull().default(sql`'{}'::jsonb`),
    isFeatured: boolean('is_featured').notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('edition_clubs_club_uq').on(t.clubId),
    index('edition_clubs_status_idx').on(t.status),
  ],
);
