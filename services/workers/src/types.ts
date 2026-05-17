import type { Logger } from './lib/log.js';

export type JobStatus = 'success' | 'partial' | 'failed';

export type JobResult = {
  status: JobStatus;
  metrics: Record<string, number>;
  durationMs: number;
  notes?: string;
};

export type JobContext = {
  runId: string;
  log: Logger;
  /** When true, jobs that mutate persistent state should log intent only. Default true in Phase 1. */
  dryRun: boolean;
  /** CLI args after the job name, parsed loosely. */
  argv: readonly string[];
};

export interface Job {
  readonly name: string;
  /** Cron expression, croner-compatible (5 or 6 field). */
  readonly schedule: string;
  run(ctx: JobContext): Promise<JobResult>;
}
