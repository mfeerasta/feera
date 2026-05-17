# Auth runbook

better-auth is mounted at `/api/auth/[...all]` in `apps/web`. The handler
re-exports `auth` from `@feera/auth/server` via `toNextJsHandler`. Runtime is
Node (Twilio + Resend SDKs require it).

## Sign-in surfaces

- `/sign-in` server component renders three modes: phone OTP, email magic
  link, OAuth (Google + Apple). Default mode is phone for PK, email
  elsewhere. Mode probe uses `x-country` then `cf-ipcountry` headers.
- Client form lives at `apps/web/src/app/(auth)/sign-in/sign-in-form.tsx`
  and calls `authClient.phoneNumber.sendOtp`, `authClient.phoneNumber.verify`,
  `authClient.signIn.magicLink`, and `authClient.signIn.social`.

## Env vars

Required:

- `AUTH_SECRET` — 48-byte random base64. On the box at `/srv/feera/.env`.
- `AUTH_URL` — public origin (e.g. `https://www.feera.ai`).
- `DATABASE_URL` — primary Postgres URL (auth tables live on the same DB).

Optional:

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
  — enable real SMS/WhatsApp OTP. Absent until M provisions Twilio.
- `RESEND_API_KEY`, `EMAIL_FROM` — enable real magic-link email.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`,
  `APPLE_CLIENT_SECRET` — OAuth providers.
- `AUTH_DEV_OTP=1` — enable the dev OTP fallback path even in production.
  Demo box currently has this set so M can sign in without Twilio.
- `ADMIN_DEV_HEADER=1` — keep the `x-feera-dev-admin: 1` header bypass
  active in production. Demo box has this set.

## Dev fallback for OTP

If `TWILIO_ACCOUNT_SID` is unset AND (`NODE_ENV != production` OR
`AUTH_DEV_OTP=1`), the phone-OTP plugin:

1. Generates a 6-digit code locally.
2. Stores it in-process with a 10-minute TTL.
3. Logs the code to stdout (`[auth/phone-otp:DEV]`).
4. Surfaces it on the sign-in page when accessed with `?dev=1`
   (server-side `peekDevOtp` reads from `feera_dev_last_phone` cookie).

The magic-link sender has the same fallback when `RESEND_API_KEY` is unset.

### Security trade-off

The dev OTP fallback is a backdoor when `AUTH_DEV_OTP=1` ships in production.
Anyone with shell access (or the ability to read PM2 stdout) can grab a
fresh OTP for any phone number and sign in as that user. The `?dev=1`
banner additionally leaks the most recent code via the user's own cookie.

Mitigations once Twilio lands:

1. Unset `AUTH_DEV_OTP` from `/srv/feera/.env` on the box.
2. Restart PM2 (`pm2 restart feera-web --update-env`).
3. Confirm cold sign-in attempt with unset env fails fast with the
   `Twilio env vars missing and dev fallback disabled.` error.

The dev-admin header bypass (`x-feera-dev-admin: 1`) has the same
property and the same kill switch (`ADMIN_DEV_HEADER`).

## Two factor authentication (M8 scaffold)

CLAUDE.md requires 2FA for the `club_staff` and `platform_admin` roles. The wiring lands in M8 polish via better-auth's `twoFactor` plugin (TOTP). Env vars reserved up front so the box config can be primed without a redeploy:

- `TOTP_ISSUER` — display string shown in authenticator apps. Default `Feera`.
- `TOTP_BACKUP_CODE_COUNT` — number of recovery codes per enrolment. Default `10`.
- `TOTP_REQUIRED_ROLES` — comma-separated list of roles that must enrol before they can act. Default `club_staff,platform_admin`.

Implementation plan:

1. Add `better-auth/plugins/two-factor` to the server config in `packages/auth/src/server.ts`.
2. Mount `/me/security` UI with QR enrolment + backup codes (server component + a small client form).
3. Add a middleware check in `proxy.ts` that 302s any session whose role is in `TOTP_REQUIRED_ROLES` but has `twoFactorEnrolledAt is null` to `/me/security?enrol=1`.
4. Update RLS helper to read a `mfa_passed` claim, and gate `auth.is_club_staff()` / admin-only mutations on it.

Not in M8 ship: enrolment recovery via SMS (requires Twilio live).

## Verification

```bash
# Handler mounts (returns 4xx, not 500)
curl -i https://www.feera.ai/api/auth/sign-in/email

# Phone send (dev mode, watch logs)
curl -X POST -H 'content-type: application/json' \
  -d '{"phoneNumber":"+923001234567"}' \
  https://www.feera.ai/api/auth/sign-in/phone-number
pm2 logs feera-web --lines 20 | grep DEV
```
