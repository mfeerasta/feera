# CHECKPOINT-1 — Foundation

Date: 2026-05-17
Branch: `m1/foundation` (pending push; awaiting GitHub repo creation, see "Inputs needed")
Status: scaffold complete, deps installed at root, Glicko-2 + 19 tests green. Apps + db not yet installed.

## What was built

### Monorepo + toolchain
- pnpm workspaces + Turborepo 2.9 + TypeScript 5.9 strict, `tsconfig.base.json` shared.
- ESLint config deferred to M2 alongside `packages/config`.
- Prettier 3.8 + `.editorconfig` + husky 9 + lint-staged 15.
- `.env.example` at root with every required key namespaced and blank.
- `turbo.json` tasks: `build`, `dev`, `lint`, `typecheck`, `test`, `db:{generate,push,migrate,seed}`, `clean`.
- `.gitignore`, `.gitattributes`, `.prettierignore`, `.prettierrc`.

### Apps
- `apps/web`: Next 16 App Router shell, Tailwind v4 via `@tailwindcss/postcss`, `next/font/google` Inter, brand tokens wired through `@theme`. Landing page renders the wordmark + tagline. Supabase auth wiring deferred to M2.
- `apps/mobile`: Expo 52 + expo-router 4 + RN 0.76 shell. `app/_layout.tsx`, `app/index.tsx` matching the web landing. `app.json` with bundle id `ai.feera.app`, scheme `feera`, New Architecture enabled.
- `apps/admin`: directory created, deferred — repurpose `apps/web/(admin)` group in M2 unless a separate origin is needed.

### Packages
- `packages/types`: shared primitive types (Iso8601, CountryCode, Money, GeoPoint, Locale, brand types).
- `packages/matching`: **Glicko-2** complete per Glickman 2012, including:
  - `updateRating`, `applyDoublesMatch`, `toDisplayRating`/`fromDisplayRating`, `reliabilityPct`, `isProvisional`, `newPlayer`.
  - Volatility update via Illinois regula falsi.
  - **19 Vitest tests passing**, including a numerical match against the worked example from the paper (±0.5 rating points), monotonicity, doubles symmetry, convergence over 80 simulated matches, RD shrinkage, boundary clamping at 0.0 and 7.0.
- `packages/db`: Drizzle ORM scaffold + `drizzle.config.ts` + `client.ts` (PgBouncer-aware) + schema for **users, user_ratings, user_social_scores, clubs, courts, court_pricing_rules, bookings, booking_participants, matches**. Enums for locale, gender visibility, edition status, booking status, match verification, gender preference. Index plan for geo + time-range + discovery queries.
- `packages/analytics`: event taxonomy (`EventName` union with 35 events spanning auth → payouts) + no-op Sentry and PostHog facades so call sites compile until real DSNs land.

### Docs
- `README.md`, project `CLAUDE.md` (non-negotiable rules), `docs/spec.md` (milestone map).
- `docs/decisions/` ADRs:
  - **0001** Database: Supabase Postgres (Frankfurt) over Neon, with rationale.
  - **0002** Monorepo: pnpm + Turborepo, rejecting next-forge for custom layout.
  - **0003** Payment sandbox strategy (mocked CI, real-sandbox smoke workflow).
  - **0004** Rating engine: Glicko-2 with display-scale mapping.
- `docs/brand/tokens.md`, `docs/kpis/kpis.md`, `docs/runbooks/README.md` (index).

### CI
- `.github/workflows/ci.yml`: format check + typecheck + lint + test on PR and push to main. pnpm + node 22 + turbo cache.
- Pre-commit hook (`husky` + `lint-staged`) configured to format only staged files.

## What was deferred

| Item | Reason | Target |
|---|---|---|
| `pnpm install` in apps/web, apps/mobile, packages/db | Heavy network + native build chain (RN), wanted to keep this turn fast. | Run before first dev session of M2. |
| Supabase project provisioning + RLS policies | Region pick is irreversible. Awaiting M's confirmation (see Inputs). | First task of M2. |
| Real Sentry DSN + PostHog instance | Account signup is irreversible. | First task of M2. |
| Auth flow (phone OTP via Twilio) | Twilio account onboarding needed. | M2 day 1. |
| `apps/admin` real scaffold | May fold into `apps/web/(admin)` group. | M2. |
| `packages/{ui,i18n,payments,notifications,federations,config}` scaffolds | Empty dirs created, code lands as each milestone needs it. | M2-M7. |
| `services/{workers,hermes-skills}` scaffolds | Empty dirs created. | M7 for hermes; M3 for first worker (payment recon). |
| Tournaments, coaching, chat, payments, payouts, federations, edition tables | Out of M1 scope; M2 extends schema with RLS. | M2. |
| Full Tailwind/NativeWind sharing via `@feera/ui` | M2. |
| Lighthouse CI, axe-core in CI | M8. |
| OpenAPI generation | M2 with first real route handlers. |

