#!/usr/bin/env node
/**
 * Destructive reset. Wipes the public schema, reapplies:
 *   1. drizzle baseline migration
 *   2. packages/auth/src/sql/auth-helpers.sql
 *   3. every RLS file under packages/db/src/rls/, in deterministic order
 *
 * Safe ONLY while the DB has no production data. Aborts if `users` row count > 0.
 *
 * Usage: DATABASE_URL=... node packages/db/scripts/reset-and-apply.mjs
 */

import postgres from 'postgres';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1 });

async function safety() {
  try {
    const r = await sql`select count(*)::int as n from users`;
    if (r[0].n > 0) {
      throw new Error(`refusing: users has ${r[0].n} rows`);
    }
  } catch (e) {
    if (!String(e.message).includes('does not exist')) throw e;
  }
}

async function wipe() {
  console.log('==> wiping public schema');
  await sql.unsafe(`drop schema if exists public cascade;`);
  await sql.unsafe(`drop schema if exists auth cascade;`);
  await sql.unsafe(`create schema public;`);
  await sql.unsafe(`grant all on schema public to public;`);
}

async function applyFile(path, label) {
  if (!existsSync(path)) {
    console.log(`-- skip ${label}: file missing ${path}`);
    return;
  }
  console.log(`==> applying ${label}`);
  const body = readFileSync(path, 'utf8');
  await sql.unsafe(body);
}

async function main() {
  await safety();
  await wipe();

  await applyFile(
    join(repoRoot, 'packages/db/migrations/0000_baseline.sql'),
    'baseline DDL',
  );
  await applyFile(
    join(repoRoot, 'packages/auth/src/sql/auth-helpers.sql'),
    'auth helpers',
  );

  const rlsDir = join(repoRoot, 'packages/db/src/rls');
  const rlsOrder = [
    'users.sql',
    'clubs.sql',
    'club-staff.sql',
    'bookings.sql',
    'matches.sql',
    'chats.sql',
    'payments.sql',
    'edition.sql',
    'audit.sql',
  ];
  for (const f of rlsOrder) {
    try {
      await applyFile(join(rlsDir, f), `RLS ${f}`);
    } catch (err) {
      console.error(`!! RLS ${f} failed: ${err.message}`);
      // Don't abort entire run for one policy (friendships forward-ref expected).
    }
  }

  // Light smoke
  const tables = await sql`
    select tablename from pg_tables where schemaname='public' order by tablename
  `;
  const rls = await sql`
    select tablename from pg_tables where schemaname='public' and rowsecurity = true order by tablename
  `;
  const funcs = await sql`
    select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='auth' order by proname
  `;
  console.log(`==> tables (${tables.length}):`, tables.map((t) => t.tablename).join(', '));
  console.log(`==> RLS enabled (${rls.length}):`, rls.map((t) => t.tablename).join(', '));
  console.log(`==> auth.* functions (${funcs.length}):`, funcs.map((f) => f.proname).join(', '));

  await sql.end();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
