import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { courts } from './clubs';
import { createdAtColumn, idColumn } from './common';
import { users } from './users';

/**
 * court_closures - explicit non-bookable windows on a court. Used for
 * maintenance, private events, lockdown for tournaments, weather closures,
 * etc. Booking conflict checks must reject any overlap with these rows.
 *
 * RLS: club_staff of the court's club + platform admins read+write. Other
 * authenticated users read for transparency on the calendar; nobody else.
 */
export const courtClosures = pgTable(
  'court_closures',
  {
    id: idColumn(),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id, { onDelete: 'cascade' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    reason: text('reason'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('court_closures_court_start_idx').on(t.courtId, t.startAt),
    index('court_closures_court_window_idx').on(t.courtId, t.startAt, t.endAt),
  ],
);
