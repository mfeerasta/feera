# Feera Hermes Agent skills

Background-ops skills run by the Hermes daemon at `/root/hermes/` on
`46.225.157.75`. Phase 1.5 (M7) ships the nine real implementations listed
below.

## Skills

| Skill | Trigger | Env required | Action |
|---|---|---|---|
| `sentry-to-pr` | webhook `/webhooks/sentry` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, opt `GITHUB_TOKEN`+`GITHUB_REPO`+`ENABLE_GITHUB_PR=1`, `SENTRY_WEBHOOK_SECRET` | Parse Sentry payload, classify into payments/auth/db/realtime/other, post Telegram digest, optionally open GitHub issue. |
| `daily-briefing` | cron `0 3 * * *` | `DATABASE_URL_POOLED`, `TELEGRAM_*` | 24h activity digest (signups, bookings, matches, revenue PKR, Edition apps). |
| `payment-reconciliation` | cron `*/30 * * * *` | `DATABASE_URL_POOLED`, opt `STRIPE_SECRET_KEY` | Resolve `payments` pending > 1h against Stripe; mark succeeded/failed; Telegram alert when stuck. |
| `rating-recalculation` | cron `0 2 * * *` | `DATABASE_URL_POOLED`, opt `FEERA_WORKERS_CLI` | Spawns `feera-workers run rating-recalculation --apply` (Glicko engine lives in `services/workers`). |
| `db-backup-check` | cron `0 4 * * *` | `NEON_API_KEY`, `NEON_PROJECT_ID`, `TELEGRAM_*` | Verify Neon primary branch + recent finished ops in last 25h; alert otherwise. |
| `cost-watcher` | cron `0 6 * * *` | `HETZNER_API_TOKEN`, `NEON_API_KEY`, `TWILIO_*`, opt `STRIPE_SECRET_KEY`, `BUDGET_USD_MONTHLY`, `TELEGRAM_*` | Aggregate month-to-date spend across providers; alert if > 120% of budget. |
| `tournament-day-mode` | cron `*/5 * * * *` | `DATABASE_URL_POOLED`, `TELEGRAM_*` | Find live-tournament matches stalled > 30 min; per-stall Telegram alert. |
| `support-triage` | webhook `/webhooks/twilio-whatsapp` | `TWILIO_AUTH_TOKEN`, opt `LINEAR_API_KEY`+`LINEAR_TEAM_ID` | Verify Twilio signature, classify inbound WhatsApp by keyword, file Linear issue, reply with TwiML auto-ack. |
| `edition-application-review` | pg_listen `edition_application_inserted` | `DATABASE_URL_POOLED`, `TELEGRAM_*` | LISTEN payload arrives, look up `edition_memberships` row, post structured Telegram digest. |

## Layout

```
services/hermes-skills/
  hermes.config.yaml      # skill manifest copied to /root/hermes/feera-skills/
  lib/
    log.mjs               # JSON logger shared by all skills
    neon.mjs              # postgres client cache (pooled + direct)
    telegram.mjs          # Telegram Bot API helper (chunking + DRY_RUN aware)
  skills/                 # one .mjs per skill
  tests/                  # node --test
```

## Behaviour contract

Every skill:

- Reads its own config from environment variables (never from disk).
- Emits one structured JSON log line per event to stdout (info/debug) or stderr (warn/error). Shape: `{ ts, level, msg, svc, skill, ...ctx }`.
- Exits `0` on success, non-zero on failure.
- Treats `DRY_RUN=1` as "read but do not write or post".
- Skips Telegram posts cleanly when `TELEGRAM_BOT_TOKEN` is unset (so a fresh box does not fail loudly).

## Deploy

```bash
# Sync skill files + config to the box
rsync -az --delete services/hermes-skills/ \
  root@46.225.157.75:/root/hermes/feera-skills/
ssh root@46.225.157.75 'cd /root/hermes/feera-skills && npm install --omit=dev'
ssh root@46.225.157.75 'sudo -u hermes hermes reload'
```

Apply the Edition NOTIFY trigger once:

```bash
psql "$DATABASE_URL" -f packages/db/src/sql/edition-realtime.sql
```

## Local invocation

```bash
DRY_RUN=1 DATABASE_URL_POOLED=postgres://... \
  node services/hermes-skills/skills/daily-briefing.mjs
```

```bash
SENTRY_PAYLOAD_FILE=./tests/fixtures/sentry-issue.json \
  node services/hermes-skills/skills/sentry-to-pr.mjs
```

## Tests

```bash
node --test services/hermes-skills/tests/
```

## Memory pointer

- Hermes daemon: `/root/hermes/` on the box (read-only ref).
- Box neighbours (polymath, sentinel, cards) share the daemon; we live under the `feera-*` namespace.
