import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
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
 * Durable notifications outbox. Every app-side event that needs to notify
 * inserts a row here; the workers fan-out job (services/workers) drains it
 * by calling the @feera/notifications router. Survives app restarts, supports
 * retries with exponential backoff, and is idempotent via idempotency_key.
 */

export const notificationOutboxStateEnum = pgEnum('notification_outbox_state', [
  'queued',
  'sending',
  'delivered',
  'failed',
  'skipped',
]);

export const notificationOutboxTemplateEnum = pgEnum('notification_outbox_template', [
  'booking_confirmed',
  'booking_cancelled',
  'booking_join_requested',
  'booking_join_approved',
  'booking_join_declined',
  'match_invite',
  'match_score_submitted',
  'match_disputed',
  'tournament_update',
  'chat_message',
  'payment_succeeded',
  'otp_fallback',
  'edition_application_update',
  'coaching_session_reviewed',
  'coaching_verification_approved',
  'friend_request_received',
  'friend_request_accepted',
]);

export const notificationOutboxUrgencyEnum = pgEnum('notification_outbox_urgency', [
  'high',
  'medium',
  'low',
  'marketing',
]);

export const notificationsOutbox = pgTable(
  'notifications_outbox',
  {
    id: idColumn(),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    template: notificationOutboxTemplateEnum('template').notNull(),
    variables: jsonb('variables').notNull().default(sql`'{}'::jsonb`),
    urgency: notificationOutboxUrgencyEnum('urgency').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    state: notificationOutboxStateEnum('state').notNull().default('queued'),
    channelsAttempted: jsonb('channels_attempted').notNull().default(sql`'[]'::jsonb`),
    lastError: text('last_error'),
    retries: integer('retries').notNull().default(0),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('notifications_outbox_idem_uq').on(t.idempotencyKey),
    index('notifications_outbox_state_idx').on(t.state, t.scheduledFor),
    index('notifications_outbox_recipient_idx').on(t.recipientUserId),
  ],
);
