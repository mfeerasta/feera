/**
 * Worker-facing DB handle. Re-exports the lazy client from `@feera/db` so we
 * inherit the standard connection pooling, schema typing, and SSL config.
 */
export { db, sql } from '@feera/db/client';
export * as schema from '@feera/db/schema';
