// Lazy Postgres client for Hermes skills. Uses the `postgres` npm package which
// the Feera monorepo already vendors. Pooled URL by default; pass {pooled:false}
// when you need session-scoped operations (LISTEN, advisory locks, etc).

import postgres from 'postgres';

let _pooled = null;
let _direct = null;

export function getSql({ pooled = true } = {}) {
  if (pooled && _pooled) return _pooled;
  if (!pooled && _direct) return _direct;
  const url = pooled
    ? process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL ?? process.env.DATABASE_URL_POOLED;
  if (!url) {
    throw new Error('DATABASE_URL[_POOLED] required for Neon access');
  }
  const sql = postgres(url, {
    max: pooled ? 5 : 1,
    idle_timeout: pooled ? 20 : 0,
    ssl: 'require',
    prepare: !pooled,
  });
  if (pooled) _pooled = sql;
  else _direct = sql;
  return sql;
}

export async function closeAll() {
  await Promise.all(
    [_pooled, _direct].filter(Boolean).map((sql) => sql.end({ timeout: 5 }).catch(() => undefined)),
  );
  _pooled = null;
  _direct = null;
}
