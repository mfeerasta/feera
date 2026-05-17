#!/usr/bin/env node
/**
 * Apply incremental SQL files in numeric order to the Neon production DB.
 * Idempotent: each SQL file should DROP IF EXISTS / CREATE IF NOT EXISTS.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/apply-incremental.mjs <file> [<file>...]
 */
import postgres from 'postgres';
import { existsSync, readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node apply-incremental.mjs <sql-file> [...]');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', max: 1 });

for (const f of args) {
  if (!existsSync(f)) {
    console.warn(`-- skip missing ${f}`);
    continue;
  }
  console.log(`==> apply ${f}`);
  try {
    await sql.unsafe(readFileSync(f, 'utf8'));
  } catch (err) {
    console.error(`!! ${f} failed:`, err.message);
  }
}

const tables = await sql`select count(*)::int n from pg_tables where schemaname='public'`;
const rls = await sql`select count(*)::int n from pg_tables where schemaname='public' and rowsecurity=true`;
const triggers = await sql`select count(*)::int n from pg_trigger where not tgisinternal`;
console.log(`==> tables: ${tables[0].n}, RLS-enabled: ${rls[0].n}, triggers: ${triggers[0].n}`);
await sql.end();
