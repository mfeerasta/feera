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
} from 'drizzle-orm/pg-core';
import {
  createdAtColumn,
  deletedAtColumn,
  editionStatusEnum,
  genderVisibilityEnum,
  idColumn,
  localeEnum,
  updatedAtColumn,
} from './common.js';

/**
 * users — primary identity. Phone is E.164. Soft-deleted via deleted_at.
 */
export const users = pgTable(
  'users',
  {
    id: idColumn(),
    phone: text('phone').unique(),
    email: text('email').unique(),
    displayName: text('display_name').notNull(),
    locale: localeEnum('locale').notNull().default('en'),
    countryCode: text('country_code').notNull(),
    city: text('city'),
    gender: text('gender'),
    genderVisibility: genderVisibilityEnum('gender_visibility').notNull().default('private'),
    dateOfBirth: timestamp('date_of_birth', { mode: 'date', withTimezone: false }),
    profilePhotoUrl: text('profile_photo_url'),
    bio: text('bio'),
    isVerifiedCoach: boolean('is_verified_coach').notNull().default(false),
    federationPlayerIds: jsonb('federation_player_ids').notNull().default(sql`'{}'::jsonb`),
    preferredPaymentMethod: text('preferred_payment_method'),
    editionMemberStatus: editionStatusEnum('edition_member_status').notNull().default('none'),
    editionMemberSince: timestamp('edition_member_since', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (t) => ({
    phoneUq: uniqueIndex('users_phone_uq').on(t.phone),
    emailUq: uniqueIndex('users_email_uq').on(t.email),
    countryCityIdx: index('users_country_city_idx').on(t.countryCode, t.city),
  }),
);

/**
 * user_ratings — Glicko-2 state per player. Computed by `@feera/matching`.
 */
export const userRatings = pgTable(
  'user_ratings',
  {
    userId: idColumn().references(() => users.id, { onDelete: 'cascade' }),
    ratingInternal: doublePrecision('rating_internal').notNull().default(1500),
    ratingDisplay: doublePrecision('rating_display').notNull().default(3.5),
    ratingDeviation: doublePrecision('rating_deviation').notNull().default(350),
    volatility: doublePrecision('volatility').notNull().default(0.06),
    reliabilityPct: integer('reliability_pct').notNull().default(0),
    matchCount: integer('match_count').notNull().default(0),
    lastMatchAt: timestamp('last_match_at', { withTimezone: true }),
    womenOnlyPoolRating: doublePrecision('women_only_pool_rating'),
    isProvisional: boolean('is_provisional').notNull().default(true),
    isFlaggedSandbag: boolean('is_flagged_sandbag').notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => ({
    discoveryIdx: index('user_ratings_discovery_idx').on(t.ratingDisplay, t.isProvisional),
  }),
);

/**
 * user_social_scores — derived reliability and sportsmanship metrics.
 */
export const userSocialScores = pgTable('user_social_scores', {
  userId: idColumn().references(() => users.id, { onDelete: 'cascade' }),
  onTimeRate: doublePrecision('on_time_rate').notNull().default(1.0),
  noShowRate: doublePrecision('no_show_rate').notNull().default(0.0),
  sportsmanshipAvg: doublePrecision('sportsmanship_avg'),
  responseTimeMinutesAvg: integer('response_time_minutes_avg'),
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});
