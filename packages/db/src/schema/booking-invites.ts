import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { bookings } from './bookings';
import { users } from './users';

/**
 * booking_invites - private invitations from the organizer to specific friends
 * for a booking. Distinct from booking_join_requests (which strangers send to
 * fill open slots).
 *
 * Lifecycle:
 *   pending   -> accepted | declined | cancelled | expired
 *   accepted  -> (terminal; booking_participants row inserted)
 *   declined  -> (terminal; invitee passed)
 *   cancelled -> (terminal; invitee withdrew OR inviter rescinded)
 *   expired   -> (terminal; 72h timeout reached without response)
 *
 * Default 72h expiry from creation.
 */
export const bookingInviteStatusEnum = pgEnum('booking_invite_status', [
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'expired',
]);

export const bookingInvites = pgTable(
  'booking_invites',
  {
    id: idColumn(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    inviterUserId: uuid('inviter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inviteeUserId: uuid('invitee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: bookingInviteStatusEnum('status').notNull().default('pending'),
    message: text('message'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '72 hours'`),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('booking_invites_booking_status_idx').on(t.bookingId, t.status),
    index('booking_invites_invitee_status_idx').on(t.inviteeUserId, t.status),
    // Only one pending invite per (booking, invitee) at a time.
    uniqueIndex('booking_invites_pending_uq')
      .on(t.bookingId, t.inviteeUserId)
      .where(sql`status = 'pending'`),
  ],
);
