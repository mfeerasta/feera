import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const total = await sql`select count(*)::int n from matches`;
const sample = await sql`select id, played_at, rating_changes from matches order by played_at desc limit 1`;
const top10 = await sql`
  select u.display_name, u.city, ur.rating_display, ur.match_count, ur.is_provisional
  from users u join user_ratings ur on ur.user_id = u.id
  where u.email like 'demo.%@feera.ai' and ur.match_count > 0
  order by ur.rating_display desc limit 10
`;
console.log('total matches in DB:', total[0].n);
console.log('latest match rating_changes keys:', Object.keys(sample[0]?.rating_changes ?? {}));
console.log('---top 10 demo players by rating---');
for (const r of top10) console.log(`  ${r.display_name.padEnd(22)} ${r.city.padEnd(12)} rating ${r.rating_display.toFixed(2)} (${r.match_count} matches${r.is_provisional ? ', provisional' : ''})`);
await sql.end();
