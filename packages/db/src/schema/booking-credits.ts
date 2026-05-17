import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { users } from './users';
import { bookings } from './bookings';

/**
 * booking_credits - ledger of platform credit owed to a player when a
 * booking they had a confirmed seat on is cancelled by the organizer (or
 * goodwill credits issued by support).
 *
 * Credits are denominated in the booking's currency (minor units, integer).
 * Applied at the next booking's checkout up to the unconsumed amount.
 *
 *   amount_minor          - granted amount
 *   consumed_amount_minor - how much has already been spent
 *   expires_at            - optional sunset; NULL means never expires
 */

export const bookingCreditSourceEnum = pgEnum('booking_credit_source', [
  'cancellation',
  'goodwill',
  'refund',
]);

export const bookingCredits = pgTable(
  'booking_credits',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    source: bookingCreditSourceEnum('source').notNull(),
    sourceBookingId: uuid('source_booking_id').references(() => bookings.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    consumedAmountMinor: integer('consumed_amount_minor').notNull().default(0),
    note: text('note'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('booking_credits_user_currency_idx').on(t.userId, t.currency),
    index('booking_credits_user_open_idx').on(t.userId, t.expiresAt),
  ],
);

export type BookingCredit = typeof bookingCredits.$inferSelect;
export type NewBookingCredit = typeof bookingCredits.$inferInsert;
