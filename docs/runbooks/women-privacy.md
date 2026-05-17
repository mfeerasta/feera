# Women's privacy panel + women-only matchmaking pool

Owner: matchmaking + identity
Last updated: 2026-05-17

## What it is

A combined privacy + matchmaking feature with three guarantees:

1. Women players control who sees their gender on Feera.
2. Women players can opt in to a parallel matchmaking pool that is
   women-only.
3. Their women-pool Glicko rating depends on women-pool matches only, and
   on nothing else.

## Surfaces

| Surface | Purpose |
| --- | --- |
| `/onboarding` | First-run 3-step wizard. Steps: display name + city, gender, privacy + pool opt-in. Renders only when `users.display_name` or `users.gender` is missing. |
| `/me/privacy` | Always accessible, granular controls (gender, visibility, opt-in). |
| `/me` Pool and privacy card | Read-only summary + deep-link to `/me/privacy`. |
| `/play/open` toggle | "All players" vs "Women only". Renders only for women who opted in. |
| `/play/clubs/.../book-slot-form` gender preference selector | Booker chooses Open / Mixed / Men only / Women only when creating a booking. |

## Data model

| Column | Purpose |
| --- | --- |
| `users.gender` `text` (`m`, `f`, `x`, NULL) | Self-reported gender. |
| `users.gender_visibility` enum (`public`, `friends`, `private`) | Who can see the gender field. Default `private`. |
| `users.women_only_pool_opt_in` boolean default false | Eligibility for the women-only pool. Only meaningful when `gender = 'f'`. Migration `0009-women-pool-opt-in.sql`. |
| `user_ratings.women_only_pool_rating` double precision NULL | Parallel Glicko rating. NULL means "no women-pool history yet". |
| `matches.rating_changes` jsonb | Now stores `{ open: { userId: ... }, women?: { userId: ... } }`. |

## Privacy model: who sees what

`gender_visibility` controls the **gender field**, not row visibility.
Rows for all signed-in users are returned by the API so club rosters,
match participants, and the open-match feed continue to work; the gender
column is masked at the API layer based on the requester relationship.

The serializer lives at `apps/web/src/lib/api/user-serializer.ts`:

```ts
maskUserForViewer(user, { userId, friendUserIds, isAdmin })
```

| `gender_visibility` | Viewer is owner | Viewer is accepted friend | Viewer is signed-in stranger | Viewer is admin |
| --- | --- | --- | --- | --- |
| public | sees | sees | sees | sees |
| friends | sees | sees | masked | sees |
| private | sees | masked | masked | sees |

Anonymous viewers see no gender unless `public`.

RLS lives in `packages/db/src/rls/users.sql`: row visibility is open to
signed-in users for product UX; the column mask is the spec-aligned layer
for the gender field. Tests in `apps/web/test/user-serializer.test.ts`
cover all visibility x viewer-relationship combinations.

## Mathematical guarantee: pool independence

The women-only pool runs as a **parallel Glicko-2 state** per player. The
guarantee is:

> A player's `user_ratings.women_only_pool_rating` is a deterministic
> function of the subset of her ranked matches in which all four players
> have `gender = 'f'`. The open-pool rating, mixed matches, and any other
> player state never enter the computation.

Construction:

1. `applyDoublesMatch` is invoked twice in `apps/web/src/lib/matches/service.ts`
   when ALL four players are female: once with each player's open Glicko
   state, once with their `women_only_pool_rating` state (seeded from
   defaults 1500/350/0.06 when NULL).
2. Persisted deltas are split: `matches.rating_changes = { open, women }`.
3. The nightly recompute worker `services/workers/src/jobs/rating-recalculation.ts`
   folds the open pool from the full ranked history and the women pool
   from the all-female sub-history, then upserts each pool's rating in
   the same SERIALIZABLE transaction batch.

Result: a woman who plays mixed matches and women matches has two
independent ratings. Mixed-match outcomes leave her women-pool rating
unchanged.

## Opt-in defaults

- Default is **off** at the schema level (`women_only_pool_opt_in default false`).
- Onboarding step 3 surfaces the checkbox only when the user picked
  "Woman" in step 2. The checkbox defaults checked in the UI but the
  user must complete the step to persist it.
- The `women_only_pool_opt_in` field is hard-coerced to false in the
  client form whenever the gender is not `f`, so toggling away from
  Woman removes pool participation.

## API surface

| Endpoint | Behaviour |
| --- | --- |
| `PATCH /api/v1/me` | Accepts `gender`, `genderVisibility`, `womenOnlyPoolOptIn`. |
| `GET /api/v1/matches/discover?pool=women` | Forbidden 403 unless caller has `gender='f'` and `women_only_pool_opt_in=true`. When allowed, restricts results to women-only bookings and uses each participant's `women_only_pool_rating` for level scoring. |
| `GET /api/v1/bookings/open?pool=women` | Same gating. Adds `gender_preference = 'women_only'` filter. |
| `POST /api/v1/matches/[id]/score` | Always updates the open pool. Additionally updates the women pool when all four players are female. |

## Failure modes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Woman cannot see Women-only toggle on `/play/open` | She has not opted in. | `/me/privacy` -> enable the toggle. |
| Open match shows a male participant in a `women_only` booking | Bug, should never happen. Matchmaking hard-filters such bookings. | File a CRITICAL bug. |
| Women-pool rating jumps in a mixed match | Bug. Pools must be independent. | Inspect `matches.rating_changes`; women block should be absent for mixed matches. |
| 403 on `/api/v1/matches/discover?pool=women` for a verified female user | Opt-in flag is off in DB. | Toggle on at `/me/privacy`. |

## Tests

| Suite | What it covers |
| --- | --- |
| `packages/matching/test/partner-finder.test.ts` (women-only block) | Hard filter, tainted-participant exclusion, women-pool rating scoring, fallback when participant has no women rating yet. |
| `services/workers/test/rating-recalculation.test.ts` (women-pool block) | Parallel pool produces a different state from the open pool given the same player. |
| `apps/web/test/user-serializer.test.ts` | All visibility x viewer combinations including admin bypass. |

## Migration order

`packages/db/migrations/0009-women-pool-opt-in.sql` adds
`users.women_only_pool_opt_in`. Apply against Neon prod after deploy:

```bash
psql "$DATABASE_URL" -f packages/db/migrations/0009-women-pool-opt-in.sql
```

`user_ratings.women_only_pool_rating` already exists from the baseline
migration.
