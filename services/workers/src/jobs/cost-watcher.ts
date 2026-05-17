import { loadEnv } from '../lib/env.js';
import type { Job, JobContext, JobResult } from '../types.js';

export type ProviderCost = Readonly<{ provider: string; monthToDateUsd: number }>;

/** Stub helper: would call Hetzner Cloud invoices API. */
export async function fetchHetznerCost(_apiToken: string | undefined): Promise<ProviderCost> {
  return { provider: 'hetzner', monthToDateUsd: 0 };
}

/** Stub helper: would call Neon billing API. */
export async function fetchNeonCost(_apiKey: string | undefined): Promise<ProviderCost> {
  return { provider: 'neon', monthToDateUsd: 0 };
}

export const costWatcher: Job = {
  name: 'cost-watcher',
  // Daily at 06:00 Europe/Berlin.
  schedule: '0 6 * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    const log = ctx.log.child({ job: 'cost-watcher', runId: ctx.runId });
    const env = loadEnv();

    try {
      const [hetzner, neon] = await Promise.all([
        fetchHetznerCost(env.HETZNER_API_TOKEN),
        fetchNeonCost(env.NEON_API_KEY),
      ]);
      const total = hetzner.monthToDateUsd + neon.monthToDateUsd;
      const overBudget = total > env.BUDGET_USD_MONTHLY;
      log.info('cost snapshot', {
        hetznerUsd: hetzner.monthToDateUsd,
        neonUsd: neon.monthToDateUsd,
        totalUsd: total,
        budgetUsd: env.BUDGET_USD_MONTHLY,
        overBudget,
      });
      return {
        status: 'success',
        metrics: {
          hetznerUsd: hetzner.monthToDateUsd,
          neonUsd: neon.monthToDateUsd,
          totalUsd: total,
          overBudget: overBudget ? 1 : 0,
        },
        durationMs: Date.now() - start,
        notes: 'stub; live billing API calls land in M3',
      };
    } catch (err) {
      log.error('cost watcher failed', err);
      return { status: 'failed', metrics: {}, durationMs: Date.now() - start };
    }
  },
};
