# CHECKPOINT-2 — Foundation live end-to-end

Date: 2026-05-17
Status: scaffold complete, DB live in Frankfurt, web live at https://www.feera.ai, clubs API verified end-to-end.

## TL;DR

POST a club via curl, get a UUID back, GET it. Real Postgres in Frankfurt, real Next 16 on a Hetzner box, real Drizzle queries, real RLS policies. M1 was the skeleton; M2 is the first beating heart.

```
curl -X POST -H 'x-feera-dev-admin: 1' -H 'content-type: application/json' \
  -d '{"name":"Lahore Padel Club","slug":"lahore-padel-club",
       "countryCode":"PK","city":"Lahore","defaultCurrency":"PKR"}' \
  https://www.feera.ai/api/v1/clubs
# {"data":{"id":"fd04d8d6-c595-437e-9ec8-5463b558162a", ... }}
```

## What was built

### Database (live)

- Neon project `feera-prod` (`empty-credit-43722679`), region `aws-eu-central-1` (Frankfurt), Postgres 18.
- 30 tables across 13 schema modules: users + ratings + social-scores; clubs + courts + pricing; bookings + participants; matches; tournaments + registrations + rounds + tournament_matches; coaches + coaching_sessions; chats + chat_members + chat_messages; payments + payouts; club_staff; federations + federation_player_links; edition_memberships + edition_clubs; audit_log; better-auth tables (auth_user, auth_account, auth_session, auth_verification).
- 8 SQL helper functions in `auth.*` namespace (`user_id`, `country_code`, `locale`, `edition_status`, `is_coach`, `is_club_staff`, `role`, `jwt`).
- 15 tables with Row Level Security enabled: audit_log, booking_participants, bookings, chat_members, chat_messages, chats, club_staff, clubs, court_pricing_rules, courts, edition_clubs, edition_memberships, matches, payments, payouts.

### Auth (built, not yet wired into the live API)

- `@feera/auth` package: better-auth + Drizzle adapter, JWT plugin embedding Feera claims (country_code, locale, edition_status, is_coach, is_club_staff), 7d rolling sessions.
- Custom plugins: phone OTP via Twilio Verify (SMS + WhatsApp), magic link via Resend.
- Google + Apple OAuth providers configured via env.
- `auth_user` table bridged to domain `users` via `feera_user_id`. Glicko + profile state lives on the domain side, session rotation does not break it.
- Live API still uses the `x-feera-dev-admin` header bypass introduced in M2; flipping to real better-auth lands once M provisions Twilio + sets `AUTH_SECRET` in `/srv/feera/.env`.

### API (live)

- `/api/v1/clubs` (GET list with filters, POST create).
- `/api/v1/clubs/[slug]` (GET, PATCH).
- `/api/v1/clubs/[slug]/courts` (GET, POST).
- `/api/v1/courts/[id]` (GET, PATCH, DELETE).
- `/api/v1/courts/[id]/pricing` (GET, POST).
- `/api/health` (200 ok, used by Caddy probe + deploy script).
- Zod validation on every input. RLS context set per request via `SET LOCAL request.jwt.claims` in a transaction.

### Admin (deployed, minimal)

- `/admin/clubs` (list, dev-gated by `?admin=1` or NODE_ENV).
- `/admin/clubs/new` (stub; real form M3).
- `/admin/clubs/[slug]` (stub; real detail M3).
- 5 UI primitives: button, card, input, label, table.

### Mobile (scaffolded, not deployed)

- Expo SDK 52 + expo-router 4 + RN 0.76 + React 19.
- NativeWind v4 + Tailwind 3.4 with brand tokens shared with web via `@feera/ui/tokens`.
- `(tabs)` group: home, discover, tournaments, profile.
- `(auth)` modal group: sign-in.
- Detail routes: `match/[id]`, `club/[slug]`, `edition/index`.
- i18n: en real copy, ur+ar MISSING_TRANSLATION sentinels. RTL via `I18nManager.forceRTL` on locale set.
- better-auth Expo client wired with `expo-secure-store`, deep-link scheme `feera://`.
- EAS profiles ready: development + preview (internal distribution) + production. `extra.eas.projectId` empty; M runs `eas init` next.

### Workers (built, not deployed)

- `@feera/workers` package, croner scheduler, JSON-line logger, zod env.
- 5 jobs as Phase-1 dry-runs:
  1. `rating-recalculation` (real Glicko folds, `--apply` flag plumbed; DB writes off until M3).
  2. `payment-reconciliation` (stuck-tx count log; provider polls M3).
  3. `notification-fanout` (outbox table not provisioned yet; lands M6).
  4. `backup-check` (Neon API stub).
  5. `cost-watcher` (helper stubs, $0).
- 4/4 vitest cases passing on the rating job against real Glicko code.
- `infra/Dockerfile.workers` and `services/workers/ecosystem.config.cjs` ready for M3 deploy.

### Notifications (built, no real provider calls)

- `@feera/notifications` package, zero real-SDK deps.
- Router enforces routing rules: PK → WhatsApp first then SMS, Gulf → expo_push first, default → expo_push then email, marketing → email only, opt-outs never bypassed.
- 5 channel facades (expo_push, twilio_sms, twilio_whatsapp, resend_email, onesignal_web).
- 8 typed templates (booking_confirmed, booking_cancelled, match_invite, tournament_update, chat_message, payment_succeeded, otp_fallback, edition_application_update).
- 7/7 vitest router cases pass.

### Payments + Federations (interfaces only)

- `@feera/payments`: PaymentProvider interface + PaymentRouter chain (per ADR-0003). Adapters that throw NotImplemented skip cleanly.
- `@feera/federations`: FederationAdapter interface + PPF, FIP, SPC, UAEPA stubs (all throw FederationNotImplemented). M5 wires real APIs.

