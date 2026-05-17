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
import { clubs } from './clubs';
import {
  createdAtColumn,
  deletedAtColumn,
  genderPreferenceEnum,
  idColumn,
  tournamentFormatEnum,
  tournamentMatchStatusEnum,
  tournamentRegistrationStatusEnum,
  tournamentStatusEnum,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * tournaments - top-level event. Can be club-hosted or platform-hosted.
 */
export const tournaments = pgTable(
  'tournaments',
  {
    id: idColumn(),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
    organizerUserId: uuid('organizer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    format: tournamentFormatEnum('format').notNull(),
    status: tournamentStatusEnum('status').notNull().default('draft'),
    countryCode: text('country_code').notNull(),
    city: text('city'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }),
    registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),
    maxTeams: integer('max_teams'),
    minLevel: doublePrecision('min_level'),
    maxLevel: doublePrecision('max_level'),
    genderPreference: genderPreferenceEnum('gender_preference').notNull().default('open'),
    entryFee: doublePrecision('entry_fee').notNull().default(0),
    currency: text('currency').notNull(),
    prizePool: jsonb('prize_pool').notNull().default(sql`'{}'::jsonb`),
    rulesUrl: text('rules_url'),
    isEditionOnly: boolean('is_edition_only').notNull().default(false),
    isRanked: boolean('is_ranked').notNull().default(true),
    pplpEnabled: boolean('pplp_enabled').notNull().default(false),
    bracket: jsonb('bracket'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (t) => [
    uniqueIndex('tournaments_slug_uq').on(t.slug),
    index('tournaments_status_start_idx').on(t.status, t.startAt),
    index('tournaments_country_city_idx').on(t.countryCode, t.city),
  ],
);

/**
 * tournament_registrations - team or solo signup. partnerUserId null if free agent or solo format.
 */
export const tournamentRegistrations = pgTable(
  'tournament_registrations',
  {
    id: idColumn(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    partnerUserId: uuid('partner_user_id').references(() => users.id, { onDelete: 'set null' }),
    teamName: text('team_name'),
    seed: integer('seed'),
    status: tournamentRegistrationStatusEnum('status').notNull().default('pending'),
    paymentId: uuid('payment_id'),
    registeredAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('tournament_registrations_unique_user').on(t.tournamentId, t.userId),
    index('tournament_registrations_status_idx').on(t.tournamentId, t.status),
  ],
);

/**
 * tournament_rounds - logical grouping of matches (Round of 16, Group A, etc.).
 */
export const tournamentRounds = pgTable(
  'tournament_rounds',
  {
    id: idColumn(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ordinal: integer('ordinal').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('tournament_rounds_unique_ordinal').on(t.tournamentId, t.ordinal),
  ],
);

/**
 * tournament_matches - scheduled or completed match within a tournament.
 * Links back to the matches table once played for rating ingestion.
 */
export const tournamentMatches = pgTable(
  'tournament_matches',
  {
    id: idColumn(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    roundId: uuid('round_id').references(() => tournamentRounds.id, { onDelete: 'set null' }),
    courtId: uuid('court_id'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    teamARegistrationId: uuid('team_a_registration_id').references(
      () => tournamentRegistrations.id,
      { onDelete: 'set null' },
    ),
    teamBRegistrationId: uuid('team_b_registration_id').references(
      () => tournamentRegistrations.id,
      { onDelete: 'set null' },
    ),
    teamASetsWon: integer('team_a_sets_won'),
    teamBSetsWon: integer('team_b_sets_won'),
    rawScore: jsonb('raw_score'),
    status: tournamentMatchStatusEnum('status').notNull().default('scheduled'),
    matchId: uuid('match_id'),
    nextMatchId: uuid('next_match_id'),
    bracketPosition: text('bracket_position'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('tournament_matches_tournament_status_idx').on(t.tournamentId, t.status),
    index('tournament_matches_scheduled_idx').on(t.scheduledAt),
  ],
);
