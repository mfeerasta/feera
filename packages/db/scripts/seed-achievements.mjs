#!/usr/bin/env node
/**
 * Seed the achievements catalogue. Idempotent via ON CONFLICT.
 *
 * Award detection happens in services/workers/src/jobs/award-achievements
 * on a cron tick. This script only populates the catalogue rows.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/seed-achievements.mjs
 */

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1 });

const ACHIEVEMENTS = [
  { id: 'first_match',           category: 'progress',     icon: '🎾', points: 10 },
  { id: 'wins_10',               category: 'milestones',   icon: '✦',  points: 25 },
  { id: 'wins_50',               category: 'milestones',   icon: '✦',  points: 75 },
  { id: 'streak_5',              category: 'streaks',      icon: '⚡', points: 30 },
  { id: 'streak_10',             category: 'streaks',      icon: '⚡', points: 80 },
  { id: 'century',               category: 'milestones',   icon: '◯',  points: 150 },
  { id: 'founder_member',        category: 'progress',     icon: '◆',  points: 20 },
  { id: 'social_butterfly',      category: 'social',       icon: '◐',  points: 25 },
  { id: 'mixer',                 category: 'social',       icon: '◑',  points: 30 },
  { id: 'tournament_finalist',   category: 'tournaments',  icon: '▲',  points: 75 },
  { id: 'tournament_champion',   category: 'tournaments',  icon: '★',  points: 200 },
  { id: 'early_bird',            category: 'streaks',      icon: '☀',  points: 25 },
];

async function main() {
  console.log('==> seeding achievements catalogue');
  let inserted = 0;
  for (const a of ACHIEVEMENTS) {
    const res = await sql`
      insert into achievements (id, name_key, description_key, icon, category, points)
      values (
        ${a.id},
        ${'achievements.' + a.id + '.name'},
        ${'achievements.' + a.id + '.description'},
        ${a.icon},
        ${a.category},
        ${a.points}
      )
      on conflict (id) do update set
        icon = excluded.icon,
        category = excluded.category,
        points = excluded.points
      returning id
    `;
    if (res.length > 0) inserted += 1;
  }
  console.log(`==> ${inserted} achievement rows upserted`);

  const total = await sql`select count(*)::int n from achievements`;
  console.log(`==> catalogue size: ${total[0].n}`);

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
