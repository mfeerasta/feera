import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { bookings } from './bookings';
import { users } from './users';

/**
 * booking_join_requests — strangers requesting to fill an open seat on an
 * existing booking. The organizer (or club staff) reviews and approves or
 * declines.
 *
 * Status lifecycle:
 *   pending   -> approved | declined | cancelled | expired
 *   approved  -> (terminal; participant row created)
 *   declined  -> (terminal)
 *   cancelled -> (terminal; requester withdrew)
 *   expired   -> (terminal; booking start_at passed or court filled)
 */
export const bookingJoinStatusEnum = pgEnum('booking_join_status', [
  'pending',
  'approved',
  'declined',
  'cancelled',
  'expired',
]);

export const bookingJoinRequests = pgTable(
  'booking_join_requests',
  {
    id: idColumn(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    requesterUserId: uuid('requester_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    seatsRequested: integer('seats_requested').notNull().default(1),
    status: bookingJoinStatusEnum('status').notNull().default('pending'),
    message: text('message'),
    requesterRatingDisplay: doublePrecision('requester_rating_display'),
    respondedByUserId: uuid('responded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('booking_join_requests_booking_status_idx').on(t.bookingId, t.status),
    index('booking_join_requests_requester_status_idx').on(
      t.requesterUserId,
      t.status,
    ),
  ],
);
