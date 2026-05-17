import type { Job, JobContext, JobResult } from '../types.js';

export const notificationFanout: Job = {
  name: 'notification-fanout',
  // Every minute. Outbox is checked frequently so latency stays sub-2-min.
  schedule: '* * * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    const log = ctx.log.child({ job: 'notification-fanout', runId: ctx.runId });

    try {
      // M2: the `notifications_outbox` table is not yet provisioned (M6 deliverable).
      // Do not error; just log and sleep. The scheduler will retry on the next tick.
      log.info('notifications_outbox table not yet provisioned, sleeping');
      return {
        status: 'success',
        metrics: { drained: 0, failed: 0 },
        durationMs: Date.now() - start,
        notes: 'outbox table provisioned in M6',
      };
    } catch (err) {
      log.error('fanout failed', err);
      return { status: 'failed', metrics: {}, durationMs: Date.now() - start };
    }
  },
};
