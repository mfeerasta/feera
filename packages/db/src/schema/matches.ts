import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { bookings } from './bookings.js';
import {
  createdAtColumn,
  idColumn,
  matchVerificationEnum,
  updatedAtColumn,
} from './common.js';
import { users } from './users.js';

export const matches = pgTable(
  'matches',
  {
    id: idColumn(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    teamAPlayer1: uuid('team_a_player_1')
      .notNull()
      .references(() => users.id),
    teamAPlayer2: uuid('team_a_player_2')
      .notNull()
      .references(() => users.id),
    teamBPlayer1: uuid('team_b_player_1')
      .notNull()
      .references(() => users.id),
    teamBPlayer2: uuid('team_b_player_2')
      .notNull()
      .references(() => users.id),
    teamASetsWon: integer('team_a_sets_won').notNull(),
    teamBSetsWon: integer('team_b_sets_won').notNull(),
    rawScore: jsonb('raw_score').notNull().default(sql`'[]'::jsonb`),
    isRanked: boolean('is_ranked').notNull().default(true),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    recordedByUserId: uuid('recorded_by_user_id')
      .notNull()
      .references(() => users.id),
    verificationStatus: matchVerificationEnum('verification_status')
      .notNull()
      .default('unverified'),
    /**
     * Per-player Glicko-2 deltas { userId: { ratingBefore, ratingAfter, rdBefore, rdAfter, ... } }
     * Used by the audit-log and the player's match history screen.
     */
    ratingChanges: jsonb('rating_changes'),
    tournamentMatchId: uuid('tournament_match_id'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => ({
    playedAtIdx: index('matches_played_at_idx').on(t.playedAt),
  }),
);
