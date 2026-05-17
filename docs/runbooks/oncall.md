# On-call runbook

Quick reference for the human on duty. Targets the Hetzner Falkenstein DE box at `46.225.157.75` and the Neon Frankfurt DB.

## Health checks

| What | How |
|---|---|
| Web alive | `curl -sSI https://www.feera.ai/api/health` (expect 200 + `{"ok":true}`) |
| TLS expiry | `echo \| openssl s_client -servername www.feera.ai -connect www.feera.ai:443 2>/dev/null \| openssl x509 -noout -dates` |
| nginx config | `ssh root@46.225.157.75 nginx -t` |
| PM2 | `ssh root@46.225.157.75 pm2 status` |
| DB connectivity | `psql "$FEERA_PROD_DATABASE_URL" -c 'select 1'` |
| DB free space | `psql "$FEERA_PROD_DATABASE_URL" -c "select pg_size_pretty(pg_database_size('neondb'))"` |
| RLS coverage | `psql "$FEERA_PROD_DATABASE_URL" -c "select count(*) from pg_tables where schemaname='public' and rowsecurity=true"` |
| Disk on box | `ssh root@46.225.157.75 df -h /` |
| Recent errors | `ssh root@46.225.157.75 pm2 logs feera-web --lines 100 --nostream` |

## First moves when paged

1. Confirm the symptom (curl the URL the alert names).
2. Check PM2 (`pm2 status` — `restarts` rising = process crashing).
3. Check the most recent deploy (`pm2 describe feera-web` for `uptime` and the last good `restart_time`).
4. If process is crashing, tail logs (`pm2 logs feera-web --lines 200 --nostream`).
5. If logs show DB errors, check Neon status (`curl -sSI https://api.neon.tech/api/v2/projects/empty-credit-43722679`).
6. If DB up but app errors, check `/srv/feera/.env` for missing keys after recent deploy.
7. If nginx is down (`systemctl status nginx`), check `nginx -t` for syntax + reload (`systemctl reload nginx`). NEVER `restart` without `-t` passing.

## Common incidents

### feera.ai resolves but TLS fails

```
ssh root@46.225.157.75 certbot certificates
# If cert expired:
ssh root@46.225.157.75 certbot renew
ssh root@46.225.157.75 systemctl reload nginx
```

### PM2 keeps restarting feera-web

```
ssh root@46.225.157.75
pm2 logs feera-web --lines 200 --nostream
# Likely culprit: missing env in /srv/feera/.env after a deploy that
# added a new required var. Compare to apps/web/.env.example.
```

### DB high CPU

```
psql "$FEERA_PROD_DATABASE_URL" -c "select query, state, pid, now() - query_start as runtime from pg_stat_activity where state != 'idle' order by runtime desc limit 20"
# Kill a runaway query:
psql "$FEERA_PROD_DATABASE_URL" -c "select pg_cancel_backend(<pid>)"
```

### Bookings show double-charges

1. Query payments: `select * from payments where context_id = '<bookingId>' order by created_at`.
2. If two `succeeded` rows for the same `idempotency_key`, it's a Stripe-side dedup miss; raise with Stripe support.
3. If two rows with different `idempotency_key` for the same booking, it's our retry bug; refund the duplicate via Stripe dashboard, file an incident.

### Open match overfilled (more than 4 participants)

Should be impossible (SERIALIZABLE on every join approve). If it happens:

1. `select count(*) from booking_participants where booking_id = '<id>' and status = 'accepted'`. Confirm > 4.
2. Demote latest accepted participant: `update booking_participants set status='removed' where id = '<latest>'`.
3. Refund that participant's share manually.
4. File incident. Add a test case for the race.

## Rollback

```bash
# On laptop, in the repo:
git checkout <previous-good-sha> -- apps/web
AUTH_SECRET=placeholder pnpm -C apps/web exec next build
rsync -az --delete apps/web/.next/standalone/ root@46.225.157.75:/var/www/feera-web/
rsync -az apps/web/.next/static/ root@46.225.157.75:/var/www/feera-web/apps/web/.next/static/
ssh root@46.225.157.75 "pm2 restart feera-web --update-env"
git checkout HEAD -- apps/web
```

## DB rollback (last resort)

Neon has 7-day PITR on the free tier. Restore via Neon console UI: project > branches > create from history > pick timestamp. Switch the app to the new branch by updating `DATABASE_URL` on the box and `pm2 restart`.

## Escalation

- Meer Feerasta: meerfeerasta@gmail.com (primary)
- Hosting incidents (Hetzner): https://status.hetzner.com
- Neon status: https://neonstatus.com
- Cloudflare: https://www.cloudflarestatus.com
- Stripe: https://status.stripe.com

## Postmortem template

After every incident:

```
# Incident YYYY-MM-DD HH:MM UTC

## Summary
1-2 sentences. What broke, how long, blast radius.

## Timeline
- HH:MM detected (how)
- HH:MM diagnosed (root cause)
- HH:MM mitigated (what fix)
- HH:MM resolved (verified clean)

## Root cause
Plain English. Not "human error" — what made the error possible.

## What went well
Detection speed, runbook usefulness, rollback safety.

## What went badly
Surprises, missing tooling, alert blind spots.

## Action items
- [ ] Specific, assigned, dated.
```

Drop the file in `docs/incidents/YYYY-MM-DD-slug.md`.