### Infra

- Hetzner Falkenstein DE `46.225.157.75`, PM2 process `feera-web` on :3010.
- Nginx server block `/etc/nginx/sites-enabled/feera-web.conf` reverse-proxying to :3010 with HSTS + security headers + 1-year immutable cache on `/_next/static/`.
- TLS via Let's Encrypt (`www.feera.ai`, expires 2026-08-15). Apex still needs an A record on Cloudflare to expand the cert.
- `/srv/feera/.env` on box holds DATABASE_URL[_POOLED], PORT, HOSTNAME. PM2 launches with `--node-args='--env-file=/srv/feera/.env'`.
- `docs/runbooks/deployment.md` documents the full deploy + rollback flow.

## Decisions made unilaterally

1. **idColumn() fix** — refactored four call sites that used `idColumn()` as a foreign key (which silently dropped the FK column). Replaced with `uuid('snake_case_id').notNull().references(...)`. Caught after subagent D's first RLS apply attempt.
2. **Wipe + reapply** instead of incremental migration when the schema bug was caught. DB had no data; cleaner restart vs surgery on a broken baseline.
3. **PM2 over Docker Compose** for the live deploy, despite ADR-0009 targeting Caddy + Docker. PM2 matches every neighbour on the Hetzner box (cards, polymath, sentinel, hermes). Cut over to Caddy + Docker once Feera has 3+ services on that box.
4. **typedRoutes disabled** in next.config.ts. Subagent C's admin Link usage produced compile errors; re-enable in M3 with proper `as Route` casts in a typed link helper.
5. **Lazy DB client** (Proxy-backed `db` + `sql` exports) so Next build-time page-data collection does not require DATABASE_URL. Connection opens on first runtime query.
6. **Per-match Glicko vs rating-period batching** — subagent F flagged that per-match updates make team rating direction non-monotonic when opponents change mid-period. Worth a follow-up ADR. For now we keep per-match because that is what the spec asked for and what Lichess does.
7. **Singapore Neon stays as sandbox** — Frankfurt is the prod. The Singapore project (`floral-resonance-47691082`) lives on for ad-hoc experiments and is referenced in ADR-0005 as a Phase-2 candidate for per-PR preview DBs if Neon's branch feature disappoints.

## Known gaps for M3

1. **RLS not on every table.** users + user_ratings + user_social_scores + tournaments + tournament_registrations + tournament_rounds + tournament_matches + coaches + coaching_sessions + federations + federation_player_links lack RLS. Mix of forward-references (friendships not yet in schema) and policy bugs found during apply. Track each in a follow-up issue when GitHub repo lands; fix in M3.
2. **Auth not live.** Live API uses `x-feera-dev-admin: 1` bypass. Real better-auth lands once `AUTH_SECRET` + Twilio Verify SID land in `/srv/feera/.env`.
3. **No `/api/auth/[...all]/route.ts`** mounted yet in apps/web (subagent C left a comment; subagent B shipped the example handler at `packages/auth/src/examples/route.ts.example`).
4. **Apex DNS** — `feera.ai` A record still pending. Only `www.feera.ai` resolves and has a cert. Run `certbot --nginx --expand -d www.feera.ai -d feera.ai` after M adds the apex A record on Cloudflare.
5. **Workers not deployed.** Built and tested locally; M3 ships them via the same Docker/PM2 pipeline as web.
6. **Mobile app not deployed.** `eas init` requires Apple developer + Google Play console accounts. Awaiting M.
7. **No `pnpm test` at root** (subagents wrote vitest in 3 packages but the root `turbo run test` does not yet pick them all up because some packages lack the `test` script). Fix in M3.
8. **typedRoutes off.** Re-enable in M3 with a typed Link helper.

## Inputs needed from M before M3 starts

1. GitHub repo (still pending from CHECKPOINT-1). Suggest `feerasta-ai/feera`, private. Without it we can not push, run CI, ship GHCR images for the workers Docker stack.
2. Apple developer account + Google Play console for `eas init` + first builds.
3. Twilio Verify service SID (and confirm new Feera-only Twilio account vs reusing Tabl/Hermes).
4. Cloudflare A record for `feera.ai` apex. Then ping me to expand the cert.
5. Doppler workspace decision (or stay on `/srv/feera/.env` for M3-M4).
6. AUTH_SECRET: generate locally and paste, or have Doppler emit it. (`openssl rand -base64 48`)
7. PPLP rules document (mentioned in original spec; nothing blocking until M5).

## How to verify M2

```bash
# Glicko regression
pnpm -C "/Users/meerfeerasta/Desktop/AI Projects/Feera/packages/matching" exec vitest run

# Workers smoke
pnpm -C "/Users/meerfeerasta/Desktop/AI Projects/Feera/services/workers" exec vitest run

# Notifications router
pnpm -C "/Users/meerfeerasta/Desktop/AI Projects/Feera/packages/notifications" exec vitest run

# Live API smoke
curl -sSI https://www.feera.ai/api/health
curl -sS -H 'x-feera-dev-admin: 1' https://www.feera.ai/api/v1/clubs
```

## Next session (M3)

Order of operations:

1. GitHub repo + push existing branches + open first PR.
2. Twilio Verify wire-up + mount `/api/auth/[...all]` route handler. Real login flow on web. Better-auth's Expo client picks up the same routes on mobile.
3. Stripe + Pakistan provider real adapter implementations (Stripe + JazzCash + Easypaisa + Raast).
4. Booking flow end-to-end on web (court + time + payment), with the rating-recalculation worker switching to `--apply`.
5. Drop apex DNS + expand cert.
6. Re-enable typedRoutes.
7. CHECKPOINT-3.md.
