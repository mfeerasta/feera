# Feera project rules for Claude

Read this before every action in this repo.

## Identity

This is **Feera + Feera Edition**. A multi-decade venture, not a prototype. Code quality, security, observability, and i18n are first-class from day one.

## Non-negotiable

1. **Commit + PR per change.** Conventional Commits. Feature branches only. Never push to `main`. Open PRs linked to the relevant `CHECKPOINT-N.md`.
2. **Tests required** for every business-logic function. Run before commit. Fix failures before continuing. 80% coverage minimum on `packages/matching`, `packages/payments`, `packages/db`.
3. **ADRs for ambiguity.** Document non-trivial decisions in `docs/decisions/NNNN-topic.md`. Stop only for irreversible choices (paid signups, real money, region locks).
4. **Adapter pattern** for every external API: payments, SMS, push, maps, video, identity, federations. Swap providers per region.
5. **TS strict, no `any`, no `@ts-ignore`** without comment + linked GitHub issue.
6. **RTL first-class.** Logical CSS properties only (`ms-4`, `start`, never `ml-4`, `left`). Every layout works en/ur/ar.
7. **No em-dashes** in user-facing copy, docs, comments. Use commas, periods, colons, parens, sentence breaks.
8. **Never write the word that starts with C and ends with "onfidential"** in any file.
9. **No underscores** in file/dir names. kebab-case.
10. **A11y mandatory:** WCAG 2.1 AA on web, equivalent on mobile. axe-core in CI.
11. **Perf budgets enforced:** FCP < 1.8s on 3G web. App cold start < 2s on Samsung A-series. Lighthouse CI gates PRs.

## Stack assumptions

- Next.js 16 (App Router). `proxy.ts` not `middleware.ts`. Async `params`/`searchParams`/`cookies()`/`headers()`.
- Default to Node runtime (Fluid Compute). Edge only when justified.
- Server Components by default. `'use client'` only where interactivity required.
- Drizzle ORM + Neon Postgres. RLS on every table, enforced via JWT claims from better-auth, tested.
- Glicko-2 (not vanilla ELO). Display rating 0.0-7.0 = `clamp((internal - 800) / 200, 0, 7)`.
- Hosting: **Hetzner CPX21 Falkenstein DE `46.225.157.75`** (Docker Compose + Caddy). EAS for `apps/mobile`. No Vercel.
- Neon region: **`aws-eu-central-1` Frankfurt** for GDPR posture and < 5ms latency to the Hetzner box. Per-PR branches via Neon for preview DBs.
- Auth: better-auth + Twilio Verify (SMS + WhatsApp) + Resend magic links + Google/Apple OAuth.
- Realtime: Soketi container (Pusher protocol) at `realtime.feera.ai`.
- Storage: Hetzner Object Storage (FSN1), Cloudflare CDN at `cdn.feera.ai`.
- Payments default routing: PK+PKR → Raast > JazzCash > Easypaisa > Stripe. UAE+AED → Stripe (Apple Pay). Others → Stripe.
- Notifications default channel: PK users → WhatsApp. Gulf users → push + email fallback.

## Brand voice

- **Feera**: confident, modern, regionally-fluent, slightly playful.
- **Feera Edition**: quiet, restrained, editorial, never shouty.

## Privacy posture

- PII encryption at rest via Postgres `pgcrypto` columns (phone, email, payment details). Symmetric key in env, rotated per quarter.
- No PII in Sentry payloads (data scrubber configured).
- Women's privacy panel surfaces visibility controls in onboarding + always accessible.
- GDPR data export + delete from day one (`/api/v1/me/export`, `/api/v1/me/delete`).

## When in doubt

Default to the most defensible option, document the call in an ADR, proceed. Only stop for:

- Real money transactions.
- Paid service signups (Doppler, Neon Pro, Twilio paid, Sentry Team, OneSignal, EAS paid, etc.).
- Region locks (Neon project region, Hetzner region).
- Hard breaking changes to public APIs after launch.

## File organisation cheatsheet

```
apps/web              feera.ai marketing + /play player surface + (admin) club admin + public SEO + /edition
apps/mobile           Expo player app (EAS builds)
packages/matching     Glicko-2 + partner-finder + tournament engine
packages/payments     adapters + router (PaymentProvider interface)
packages/notifications adapters + router (NotificationChannel interface)
packages/db           Drizzle schema + RLS + migrations
services/workers      cron jobs on Hetzner
services/hermes-skills  Hermes Agent skills (sentry-to-pr, daily-briefing, etc.)
docs/decisions        ADRs
docs/runbooks         deploy + on-call
```

## Memory pointer

User personal preferences in `~/.claude/CLAUDE.md`. Credentials in `~/Desktop/feerasta-credentials.md`.
