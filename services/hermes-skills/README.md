# Feera Hermes Agent skills

Background-ops skills that run on the Feera Hetzner box (`46.225.157.75`) under the existing Hermes agent (see `~/.feerasta-credentials.md` `hermes` daemon at `/root/hermes/`).

Phase-1 scope (M7): nine skills per spec §"Hermes Agent Integration". This directory holds the skill definitions; the Hermes daemon itself stays in its own `/root/hermes/` install. Configuration ships via `hermes.config.yaml` here, copied to the box on deploy.

## Skills (planned)

| Skill | Trigger | Action |
|---|---|---|
| `sentry-to-pr` | Sentry webhook on new error | Spawn Claude Code session with the error context, wait for PR, notify M on Telegram |
| `daily-briefing` | 03:00 UTC cron | Query Neon for yesterday's signups/bookings/revenue + Edition apps, send Telegram digest |
| `payment-reconciliation` | Every 30 min cron | Check pending payments > 1h, poll provider, flag stuck for manual review |
| `rating-recalculation` | 02:00 UTC cron | Recompute Glicko from match history, verify against stored, alert on drift |
| `db-backup-check` | Nightly cron | Confirm Neon PITR last-good-time, alert if stale |
| `cost-watcher` | Daily cron | Fetch Neon, Hetzner, Twilio, Sentry usage. Alert if > 120% of monthly budget |
| `tournament-day-mode` | When tournament active | Poll bracket + scoring latency every 5 min, alert on anomaly |
| `support-triage` | Inbound WhatsApp to Feera support | Classify (booking/payment/rating/general/edition), route to Linear queue, auto-ack |
| `edition-application-review` | New Edition app row | Format digest, send to Telegram for M review, apply response back to DB |

## Skill definition shape

```yaml
# hermes.config.yaml
skills:
  - name: rating-recalculation
    schedule: "0 2 * * *"
    runtime: node
    entry: ./skills/rating-recalculation.mjs
    env:
      - DATABASE_URL
      - SENTRY_DSN
    timeout_seconds: 600
```

Each skill is a Node ESM file (or shell script) under `skills/`. Skills should be idempotent; Hermes may retry on failure.

## Phase-1 status

This directory is a placeholder. Real skill implementations land in M7. The `services/workers/` package already implements the in-process Phase-1 versions of `rating-recalculation`, `payment-reconciliation`, `notification-fanout`, `backup-check`, `cost-watcher` — Hermes will eventually be the orchestrator that fires them on schedule, replacing the croner-based scheduler.

## Deploy

When M7 lands:

```bash
# Sync skill files + config to the box
rsync -az services/hermes-skills/ root@46.225.157.75:/root/hermes/feera-skills/
ssh root@46.225.157.75 'sudo -u hermes hermes reload'
```

## Memory pointer

- Hermes daemon: `/root/hermes/` on the box (read-only ref; do not edit)
- Hermes docs: https://hermes-agent.org/docs
- Box neighbours that also use Hermes: polymath, sentinel, cards (do not collide with their skill namespaces; we live under `feera-*`)
