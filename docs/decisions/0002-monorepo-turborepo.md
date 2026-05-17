# 0002. Monorepo with Turborepo + pnpm (not next-forge)

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: infra, devex

## Context

We need a monorepo housing 3 apps (web, mobile, admin), 10 packages, and 2 services. We need fast incremental builds, typed cross-package imports, and a single CI pipeline.

## Options considered

### Option A: pnpm workspaces + Turborepo (custom layout)
Pros:
- Matches the spec's exact package taxonomy (matching, payments, federations, edition concerns).
- pnpm is fast, disk-efficient, strict about phantom deps.
- Turbo's remote cache integrates natively with Vercel.

Cons:
- We hand-roll the layout. Some templates would have given us free CI.

### Option B: next-forge
Pros:
- Battle-tested layout with auth, database, email, observability packages prewired.
- Active maintainer.

Cons:
- Opinionated layout (apps/api, apps/app, apps/web, packages/auth, packages/email, etc.) does not match Feera's domain packages.
- Imposes Clerk + BetterStack + Resend + others. We want Supabase Auth + Sentry + Twilio + Resend.
- Forking the layout costs as much as building it.

### Option C: Nx
Pros:
- Powerful generators and graph analysis.

Cons:
- Heavier mental model than needed.
- Smaller intersection with the Vercel deploy story.

## Decision

**pnpm workspaces + Turborepo**, custom layout per the spec. Reject next-forge and Nx.

## Consequences

- Positive: every package and app name maps 1:1 to a spec section.
- Positive: Turbo remote cache via Vercel works out of the box.
- Negative: we own CI scripts from scratch (acceptable, the spec calls for specific gates anyway: axe-core, Lighthouse, RLS integration tests, i18n missing-key checker).
