# @feera/workers

Background jobs for the Feera padel platform. Runs on the Hetzner Falkenstein box
(46.225.157.75) under PM2, alongside the Next.js web app.

## Jobs

| name                    | schedule (Europe/Berlin) | purpose                                                  |
| ----------------------- | ------------------------ | -------------------------------------------------------- |
| rating-recalculation    | 03:15 daily              | Recompute Glicko-2 ratings from full match history.      |
| payment-reconciliation  | every 30 min             | Poll providers for payments still pending after 1h.      |
| notification-fanout     | every minute             | Drain `notifications_outbox` (table lands M6).           |
| backup-check            | 04:45 daily              | Verify Neon PITR backup ran within the last 25h.         |
| cost-watcher            | 06:00 daily              | Sum Hetzner + Neon spend, alert past `BUDGET_USD_MONTHLY`. |

As of M4, `rating-recalculation` is **live**: it writes computed Glicko-2 state
into `user_ratings` by default. Pass `--dry-run` for safety drills (computes
deltas, logs, but skips writes). Other jobs remain dry-run pending their M5/M6
cutovers (payment-reconciliation, notification-fanout, etc.).

## Usage

```bash
# Build once, then:
pnpm -C services/workers build

# Start the cron scheduler (default).
node dist/index.js scheduler

# Fire a one-off run for ops. Writes are live unless --dry-run is passed.
node dist/index.js run rating-recalculation
node dist/index.js run rating-recalculation --dry-run   # safety drill, no writes

# List registered jobs.
node dist/index.js list
```

Hetzner ops:

```bash
ssh root@46.225.157.75 'pm2 exec feera-workers -- run rating-recalculation'
```

## Env

Validated with zod at startup (see `src/lib/env.ts`). Required: `DATABASE_URL` or
`DATABASE_URL_POOLED`. Optional: `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`,
`HETZNER_API_TOKEN`, `NEON_API_KEY`, `NEON_PROJECT_ID`, `BUDGET_USD_MONTHLY`
(default 100).

## Logging

JSON lines to stdout/stderr, one event per line. PM2 + Docker pick this up cleanly.
PII is never logged; user identifiers only.
