# 0006. Auth: better-auth + Twilio Verify (no Supabase Auth)

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: auth, security

## Context

We removed Supabase from the stack (ADR-0005), so Supabase Auth goes with it. Feera needs:

- Phone OTP via SMS (Pakistan default).
- WhatsApp OTP (Pakistan preferred).
- Email magic links (Gulf, EU, NA).
- Social OAuth (Google, Apple).
- Mobile + web SSO across `apps/web` and `apps/mobile`.
- JWT issuance with custom claims (so Postgres RLS can read `auth.user_id()` and `auth.country_code()`).
- Edition member tier flag baked into the session.

## Options considered

### Option A: better-auth
TypeScript-first, plugin model (phone OTP, passkey, social, magic link, multi-session, organizations), owns its tables in our Postgres, JWT or session cookies, framework adapters for Next + Expo. Active maintainers, growing community as of 2026.

### Option B: NextAuth/Auth.js v5
Mature, React-focused. Phone OTP requires custom adapter work. Less ergonomic for mobile + custom JWT claims.

### Option C: Self-host GoTrue (Supabase Auth standalone)
Closest to the original plan. Go binary, Postgres-backed. But: we lose the TS plugin ergonomics, and integrating WhatsApp OTP is custom anyway.

### Option D: Lucia
Sunset by maintainer in 2024. Rejected.

### Option E: Clerk / WorkOS / Stytch (managed)
Managed = paid + lock-in. M's preference is self-host. Rejected for Phase 1; revisit only if compliance forces it.

## Decision

**better-auth** as the auth layer, with **Twilio Verify** as the OTP transport for SMS + WhatsApp. Email magic links via Resend. Google + Apple OAuth via better-auth built-ins.

## Implementation

- `packages/auth` (new in M2) wraps better-auth with Feera-specific config:
  - JWT claims: `sub`, `country_code`, `locale`, `edition_status`, `is_coach`, `is_club_staff`.
  - Sessions: 7d rolling, refresh on use.
  - Phone OTP plugin → Twilio Verify (SMS).
  - Custom WhatsApp OTP plugin → Twilio Verify (WhatsApp channel).
  - Magic link plugin → Resend.
  - Social providers: Google + Apple.
- Next.js Route Handlers expose `/api/auth/[...all]`.
- Expo uses better-auth's Expo plugin with deep-link redirects via `feera://`.
- Postgres RLS policies read JWT claims via the `auth.jwt()` helper installed in M2.

## Consequences

- Positive: one auth lib across web + mobile + admin. No vendor lock.
- Positive: tables live in our DB; full export/delete control for GDPR.
- Negative: we own the auth surface. Mitigation: better-auth has community-vetted defaults and CSRF + rate-limit primitives built in.
- Follow-up: ADR-00NN once we wire 2FA for club admins + platform admins.
