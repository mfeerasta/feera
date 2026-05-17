#!/usr/bin/env node
import { sentry } from '@feera/analytics/sentry';
import { loadEnv } from './lib/env.js';
import { log } from './lib/log.js';
import { allJobs, runJobOnce, startScheduler } from './scheduler.js';

function printHelp(): void {
  process.stdout.write(
    [
      'feera-workers',
      '',
      'Usage:',
      '  feera-workers scheduler                Start the in-process cron scheduler (default).',
      '  feera-workers run <job> [--apply]      Execute a single job once and exit.',
      '  feera-workers list                     List registered jobs and their schedules.',
      '',
      `Jobs: ${allJobs.map((j) => j.name).join(', ')}`,
      '',
    ].join('\n'),
  );
}

async function main(argv: readonly string[]): Promise<number> {
  const env = loadEnv();
  sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });

  const [cmd = 'scheduler', ...rest] = argv;

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    return 0;
  }

  if (cmd === 'list') {
    for (const j of allJobs) {
      process.stdout.write(`${j.name}\t${j.schedule}\n`);
    }
    return 0;
  }

  if (cmd === 'scheduler') {
    startScheduler();
    log.info('scheduler running, awaiting cron ticks');
    // Hold the process open. Cron handles keep the event loop alive but we add an
    // explicit interval as a belt-and-braces guard against being optimised out.
    setInterval(() => {}, 1 << 30);
    return 0;
  }

  if (cmd === 'run') {
    const [jobName, ...jobArgs] = rest;
    if (!jobName) {
      log.error('run requires a job name');
      printHelp();
      return 2;
    }
    const job = allJobs.find((j) => j.name === jobName);
    if (!job) {
      log.error('unknown job', undefined, { jobName, available: allJobs.map((j) => j.name) });
      return 2;
    }
    const apply = jobArgs.includes('--apply');
    await runJobOnce(job, { dryRun: !apply, argv: jobArgs });
    return 0;
  }

  log.error('unknown command', undefined, { cmd });
  printHelp();
  return 2;
}

main(process.argv.slice(2))
  .then((code) => {
    if (code !== 0) process.exit(code);
  })
  .catch((err) => {
    log.error('fatal', err);
    process.exit(1);
  });
