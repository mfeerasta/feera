# Deployment runbook

Production lives on `46.225.157.75` (Hetzner Falkenstein DE, hostname `Guard-Patrol`). Multi-tenant box, shared with cards, polymath, sentinel, hermes, otp-webhook, sixth, etc.

Phase 1 deploy method: PM2 + nginx (matches neighbour pattern). Caddy + Docker Compose (ADR-0009) is the target end state, cut over once 3+ Feera services live there.

## Live services

| Service | Path | Port | nginx site | PM2 name | TLS |
|---|---|---:|---|---|---|
| Web | `/var/www/feera-web/` | `3010` | `feera-web.conf` | `feera-web` | Let's Encrypt for `www.feera.ai` (expires 2026-08-15) |
| Admin | (TBD M2) | `3011` | (TBD) | (TBD) | — |
| Workers | (TBD M3) | — | n/a | `feera-workers` | — |
| Soketi | (TBD M4) | `6001` | `feera-realtime.conf` | (docker) | — |

## Web deploy (manual, M1)

From your laptop, in the repo root:

```bash
# 1. Build
rm -rf apps/web/.next
pnpm -C apps/web exec next build

# 2. Upload standalone bundle + static assets
rsync -az --delete apps/web/.next/standalone/ root@46.225.157.75:/var/www/feera-web/
rsync -az apps/web/.next/static/ \
  root@46.225.157.75:/var/www/feera-web/apps/web/.next/static/

# 3. Restart PM2
ssh root@46.225.157.75 "pm2 restart feera-web --update-env"

# 4. Verify
curl -sSI https://www.feera.ai | head -5
curl -sS https://www.feera.ai/api/health
```

A scripted version lives at `infra/deploy.sh` and assumes the future Docker pipeline; do not run it yet on the live PM2 box.

## First-time setup (already done for `feera-web`)

For reference if a new service is added:

```bash
ssh root@46.225.157.75
mkdir -p /var/www/<svc>
# Pick a free port. Existing reservations (May 2026):
#   3001, 3002, 3010 (feera-web), 3100, 3101, 8080, 8081
cat > /etc/nginx/sites-available/<svc>.conf << 'EOF'
server {
  listen 80;
  listen [::]:80;
  server_name <subdomain>.feera.ai;
  client_max_body_size 16M;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  location /_next/static/ {
    proxy_pass http://127.0.0.1:<port>;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location / {
    proxy_pass http://127.0.0.1:<port>;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}
EOF
ln -sf /etc/nginx/sites-available/<svc>.conf /etc/nginx/sites-enabled/<svc>.conf
nginx -t && systemctl reload nginx
# After DNS A record propagates:
certbot --nginx -d <subdomain>.feera.ai --non-interactive --agree-tos -m meerfeerasta@gmail.com --redirect
```

## Rollback

PM2 keeps the last running JS in memory; rollback = redeploy previous standalone bundle.

```bash
# On laptop:
git checkout <previous-good-sha> -- apps/web
pnpm -C apps/web exec next build
rsync -az --delete apps/web/.next/standalone/ root@46.225.157.75:/var/www/feera-web/
rsync -az apps/web/.next/static/ root@46.225.157.75:/var/www/feera-web/apps/web/.next/static/
ssh root@46.225.157.75 "pm2 restart feera-web"
git checkout HEAD -- apps/web   # restore working tree
```

If nginx broke after a config edit, before anything else:

```bash
ssh root@46.225.157.75 "nginx -t"
# If syntax error, revert /etc/nginx/sites-available/feera-web.conf, then:
ssh root@46.225.157.75 "systemctl reload nginx"
```

Never `systemctl restart nginx` without a passing `nginx -t` first; the box hosts 12+ tenants.

## Health checks

- `https://www.feera.ai/api/health` → `{"ok":true,"service":"feera-web","ts":"..."}`
- `pm2 status feera-web` on the box → `online`, `restarts` increasing only on intentional redeploy.
- `journalctl -u nginx --since "5 min ago"` for proxy errors.

## DNS (Cloudflare → feera.ai zone)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `www` | `46.225.157.75` | grey (DNS only) until cert renews are stable, then orange |
| A | `@` | `46.225.157.75` | grey, then orange (pending M as of 2026-05-17) |
| A | `admin` | `46.225.157.75` | grey (added in M2 when admin service splits) |
| A | `realtime` | `46.225.157.75` | grey (added in M4 when Soketi container ships) |
| A | `cdn` | `46.225.157.75` | orange (always proxied for caching) |
| TXT | `_acme-challenge` | (auto-managed by certbot via HTTP-01) | — |

After adding apex A record (`@`), expand the cert:

```bash
ssh root@46.225.157.75 "certbot --nginx --expand -d www.feera.ai -d feera.ai --non-interactive --agree-tos -m meerfeerasta@gmail.com"
```

Cert auto-renews via the certbot systemd timer (`systemctl status certbot.timer`).

## Box neighbours (do not touch)

Cohabitants on `46.225.157.75`:
- `cards.feerasta.ai` (static under `/var/www/cards/`)
- `polymath.feerasta.ai` (port 3300)
- sentinel multi-app cluster
- `otp-webhook`, `polybot`, `sixth`, `haazri`, `daystracker` (various ports)
- hermes daemon (`/root/hermes/`)

Rule: NEVER touch `nginx.conf`, never edit other apps' `/etc/nginx/sites-enabled/*.conf`, never `rm` outside `/var/www/feera-web/`.
