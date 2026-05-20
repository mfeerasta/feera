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
import { createdAtColumn, idColumn } from './common';
import { users } from './users';

/**
 * Achievement catalogue + per-user awards.
 *
 * Catalogue rows are seeded via `packages/db/scripts/seed-achievements.mjs`.
 * Awards are inserted by the `award-achievements` worker job on every cron
 * tick and are unique per (user_id, achievement_id) so reruns are idempotent.
 *
 * Mirror of migration 0018-achievements.sql.
 */

export const achievementCategoryEnum = pgEnum('achievement_category', [
  'progress',
  'milestones',
  'streaks',
  'social',
  'tournaments',
]);

export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(),
  nameKey: text('name_key').notNull(),
  descriptionKey: text('description_key').notNull(),
  icon: text('icon').notNull(),
  category: achievementCategoryEnum('category').notNull(),
  points: integer('points').notNull().default(10),
  createdAt: createdAtColumn(),
});

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    awardedAt: timestamp('awarded_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [
    uniqueIndex('user_achievements_uq').on(t.userId, t.achievementId),
    index('user_achievements_user_idx').on(t.userId, t.awardedAt),
  ],
);
