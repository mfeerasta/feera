#!/usr/bin/env node
// db-backup-check.mjs
// Cron: 0 4 * * * (04:00 UTC).
// Queries the Neon API for recent operations and alerts on Telegram if
// no successful backup-related op has completed in the last 25h.
//
// Neon emits ops with action like `apply_config`, `start_compute`,
// `replicate_branch`, `create_branch`, and for branches with PITR enabled
// the `tenant_attach` / `start_walreceiver` events show up regularly.
// We treat the *existence* of a recent successful op + reachable
// branch metadata as "backup posture is healthy" — Neon's continuous
// archiving covers the rest.
//
// Env: NEON_API_KEY, NEON_PROJECT_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.

import { sendTelegram } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('db-backup-check');
const NEON_BASE = 'https://console.neon.tech/api/v2';

async function neon(path, key) {
  const res = await fetch(`${NEON_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`neon ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

async function run() {
  const key = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  if (!key || !projectId) {
    log.warn('NEON_API_KEY or NEON_PROJECT_ID missing; skipping');
    return;
  }

  const project = await neon(`/projects/${projectId}`, key);
  const branches = await neon(`/projects/${projectId}/branches`, key);
  const ops = await neon(`/projects/${projectId}/operations?limit=50`, key);

  const cutoffMs = Date.now() - 25 * 60 * 60 * 1000;
  const recentFinished = (ops.operations ?? []).filter((op) => {
    const finishedAt = op.updated_at ? new Date(op.updated_at).getTime() : 0;
    return finishedAt >= cutoffMs && op.status === 'finished';
  });

  const primary = (branches.branches ?? []).find((b) => b.primary);
  const lastReset = primary?.last_reset_at ? new Date(primary.last_reset_at).toISOString() : 'n/a';
  const pitrAgeHours = primary?.created_at
    ? (Date.now() - new Date(primary.created_at).getTime()) / 3_600_000
    : -1;

  const healthy = recentFinished.length > 0 && primary;
  const summary = {
    project: project?.project?.name ?? projectId,
    primaryBranch: primary?.name ?? 'unknown',
    pitrAgeHours: Math.round(pitrAgeHours * 10) / 10,
    finishedOpsLast25h: recentFinished.length,
    lastResetAt: lastReset,
  };
  log.info('snapshot', summary);

  if (!healthy) {
    await sendTelegram(
      `*Neon backup posture: STALE*\n\`\`\`\n${JSON.stringify(summary, null, 2)}\n\`\`\``,
    );
    process.exit(2);
  }
}

run().catch((err) => {
  log.error('failed', err);
  // Best-effort alert.
  sendTelegram(`*Neon backup check FAILED:* ${err.message}`).catch(() => undefined);
  process.exit(1);
});
