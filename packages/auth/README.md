# @feera/auth

Authentication layer for Feera + Feera Edition. Wraps [better-auth](https://better-auth.com) with the Feera-specific plugin stack defined in [ADR-0006](../../docs/decisions/0006-auth-better-auth.md).

## What you get

- **Phone OTP** (SMS) via Twilio Verify.
- **WhatsApp OTP** via Twilio Verify (separate channel toggle).
- **Magic link** email via Resend.
- **Google + Apple** social providers.
- **JWT issuance** with Feera claims (`country_code`, `locale`, `edition_status`, `is_coach`, `is_club_staff`) consumed by Postgres RLS.
- **Expo client** with `feera://` deep links.
- **Drizzle tables** owned by better-auth (`auth_user`, `auth_account`, `auth_session`, `auth_verification`), linked to the domain `users` table via `auth_user.feera_user_id`.

## Entry points

| Import path | Use from |
| --- | --- |
| `@feera/auth` (or `@feera/auth/server`) | Next.js Route Handlers, server actions, server components |
| `@feera/auth/client` | apps/web client components |
| `@feera/auth/expo-client` | apps/mobile |
| `@feera/auth/schema` | Drizzle schema (passed to drizzle-kit) |
| `@feera/auth/jwt-claims` | Type-safe access to the claim shape |

## Env vars

See repo `.env.example`. Required for this package:

```
AUTH_SECRET
AUTH_URL
DATABASE_URL_POOLED  (or DATABASE_URL)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
RESEND_API_KEY
EMAIL_FROM
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID / APPLE_CLIENT_SECRET / APPLE_KEY_ID / APPLE_TEAM_ID
```

## Mounting in Next.js

Subagent C will create `apps/web/src/app/api/auth/[...all]/route.ts`. The pattern lives in `src/examples/route.ts.example`. Force `runtime = 'nodejs'` because Twilio + Resend SDKs require Node.

## Postgres RLS

After your first migration of the auth tables, apply `src/sql/auth-helpers.sql` to the Neon database. Then in every RLS-bearing query path, the Next.js layer must run:

```sql
SET LOCAL request.jwt.claims = '<jwt-claims-json>';
```

on the pooled connection before issuing tenant-scoped queries. Drizzle exposes `db.execute(sql.raw(...))` for this. The helpers `auth.user_id()`, `auth.country_code()`, `auth.edition_status()`, `auth.role()` then resolve correctly.

## Routing OTP between SMS and WhatsApp

Default is SMS via `phoneOtpSender()`. To deliver via WhatsApp (PK default), swap the `sendOTP` hook on the phone-number plugin per-request, or run a thin wrapper that picks the channel based on the user's `countryCode` or stated preference before calling `sendOtp(phone, channel)`.

## Migrations

This package does **not** run migrations. Drizzle generates SQL into `packages/db`. When the Neon Frankfurt project lands, add `authSchema.*` to the drizzle-kit config and run `pnpm -C packages/db db:generate && db:migrate`.

## Status

M2 scaffolding. Not yet wired to apps/web or apps/mobile.
