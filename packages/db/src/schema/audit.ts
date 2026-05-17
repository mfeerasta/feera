import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  auditActorTypeEnum,
  createdAtColumn,
  idColumn,
} from './common';

/**
 * audit_log - append-only record of every privileged or money-touching action. Service role only.
 * Retention: 7 years for any row touching payments, payouts, edition_memberships, federation links.
 * 2 years for the rest. Enforced by a monthly cron in services/workers (M3+).
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: idColumn(),
    actorType: auditActorTypeEnum('actor_type').notNull(),
    actorUserId: uuid('actor_user_id'),
    actorLabel: text('actor_label'),
    action: text('action').notNull(),
    targetTable: text('target_table').notNull(),
    targetId: uuid('target_id'),
    diff: jsonb('diff'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('audit_log_actor_idx').on(t.actorUserId, t.createdAt),
    index('audit_log_target_idx').on(t.targetTable, t.targetId),
    index('audit_log_action_idx').on(t.action, t.createdAt),
  ],
);
