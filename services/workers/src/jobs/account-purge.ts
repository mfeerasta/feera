import { and, eq, isNotNull, isNull, lt, sql as drizzleSql } from 'drizzle-orm';
import {
  chatMembers,
  userDeletionRequests,
  users,
} from '@feera/db/schema';
import { db } from '../lib/db.js';
import type { Job, JobContext, JobResult } from '../types.js';

/**
 * Minimal DB surface this job depends on, so the unit test can pass a fake.
 */
export interface DeletionRequestRow {
  id: string;
  userId: string;
  willDeleteAt: Date;
}

export interface AccountPurgeDb {
  selectDue(now: Date): Promise<DeletionRequestRow[]>;
  purgeUser(req: DeletionRequestRow, now: Date): Promise<void>;
}

const TOMBSTONE_NAME = '[deleted account]';

/**
 * Concrete drizzle-backed implementation. Wrapped in a SERIALIZABLE tx per
 * request so concurrent runs do not double-purge.
 */
function liveDb(): AccountPurgeDb {
  return {
    async selectDue(now) {
      const rows = await db
        .select({
          id: userDeletionRequests.id,
          userId: userDeletionRequests.userId,
          willDeleteAt: userDeletionRequests.willDeleteAt,
        })
        .from(userDeletionRequests)
        .where(
          and(
            isNotNull(userDeletionRequests.confirmedAt),
            isNull(userDeletionRequests.purgedAt),
            lt(userDeletionRequests.willDeleteAt, now),
          ),
        )
        .limit(500);
      return rows;
    },
    async purgeUser(req, now) {
      await db.transaction(
        async (tx) => {
          // Anonymise the user row but keep the PK so bookings/matches still
          // resolve (foreign keys are restrict / set null per schema).
          await tx
            .update(users)
            .set({
              displayName: TOMBSTONE_NAME,
              email: null,
              phone: null,
              city: null,
              bio: null,
              profilePhotoUrl: null,
              gender: null,
              deletedAt: now,
            })
            .where(eq(users.id, req.userId));

          // Drop the user out of all chats so they stop receiving messages.
          await tx
            .update(chatMembers)
            .set({ leftAt: now })
            .where(eq(chatMembers.userId, req.userId));

          await tx
            .update(userDeletionRequests)
            .set({ purgedAt: now })
            .where(eq(userDeletionRequests.id, req.id));
        },
        { isolationLevel: 'serializable' },
      );
    },
  };
}

/**
 * Pure function the test exercises with a fake AccountPurgeDb. Returns a
 * count of purged users plus any errors.
 */
export async function runPurge(
  handle: AccountPurgeDb,
  ctx: JobContext,
  now: Date = new Date(),
): Promise<{ purged: number; failed: number }> {
  const due = await handle.selectDue(now);
  ctx.log.info('account-purge: due requests', { count: due.length });
  let purged = 0;
  let failed = 0;
  for (const req of due) {
    if (ctx.dryRun) {
      ctx.log.info('account-purge: would purge', { userId: req.userId, willDeleteAt: req.willDeleteAt });
      continue;
    }
    try {
      await handle.purgeUser(req, now);
      purged += 1;
    } catch (err) {
      failed += 1;
      ctx.log.error('account-purge failed', err, { userId: req.userId });
    }
  }
  return { purged, failed };
}

export const accountPurge: Job = {
  name: 'account-purge',
  // Nightly at 03:00 Europe/Berlin, respects the 7 day GDPR grace window.
  schedule: '0 3 * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    try {
      const { purged, failed } = await runPurge(liveDb(), ctx);
      // Touch drizzleSql so the import is exercised at type level for future
      // expansions (selective deletes against payments, audit_log, etc.).
      void drizzleSql;
      return {
        status: failed === 0 ? 'success' : 'partial',
        metrics: { purged, failed },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      ctx.log.error('account-purge crashed', err);
      return {
        status: 'failed',
        metrics: { purged: 0, failed: 0 },
        durationMs: Date.now() - start,
      };
    }
  },
};
