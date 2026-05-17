import { Cron } from 'croner';
import { sentry } from '@feera/analytics/sentry';
import { log } from './lib/log.js';
import { backupCheck } from './jobs/backup-check.js';
import { costWatcher } from './jobs/cost-watcher.js';
import { notificationFanout } from './jobs/notification-fanout.js';
import { paymentReconciliation } from './jobs/payment-reconciliation.js';
import { ratingRecalculation } from './jobs/rating-recalculation.js';
import type { Job, JobContext } from './types.js';

export const allJobs: readonly Job[] = [
  ratingRecalculation,
  paymentReconciliation,
  notificationFanout,
  backupCheck,
  costWatcher,
];

function newRunId(jobName: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${jobName}-${ts}-${rand}`;
}

export async function runJobOnce(
  job: Job,
  opts: { dryRun?: boolean; argv?: readonly string[] } = {},
): Promise<void> {
  const runId = newRunId(job.name);
  const ctx: JobContext = {
    runId,
    log: log.child({ job: job.name, runId }),
    dryRun: opts.dryRun ?? true,
    argv: opts.argv ?? [],
  };
  ctx.log.info('job start');
  try {
    const result = await job.run(ctx);
    ctx.log.info('job done', {
      status: result.status,
      durationMs: result.durationMs,
      metrics: result.metrics,
      notes: result.notes,
    });
    if (result.status === 'failed') {
      sentry.captureMessage(`worker job failed: ${job.name}`, 'error');
    }
  } catch (err) {
    ctx.log.error('job threw', err);
    sentry.captureException(err, { job: job.name, runId });
  }
}

/**
 * In-process scheduler. Each job is registered as a croner Cron with overlap protection
 * (protect: true) so a long run does not pile up duplicate firings on the next tick.
 */
export function startScheduler(): readonly Cron[] {
  log.info('scheduler starting', { jobs: allJobs.map((j) => j.name) });
  const handles = allJobs.map((job) =>
    new Cron(
      job.schedule,
      { name: job.name, protect: true, timezone: 'Europe/Berlin' },
      () => {
        void runJobOnce(job, { dryRun: true });
      },
    ),
  );

  const shutdown = (sig: NodeJS.Signals): void => {
    log.info('scheduler stopping', { sig });
    for (const h of handles) h.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return handles;
}
