import {
  boolean,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clubs } from './clubs';
import { createdAtColumn, idColumn, updatedAtColumn } from './common';
import { users } from './users';

/**
 * club_member_notes - club operator-facing notes about players who book or
 * play at the club. Powers the members CRM: VIP flagging, ban-list, free
 * text notes (allergies, parking quirks, preferred court, payment quirks).
 *
 * Unique on (clubId, userId) so the CRM row is a single editable record.
 *
 * RLS: club_staff of the same club + platform admins read+write. Players
 * never read their own row (these are internal notes).
 */
export const clubMemberNotes = pgTable(
  'club_member_notes',
  {
    id: idColumn(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isVip: boolean('is_vip').notNull().default(false),
    isBanned: boolean('is_banned').notNull().default(false),
    notes: text('notes'),
    lastUpdatedByUserId: uuid('last_updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('club_member_notes_club_user_uq').on(t.clubId, t.userId),
    index('club_member_notes_club_flags_idx').on(t.clubId, t.isVip, t.isBanned),
  ],
);
