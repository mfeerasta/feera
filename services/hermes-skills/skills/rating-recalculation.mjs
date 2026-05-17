#!/usr/bin/env node
// rating-recalculation.mjs
// Cron: 0 2 * * * (02:00 UTC).
//
// Thin wrapper that shells out to the workers CLI (`feera-workers run
// rating-recalculation --apply`). The actual Glicko engine lives in
// services/workers/src/jobs/rating-recalculation.ts and packages/matching.
// Hermes invokes this skill so all scheduled background ops are visible in
// one orchestrator dashboard.
//
// Env: DATABASE_URL_POOLED, optionally SENTRY_DSN.
// DRY_RUN=1 passes through to the worker (omits --apply).

import { spawn } from 'node:child_process';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('rating-recalculation');

function findWorkerCli() {
  // On the box, the workers package is installed at /srv/feera/services/workers
  // with `pnpm build` already run. Allow override via FEERA_WORKERS_CLI.
  return process.env.FEERA_WORKERS_CLI
    ?? '/srv/feera/services/workers/dist/index.js';
}

async function run() {
  const cli = findWorkerCli();
  const args = ['run', 'rating-recalculation'];
  if (process.env.DRY_RUN !== '1') args.push('--apply');

  log.info('spawning worker', { cli, args });
  const child = spawn(process.execPath, [cli, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // The worker emits its own structured logs; we just relay them.
    },
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c ?? 1)));
  if (code !== 0) {
    log.error('worker exited non-zero', undefined, { code });
    process.exit(code);
  }
  log.info('done');
}

run().catch((err) => {
  log.error('failed', err);
  process.exit(1);
});
