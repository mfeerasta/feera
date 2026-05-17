import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clubs, courts } from './clubs';
import {
  coachingSessionStatusEnum,
  createdAtColumn,
  deletedAtColumn,
  idColumn,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * coaches - extends a user with coaching credentials and pricing.
 */
export const coaches = pgTable(
  'coaches',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    primaryClubId: uuid('primary_club_id').references(() => clubs.id, {
      onDelete: 'set null',
    }),
    bio: text('bio'),
    languages: jsonb('languages').notNull().default(sql`'[]'::jsonb`),
    specialties: jsonb('specialties').notNull().default(sql`'[]'::jsonb`),
    certifications: jsonb('certifications').notNull().default(sql`'[]'::jsonb`),
    yearsExperience: integer('years_experience'),
    hourlyRate: doublePrecision('hourly_rate').notNull(),
    currency: text('currency').notNull(),
    acceptsWomenOnly: boolean('accepts_women_only').notNull().default(true),
    acceptsJuniors: boolean('accepts_juniors').notNull().default(true),
    isAcceptingBookings: boolean('is_accepting_bookings').notNull().default(true),
    isVerifiedByFeera: boolean('is_verified_by_feera').notNull().default(false),
    averageRating: doublePrecision('average_rating'),
    ratingCount: integer('rating_count').notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (t) => [
    uniqueIndex('coaches_user_uq').on(t.userId),
    index('coaches_club_idx').on(t.primaryClubId),
  ],
);

/**
 * coaching_sessions - a booked lesson between a coach and 1..N learners.
 */
export const coachingSessions = pgTable(
  'coaching_sessions',
  {
    id: idColumn(),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id, { onDelete: 'restrict' }),
    learnerUserId: uuid('learner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
    courtId: uuid('court_id').references(() => courts.id, { onDelete: 'set null' }),
    additionalLearners: jsonb('additional_learners').notNull().default(sql`'[]'::jsonb`),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    totalAmount: doublePrecision('total_amount').notNull(),
    currency: text('currency').notNull(),
    status: coachingSessionStatusEnum('status').notNull().default('pending'),
    paymentId: uuid('payment_id'),
    notes: text('notes'),
    learnerRating: integer('learner_rating'),
    learnerReview: text('learner_review'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('coaching_sessions_coach_start_idx').on(t.coachId, t.startAt),
    index('coaching_sessions_learner_idx').on(t.learnerUserId, t.startAt),
  ],
);
