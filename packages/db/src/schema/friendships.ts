import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { users } from './users';

/**
 * Friendship + block graph.
 *
 * Direction:
 *   requester_user_id -> addressee_user_id
 *
 * Status lifecycle:
 *   pending  -> accepted | declined | blocked
 *   accepted -> blocked  (either side may block, see notes)
 *
 * Block semantics: when status='blocked', addressee can no longer see / match with requester.
 * We store one row per (requester, addressee) pair. To represent a mutual friendship there is
 * a single row with status='accepted'. RLS hides rows from non-participants.
 */

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'declined',
  'blocked',
]);

export const friendships = pgTable(
  'friendships',
  {
    id: idColumn(),
    requesterUserId: uuid('requester_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeUserId: uuid('addressee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    note: text('note'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('friendships_pair_uq').on(t.requesterUserId, t.addresseeUserId),
    index('friendships_addressee_status_idx').on(t.addresseeUserId, t.status),
    index('friendships_requester_status_idx').on(t.requesterUserId, t.status),
    check('friendships_no_self_ck', sql`requester_user_id <> addressee_user_id`),
  ],
);
