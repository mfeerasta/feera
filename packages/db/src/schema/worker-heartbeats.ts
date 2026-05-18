import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtColumn, idColumn } from './common';

/**
 * Worker heartbeats. Inserted after every cron tick in services/workers so
 * the admin Observability dashboard can answer "is the scheduler alive?" and
 * "when did each job last run?" without scraping log files.
 *
 * RLS is service-only: only the workers DB role and platform admins may
 * read or write. Policy lives in packages/db/src/rls (M8 follow-up).
 */
export const workerHeartbeats = pgTable(
  'worker_heartbeats',
  {
    id: idColumn(),
    jobName: text('job_name').notNull(),
    tickedAt: timestamp('ticked_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    durationMs: integer('duration_ms').notNull().default(0),
    status: text('status').notNull().default('success'),
    metrics: jsonb('metrics').notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index('worker_heartbeats_job_idx').on(t.jobName, t.tickedAt),
    index('worker_heartbeats_ticked_idx').on(t.tickedAt),
  ],
);
