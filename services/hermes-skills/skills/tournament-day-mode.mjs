#!/usr/bin/env node
// tournament-day-mode.mjs
// Cron: */5 * * * * (every 5 minutes).
//
// Watches running tournaments for stalled matches: matches in status
// 'in_progress' (or 'scheduled' past their scheduled_at) with no score
// submitted in the last 30 minutes. Posts a per-stalled-match Telegram alert.
//
// Env: DATABASE_URL_POOLED, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.

import { getSql, closeAll } from '../lib/neon.mjs';
import { sendTelegram, escapeMarkdown } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('tournament-day-mode');

async function run() {
  const sql = getSql();

  const live = await sql`
    SELECT id, name, status
      FROM tournaments
     WHERE status = 'live'
       AND deleted_at IS NULL
  `;
  log.info('live tournaments', { count: live.length });
  if (live.length === 0) return;

  const tournamentIds = live.map((t) => t.id);
  const stalled = await sql`
    SELECT tm.id            AS tournament_match_id,
           tm.tournament_id,
           tm.status        AS match_status,
           tm.scheduled_at,
           tm.updated_at,
           t.name           AS tournament_name
      FROM tournament_matches tm
      JOIN tournaments t ON t.id = tm.tournament_id
     WHERE tm.tournament_id IN ${sql(tournamentIds)}
       AND tm.status IN ('in_progress', 'scheduled')
       AND coalesce(tm.updated_at, tm.scheduled_at) < now() - interval '30 minutes'
       AND (tm.scheduled_at IS NULL OR tm.scheduled_at < now())
     ORDER BY tm.updated_at ASC
     LIMIT 50
  `;
  log.info('stalled matches', { count: stalled.length });

  for (const m of stalled) {
    await sendTelegram(
      [
        `*Tournament stall:* ${escapeMarkdown(m.tournament_name)}`,
        `match: \`${m.tournament_match_id}\``,
        `status: ${escapeMarkdown(m.match_status)}`,
        `last updated: ${m.updated_at?.toISOString?.() ?? m.updated_at}`,
      ].join('\n'),
    );
  }
}

run()
  .catch((err) => {
    log.error('failed', err);
    process.exit(1);
  })
  .finally(closeAll);
