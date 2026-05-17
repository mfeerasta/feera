import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const rows = await sql`select slug, city, country_code, is_active, approval_status from clubs order by slug`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
