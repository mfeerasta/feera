import type { Job, JobContext, JobResult } from '../types.js';

export const paymentReconciliation: Job = {
  name: 'payment-reconciliation',
  // Every 30 minutes on the half-hour.
  schedule: '*/30 * * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    const log = ctx.log.child({ job: 'payment-reconciliation', runId: ctx.runId });

    try {
      // M2 skeleton: enumerate intent. Real adapter calls land in M3 alongside
      // the provider implementations in @feera/payments/providers/*.
      log.info('would scan payments.status = pending older than 1h');
      log.info('would route each by provider: stripe | jazzcash | easypaisa | raast');
      log.info('would call provider.getTransaction(providerPaymentId) and update status');
      const candidates = 0;
      return {
        status: 'success',
        metrics: { candidates, reconciled: 0, stillPending: 0, failed: 0 },
        durationMs: Date.now() - start,
        notes: 'skeleton; adapter wiring lands in M3',
      };
    } catch (err) {
      log.error('reconciliation failed', err);
      return { status: 'failed', metrics: {}, durationMs: Date.now() - start };
    }
  },
};
