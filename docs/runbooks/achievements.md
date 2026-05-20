# Achievements

The `award-achievements` worker job evaluates 12 achievement rules against
live Postgres state every 30 minutes and inserts any newly-satisfied awards
into `user_achievements`. Inserts use `ON CONFLICT DO NOTHING` so reruns are
idempotent.

Source files:

- Catalogue: `packages/db/migrations/0018-achievements.sql`
- Drizzle schema: `packages/db/src/schema/achievements.ts`
- Catalogue seed: `packages/db/scripts/seed-achievements.mjs`
- Detector worker: `services/workers/src/jobs/award-achievements.ts`
- Notification template: `packages/notifications/src/templates/achievement-awarded.ts`

## The 12 rules

| id | category | SQL highlight |
| --- | --- | --- |
| `first_match` | progress | `COUNT(matches) >= 1` |
| `wins_10` | milestones | verified matches where the user's team won, count >= 10 |
| `wins_50` | milestones | same shape, count >= 50 |
| `streak_5` | streaks | walk matches newest first, count wins until first loss, >= 5 |
| `streak_10` | streaks | same, >= 10 |
| `century` | milestones | `COUNT(matches) >= 100` |
| `founder_member` | progress | `users.created_at < '2027-01-01'` |
| `social_butterfly` | social | `COUNT(friendships) where status='accepted' and user is on either side >= 25` |
| `mixer` | social | `COUNT(DISTINCT partner) across matches >= 20` |
| `tournament_finalist` | tournaments | user's registration was on the losing side of a tournament's max-ordinal round |
| `tournament_champion` | tournaments | same, winning side |
| `early_bird` | streaks | >= 10 booking participations where `checked_in_at BETWEEN start_at-30m AND start_at+5m` and `EXTRACT(HOUR FROM start_at) < 9` |

Each rule is implemented as a small SQL aggregate inside
`services/workers/src/jobs/award-achievements.ts`. The pure rule evaluator
`evaluateRules(user, signals)` is exported and unit tested independently so
boundary conditions (exact 10 wins, exact 5 streak, founder cutoff) cannot
silently regress.

## Notification flow

When the detector inserts a new row, it also writes to `notifications_outbox`:

- template: `achievement_awarded`
- urgency: `low`
- variables: `{ achievementId, achievementName }`

The fanout worker picks the row up on its next 30-second tick and routes it
through the standard channel chain (push by default, WhatsApp/SMS for PK).

## Deployment notes

- The job is registered in `services/workers/src/scheduler.ts` alongside the
  other crons. It uses `croner` 6-field syntax (`0 */30 * * * *`).
- The worker heartbeat is written by `runJobOnce` after every run; alerting
  fires if the gap exceeds 90 minutes.
- The job's SQL is read-only against `matches`, `friendships`, `tournament_*`,
  and `booking_participants`; the only write is the insert into
  `user_achievements` plus the outbox row. No transactional wrapping needed.
- Sandbag-flagged users (`user_ratings.is_flagged_sandbag = true`) are
  intentionally still awarded by this worker. The sandbag flag is a leaderboard
  signal, not an achievement gate.

## Adding a new achievement

1. Add a new row to `ACHIEVEMENTS` in
   `packages/db/scripts/seed-achievements.mjs` and rerun the seed:
   `DATABASE_URL=... node packages/db/scripts/seed-achievements.mjs`.
2. Add the id to the `AchievementId` union in
   `services/workers/src/jobs/award-achievements.ts`.
3. Add a `name` to `ACHIEVEMENT_NAMES` for the notification copy.
4. Add a detection clause to `evaluateRules` plus the matching SQL in
   `loadSignals`. Keep the SQL read-only.
5. Add a vitest case in
   `services/workers/test/award-achievements.test.ts` that pins the boundary
   condition.
6. Deploy the worker. The next 30-minute tick will pick up new awards for
   every user, not just users who acted during that interval.

## Troubleshooting

- "users got duplicate notifications": check the unique constraint
  `user_achievements_uq (user_id, achievement_id)`. The detector relies on
  `ON CONFLICT DO NOTHING` returning zero rows to skip the notification
  enqueue.
- "rule misfires": run `evaluateRules` in a unit test with the exact signals
  observed in production. The pure function makes regressions reproducible.
