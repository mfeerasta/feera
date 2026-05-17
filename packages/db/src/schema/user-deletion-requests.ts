import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { idColumn } from './common';
import { users } from './users';

/**
 * GDPR right-to-erasure log. See migration 0007 and the account-purge worker
 * job. Inserted on first POST to /api/v1/me/delete; confirmed via token;
 * actually purged by services/workers/jobs/account-purge.ts after the 7 day
 * grace window.
 */
export const userDeletionRequests = pgTable(
  'user_deletion_requests',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmationToken: text('confirmation_token').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    willDeleteAt: timestamp('will_delete_at', { withTimezone: true }).notNull(),
    purgedAt: timestamp('purged_at', { withTimezone: true }),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [
    uniqueIndex('user_deletion_requests_token_uq').on(t.confirmationToken),
    index('user_deletion_requests_user_idx').on(t.userId),
  ],
);
