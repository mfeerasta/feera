import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  bookingParticipantStatusEnum,
  bookingPaymentStatusEnum,
  bookingStatusEnum,
  createdAtColumn,
  genderPreferenceEnum,
  idColumn,
  updatedAtColumn,
} from './common';
import { courts } from './clubs';
import { users } from './users';

export const bookings = pgTable(
  'bookings',
  {
    id: idColumn(),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id, { onDelete: 'restrict' }),
    organizerUserId: uuid('organizer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    totalAmount: doublePrecision('total_amount').notNull(),
    currency: text('currency').notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    isOpenMatch: boolean('is_open_match').notNull().default(false),
    requiredLevelMin: doublePrecision('required_level_min'),
    requiredLevelMax: doublePrecision('required_level_max'),
    genderPreference: genderPreferenceEnum('gender_preference').notNull().default('open'),
    maxParticipants: integer('max_participants').notNull().default(4),
    isEditionPriority: boolean('is_edition_priority').notNull().default(false),
    notes: text('notes'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    index('bookings_court_start_idx').on(t.courtId, t.startAt),
    index('bookings_organizer_start_idx').on(t.organizerUserId, t.startAt),
  ],
);

export const bookingParticipants = pgTable('booking_participants', {
  id: idColumn(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: bookingParticipantStatusEnum('status').notNull().default('invited'),
  paidAmount: doublePrecision('paid_amount'),
  paymentStatus: bookingPaymentStatusEnum('payment_status').notNull().default('pending'),
  paidToOrganizerAt: timestamp('paid_to_organizer_at', { withTimezone: true }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});
