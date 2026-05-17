import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  chatMessageKindEnum,
  chatTypeEnum,
  createdAtColumn,
  deletedAtColumn,
  idColumn,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * chats - conversation container. May be linked to a booking, tournament, coaching session, etc.
 */
export const chats = pgTable(
  'chats',
  {
    id: idColumn(),
    type: chatTypeEnum('type').notNull(),
    title: text('title'),
    contextTable: text('context_table'),
    contextId: uuid('context_id'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (t) => [
    index('chats_context_idx').on(t.contextTable, t.contextId),
    index('chats_last_message_idx').on(t.lastMessageAt),
  ],
);

/**
 * chat_members - membership and per-user state (mute, last read).
 */
export const chatMembers = pgTable(
  'chat_members',
  {
    id: idColumn(),
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    joinedAt: createdAtColumn(),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    isMuted: boolean('is_muted').notNull().default(false),
    leftAt: timestamp('left_at', { withTimezone: true }),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('chat_members_chat_user_uq').on(t.chatId, t.userId),
    index('chat_members_user_idx').on(t.userId),
  ],
);

/**
 * chat_messages - individual messages. body for text, attachments jsonb for media metadata.
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: idColumn(),
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderUserId: uuid('sender_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    kind: chatMessageKindEnum('kind').notNull().default('text'),
    body: text('body'),
    attachments: jsonb('attachments').notNull().default(sql`'[]'::jsonb`),
    replyToMessageId: uuid('reply_to_message_id'),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: deletedAtColumn(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('chat_messages_chat_created_idx').on(t.chatId, t.createdAt),
  ],
);
