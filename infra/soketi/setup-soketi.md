# Soketi deploy runbook

Target box: Hetzner CPX21 Falkenstein DE `46.225.157.75`.
Hostname for clients: `realtime.feera.ai`.
Protocol: Pusher (WebSocket on 443 + HTTP REST on the same vhost).
Backed by ADR-0007.

> Note: the existing prod box runs PM2-based deploys (ADR-0009 follow-up). Soketi
> still ships in a Docker container because it is self-contained, alpine-small,
> and isolated from the Node toolchain.

## 0. Prereqs

- Docker + docker compose plugin on the box (already installed per Polymath ops).
- Nginx (already running for cards.feerasta.ai / sentinel).
- certbot (`apt install certbot python3-certbot-nginx`).
- DNS A-record: `realtime.feera.ai` -> `46.225.157.75` (set in Cloudflare, proxy OFF so WebSockets work direct).

## 1. Generate secrets

On a workstation (never log into a shared shell history):

```bash
echo "SOKETI_APP_ID=$(openssl rand -hex 16)"
echo "SOKETI_KEY=$(openssl rand -hex 24)"
echo "SOKETI_SECRET=$(openssl rand -hex 32)"
```

Store the three values in 1Password under "Feera infra / soketi prod".

## 2. Copy files to the box

```bash
rsync -avz infra/soketi/docker-compose.yml \
            infra/soketi/realtime.feera.ai.nginx.conf \
            root@46.225.157.75:/srv/soketi/
```

Then on the box, create the env file:

```bash
ssh root@46.225.157.75
mkdir -p /srv/soketi
cd /srv/soketi
cat > .env <<'EOF'
SOKETI_APP_ID=<paste>
SOKETI_KEY=<paste>
SOKETI_SECRET=<paste>
EOF
chmod 600 .env
```

## 3. Bring up Soketi

```bash
cd /srv/soketi
docker compose --env-file .env up -d
docker compose ps
docker compose logs --tail=50 soketi
# Smoke test: REST usage endpoint should respond on localhost.
curl -s http://127.0.0.1:6001/usage
```

## 4. nginx vhost + TLS

```bash
ln -sf /srv/soketi/realtime.feera.ai.nginx.conf \
       /etc/nginx/sites-available/realtime.feera.ai
ln -sf /etc/nginx/sites-available/realtime.feera.ai \
       /etc/nginx/sites-enabled/realtime.feera.ai
nginx -t
certbot --nginx -d realtime.feera.ai \
        --non-interactive --agree-tos -m hello@feera.ai
systemctl reload nginx
```

Verify externally:

```bash
# WebSocket handshake (expects HTTP 101 Switching Protocols).
curl -i -N \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://realtime.feera.ai/app/${SOKETI_KEY}?protocol=7&client=feera-smoke"
```

## 5. Wire app env

Push to the Feera web app's prod env (Doppler / `apps/web/.env.production`):

```
NEXT_PUBLIC_SOKETI_HOST=realtime.feera.ai
NEXT_PUBLIC_SOKETI_PORT=443
NEXT_PUBLIC_SOKETI_KEY=<SOKETI_KEY from above>
SOKETI_APP_ID=<SOKETI_APP_ID>
SOKETI_KEY=<SOKETI_KEY>
SOKETI_SECRET=<SOKETI_SECRET>
SOKETI_HTTP_URL=https://realtime.feera.ai
```

Then `pm2 reload feera-web` to pick up the new env.

## 6. Rollback

```bash
cd /srv/soketi
docker compose down
# Web app falls through to SSE automatically when NEXT_PUBLIC_SOKETI_KEY is unset.
```

## 7. Health check

Add to the daily Hermes briefing once Soketi is live:

```bash
curl -fsS https://realtime.feera.ai/usage > /dev/null || echo "soketi down"
```
