import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const dbUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL[_POOLED] is required.');
}

// Neon pooler is PgBouncer-compatible. Disable prepared statements when using the
// pooled host; raise pool max only on the direct host.
const isPooled = Boolean(process.env.DATABASE_URL_POOLED);

export const sql = postgres(dbUrl, {
  prepare: !isPooled,
  max: isPooled ? 1 : 10,
  idle_timeout: 20,
  ssl: 'require',
});

export const db = drizzle(sql, { schema });