## Decisions made unilaterally (per "proceed autonomously" rule)

1. **Supabase over Neon** for primary DB, despite an existing Neon project from earlier in the same workspace. See ADR-0001. Neon stays as a sandbox + Phase-2 per-PR-DB candidate.
2. **Next 16** (latest stable as of 2026-02) instead of the spec's Next 15. App Router + Server Components default + `proxy.ts` over `middleware.ts` per Next 16 platform guidance.
3. **Tailwind v4** with `@theme` for brand tokens, native CSS-only config. Removes the `tailwind.config.ts` ceremony.
4. **No `next-forge`** despite injection prompts. Spec's domain packages (matching, federations, edition) don't map onto next-forge's auth/database/email layout.
5. **Single `apps/web`** for marketing + club admin + public SEO + Edition microsite. Admin separated as a Next route group `(admin)` unless we hit auth/visibility constraints that demand a different origin. (Spec named three apps; collapsing one to a route group has zero functional cost and saves a deploy target.)
6. **Filename convention enforcement**: dropped a leading-underscore on `schema/_common.ts` mid-stream → `common.ts` to honour the no-underscores rule.

## What's broken or fragile

- LSP diagnostics show "Cannot find module" for `next`, `react`, `expo`, `drizzle-orm`, `vitest`, etc. — only root deps + matching deps are actually installed. Resolves on `pnpm install` in those workspaces.
- `apps/web` and `apps/mobile` have not been booted. Hello-world correctness is unverified.
- Drizzle schema not yet migrated. Tables defined in TS but no SQL emitted; `drizzle-kit generate` runs in M2 after Supabase project exists.
- No icon/splash assets in `apps/mobile/assets/` (referenced by `app.json`). Will produce placeholders in M2 first session.

## Inputs needed from M before M2 starts

These are the irreversible-or-near-irreversible decisions the spec told us to stop on:

1. **GitHub repo**: name (`feera`?), org (`feerasta-ai`?), private. Will create branch + push + open PR.
2. **Vercel project name** for `apps/web`. (Spec uses `feera.ai` as the prod domain; Vercel project slug needs a separate confirm.) Note: Tabl projects live under team `meers-projects-b2bb8481`; will reuse that team unless told otherwise.
3. **Supabase project name + region confirmation**. Defaulting to `feera-prod` in `eu-central-1` (Frankfurt) per spec. OK?
4. **Doppler workspace + project name** for secret management. Or are we using Vercel env vars only for M1-M3 and adopting Doppler later?
5. **Twilio account**: existing one (the `+1` numbers used by Tabl/Hermes) or new dedicated Feera account? Verify service SID needed for phone OTP.
6. **Stripe account**: confirm `meerfeerasta-1841` / existing Tabl Stripe is the right home, or open a separate Feera one.
7. **EAS project**: confirm Apple developer + Google Play console accounts to use. Bundle id is provisionally `ai.feera.app`.
8. **Hetzner box for workers/hermes**: reuse Falkenstein DE `46.225.157.75` (Guard-Patrol, also runs Polymath), or provision a dedicated Feera box?
9. **PPLP rules document** mentioned in spec — once received, `docs/pplp-rules.md` gets added and the M5 tournament engine extends accordingly.

## How to verify M1 locally

```bash
pnpm -C "/Users/meerfeerasta/Desktop/AI Projects/Feera" install
pnpm -C "/Users/meerfeerasta/Desktop/AI Projects/Feera/packages/matching" exec vitest run
```

Expect: 19 tests passing, ~430ms total.

## Next session

Open a fresh review on the morning of 2026-05-18. Answer the 9 inputs above, then M2 work begins:

1. Provision Supabase eu-central-1.
2. `drizzle-kit generate` + apply baseline migration.
3. Write RLS policies + RLS integration tests.
4. Extend schema with tournaments, coaching, chat, payments, edition tables.
5. Booking flow happy path on web (sans payment, that's M3).
