import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clubs } from './clubs';
import {
  clubStaffRoleEnum,
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * club_staff - join table granting a user a role at a club. RLS uses this to authorize
 * staff-only mutations on bookings, court pricing, payouts, etc.
 */
export const clubStaff = pgTable(
  'club_staff',
  {
    id: idColumn(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: clubStaffRoleEnum('role').notNull().default('staff'),
    permissions: jsonb('permissions').notNull().default(sql`'{}'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('club_staff_club_user_uq').on(t.clubId, t.userId),
    index('club_staff_user_idx').on(t.userId),
    index('club_staff_club_role_idx').on(t.clubId, t.role),
  ],
);
