import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { users } from './users';
import { matches } from './matches';

/**
 * match_disputes - audit child of matches.
 *
 * A player (or club staff / admin) flags a recorded match as incorrect. Each
 * dispute starts as 'open'. Admins triage from /admin/matches/disputes:
 *
 *   open      - awaiting triage
 *   reviewed  - inspected, no decision yet
 *   upheld    - dispute is valid; rating changes should be rolled back
 *   rejected  - dispute is not valid; match stays as recorded
 */

export const matchDisputeKindEnum = pgEnum('match_dispute_kind', [
  'wrong_score',
  'wrong_winner',
  'ineligible_player',
  'other',
]);

export const matchDisputeStatusEnum = pgEnum('match_dispute_status', [
  'open',
  'reviewed',
  'upheld',
  'rejected',
]);

export const matchDisputes = pgTable(
  'match_disputes',
  {
    id: idColumn(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    raisedByUserId: uuid('raised_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: matchDisputeKindEnum('kind').notNull(),
    note: text('note').notNull(),
    status: matchDisputeStatusEnum('status').notNull().default('open'),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNote: text('resolution_note'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('match_disputes_match_idx').on(t.matchId, t.status),
    index('match_disputes_status_created_idx').on(t.status, t.createdAt),
  ],
);

export type MatchDispute = typeof matchDisputes.$inferSelect;
export type NewMatchDispute = typeof matchDisputes.$inferInsert;
