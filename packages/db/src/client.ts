import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

/**
 * Lazy client. Build-time page-data collection imports schema constants from
 * `@feera/db` and must not require DATABASE_URL. Connection opens on first runtime query.
 */

type Sql = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

let _sql: Sql | null = null;
let _db: Db | null = null;

function open(): { sql: Sql; db: Db } {
  if (_sql && _db) return { sql: _sql, db: _db };
  const dbUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL[_POOLED] is required at runtime.');
  const isPooled = Boolean(process.env.DATABASE_URL_POOLED);
  _sql = postgres(dbUrl, {
    prepare: !isPooled,
    max: isPooled ? 1 : 10,
    idle_timeout: 20,
    ssl: 'require',
  });
  _db = drizzle(_sql, { schema });
  return { sql: _sql, db: _db };
}

export const sql: Sql = new Proxy({} as Sql, {
  get: (_t, prop) => Reflect.get(open().sql, prop),
});

export const db: Db = new Proxy({} as Db, {
  get: (_t, prop) => Reflect.get(open().db, prop),
});
