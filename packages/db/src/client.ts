import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const dbUrl = process.env.SUPABASE_DB_URL_POOLED ?? process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  throw new Error('SUPABASE_DB_URL[_POOLED] is required.');
}

// PgBouncer-friendly: disable prepared statements when using the pooled URL.
const isPooled = Boolean(process.env.SUPABASE_DB_URL_POOLED);

export const sql = postgres(dbUrl, {
  prepare: !isPooled,
  max: isPooled ? 1 : 10,
  idle_timeout: 20,
});

export const db = drizzle(sql, { schema });
