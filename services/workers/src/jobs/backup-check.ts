import { loadEnv } from '../lib/env.js';
import type { Job, JobContext, JobResult } from '../types.js';

const STALE_HOURS = 25;

export const backupCheck: Job = {
  name: 'backup-check',
  // Nightly at 04:45 Europe/Berlin, after the rating job has settled.
  schedule: '45 4 * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    const log = ctx.log.child({ job: 'backup-check', runId: ctx.runId });
    const env = loadEnv();

    try {
      const projectId = env.NEON_PROJECT_ID ?? '<NEON_PROJECT_ID>';
      const url = `https://console.neon.tech/api/v2/projects/${projectId}/operations?action=branch_create_backup&limit=1`;
      log.info('would GET neon operations', {
        url,
        haveApiKey: Boolean(env.NEON_API_KEY),
        staleHoursThreshold: STALE_HOURS,
      });
      // M2 stub: no live HTTP call. The real check parses operations[0].finished_at
      // and alerts (Sentry captureMessage + Resend email) when older than STALE_HOURS.
      return {
        status: 'success',
        metrics: { lastBackupAgeHours: 0, stale: 0 },
        durationMs: Date.now() - start,
        notes: 'stub; live Neon API call lands in M3',
      };
    } catch (err) {
      log.error('backup check failed', err);
      return { status: 'failed', metrics: {}, durationMs: Date.now() - start };
    }
  },
};
