import {
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
 * Per-device push notification tokens. Used by apps/mobile to register the
 * Expo/FCM/APNs token so the notifications router can fan out push
 * messages alongside WhatsApp/email.
 *
 * A single user can register multiple devices. The (user_id, token) pair is
 * unique so re-registration from the same install is idempotent.
 */
export const pushPlatformEnum = pgEnum('push_platform', ['expo', 'ios', 'android', 'web']);

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: pushPlatformEnum('platform').notNull().default('expo'),
    deviceName: text('device_name'),
    appVersion: text('app_version'),
    locale: text('locale'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('push_tokens_user_token_uq').on(t.userId, t.token),
    index('push_tokens_user_idx').on(t.userId),
  ],
);
