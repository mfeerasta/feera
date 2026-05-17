import type { Config } from 'drizzle-kit';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // drizzle-kit only needs this at command time, not at import time.
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL not set. drizzle-kit commands will fail until you set it.');
}

export default {
  schema: ['./src/schema/index.ts', '../auth/src/schema/auth-tables.ts'],
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl ?? 'postgres://placeholder',
  },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
} satisfies Config;
