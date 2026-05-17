#!/usr/bin/env node
// daily-briefing.mjs
// Cron: 0 3 * * * (03:00 UTC).
// Queries Neon for the last 24h of activity and posts a Telegram digest.
//
// Env: DATABASE_URL_POOLED (required), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// DRY_RUN=1 prints the digest to stdout instead of posting.

import { getSql, closeAll } from '../lib/neon.mjs';
import { sendTelegram } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('daily-briefing');

const QUERIES = [
  {
    key: 'newUsers',
    label: 'New users',
    sql: (sql) => sql`
      SELECT count(*)::int AS c FROM users
      WHERE created_at > now() - interval '1 day'
    `,
  },
  {
    key: 'newBookings',
    label: 'New bookings',
    sql: (sql) => sql`
      SELECT count(*)::int AS c FROM bookings
      WHERE created_at > now() - interval '1 day'
    `,
  },
  {
    key: 'matchesPlayed',
    label: 'Matches played',
    sql: (sql) => sql`
      SELECT count(*)::int AS c FROM matches
      WHERE played_at > now() - interval '1 day'
    `,
  },
  {
    key: 'revenuePkr',
    label: 'Revenue (PKR settled, 24h)',
    sql: (sql) => sql`
      SELECT coalesce(sum(amount), 0)::float AS c FROM payments
      WHERE status = 'succeeded'
        AND currency = 'PKR'
        AND created_at > now() - interval '1 day'
    `,
  },
  {
    key: 'editionApps',
    label: 'New Edition applications',
    sql: (sql) => sql`
      SELECT count(*)::int AS c FROM edition_memberships
      WHERE status = 'applicant'
        AND applied_at > now() - interval '1 day'
    `,
  },
];

async function run() {
  const sql = getSql();
  const results = {};
  for (const q of QUERIES) {
    try {
      const rows = await q.sql(sql);
      results[q.key] = { label: q.label, value: rows[0]?.c ?? 0 };
    } catch (err) {
      log.warn('query failed', { key: q.key, msg: err.message });
      results[q.key] = { label: q.label, value: 'n/a', error: err.message };
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const lines = [`*Feera daily briefing ${date}*`, ''];
  for (const r of Object.values(results)) {
    lines.push(`• ${r.label}: *${r.value}*${r.error ? ' (error)' : ''}`);
  }
  const text = lines.join('\n');

  const tg = await sendTelegram(text);
  log.info('briefing built', { results, telegram: tg });
}

run()
  .catch((err) => {
    log.error('briefing failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeAll();
  });
