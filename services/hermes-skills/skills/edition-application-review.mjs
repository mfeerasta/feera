#!/usr/bin/env node
// edition-application-review.mjs
// Trigger: Postgres LISTEN on `edition_application_inserted` (see
// packages/db/src/sql/edition-realtime.sql). Hermes spawns this skill once
// per pg_notify payload; we can also be invoked as a long-running daemon
// when HERMES_LISTEN_MODE=daemon is set.
//
// Env: DATABASE_URL_POOLED (queries), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
//
// Payload (stdin OR --payload <json>):
//   { "id": "<uuid>", "user_id": "<uuid>", "status": "applicant", ... }

import { getSql, closeAll } from '../lib/neon.mjs';
import { sendTelegram, escapeMarkdown } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('edition-application-review');

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function loadApplication(sql, membershipId) {
  const rows = await sql`
    SELECT em.id,
           em.tier,
           em.applied_at,
           em.application_answers,
           u.display_name,
           u.country_code,
           u.city,
           u.created_at AS user_created_at
      FROM edition_memberships em
      JOIN users u ON u.id = em.user_id
     WHERE em.id = ${membershipId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

async function handleOne(payload) {
  const sql = getSql();
  const app = await loadApplication(sql, payload.id);
  if (!app) {
    log.warn('membership row not found', { id: payload.id });
    return;
  }
  const answers = app.application_answers ?? {};
  const summary = [
    `*New Edition application* (${escapeMarkdown(app.tier)})`,
    `Applicant: ${escapeMarkdown(app.display_name ?? 'unknown')}`,
    `Country/City: ${escapeMarkdown(app.country_code ?? '?')} / ${escapeMarkdown(app.city ?? '?')}`,
    `User since: ${app.user_created_at?.toISOString?.() ?? app.user_created_at}`,
    `Membership id: \`${app.id}\``,
    '',
    `*Answers:* \n\`\`\`\n${JSON.stringify(answers, null, 2).slice(0, 1800)}\n\`\`\``,
  ].join('\n');
  await sendTelegram(summary);
  log.info('digest sent', { id: app.id, tier: app.tier });
}

async function runDaemon() {
  const sql = getSql({ pooled: false });
  log.info('listening on edition_application_inserted');
  await sql.listen('edition_application_inserted', async (raw) => {
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      await handleOne(payload);
    } catch (err) {
      log.error('handler failed', err);
    }
  });
  // Keep the event loop alive.
  setInterval(() => {}, 1 << 30);
}

async function main() {
  if (process.env.HERMES_LISTEN_MODE === 'daemon') {
    await runDaemon();
    return;
  }
  const flagIdx = process.argv.indexOf('--payload');
  let raw = flagIdx >= 0 ? process.argv[flagIdx + 1] : null;
  if (!raw) raw = await readStdin();
  if (!raw) {
    log.error('no payload provided');
    process.exit(2);
  }
  const payload = JSON.parse(raw);
  await handleOne(payload);
}

main()
  .catch((err) => {
    log.error('failed', err);
    process.exit(1);
  })
  .finally(async () => {
    if (process.env.HERMES_LISTEN_MODE !== 'daemon') await closeAll();
  });
