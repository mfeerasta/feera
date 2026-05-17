import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const rows = await sql`
  select co.id, co.name, c.slug as club_slug
  from courts co
  join clubs c on c.id = co.club_id
  where c.slug = 'lahore-padel-club'
  limit 4
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
