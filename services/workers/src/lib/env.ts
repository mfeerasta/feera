import { z } from 'zod';

/**
 * Worker process env. Validated once at startup. Missing required vars fail fast
 * so the Hetzner PM2 supervisor restarts and surfaces the misconfiguration.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_URL_POOLED: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  HETZNER_API_TOKEN: z.string().optional(),
  NEON_API_KEY: z.string().optional(),
  NEON_PROJECT_ID: z.string().optional(),
  BUDGET_USD_MONTHLY: z.coerce.number().positive().default(100),
});

export type WorkerEnv = z.infer<typeof schema>;

let cached: WorkerEnv | null = null;

export function loadEnv(): WorkerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid worker env: ${issues}`);
  }
  const env = parsed.data;
  // At least one DB URL must be set for jobs that touch Postgres. We allow both
  // to be absent in test mode so unit tests don't need a database.
  if (env.NODE_ENV !== 'test' && !env.DATABASE_URL && !env.DATABASE_URL_POOLED) {
    throw new Error('Invalid worker env: DATABASE_URL or DATABASE_URL_POOLED required');
  }
  cached = env;
  return env;
}
