# Feera infrastructure

Production target (Phase 1): single Hetzner CPX21 in Falkenstein DE (`46.225.157.75`, hostname `Guard-Patrol`). Same box as `cards.feerasta.ai`, `polymath`, `hermes`. Docker Compose front, Caddy edge.

## Files

- `docker-compose.yml` — services: `web`, `admin`, `soketi`, `workers`, `caddy`.
- `Caddyfile` — TLS auto-issued by Let's Encrypt. Reverse proxy per app.
- `Dockerfile.web` — multi-stage Next 16 standalone build.
- `Dockerfile.workers` — Node 22 + workers entrypoint.
- `deploy.sh` — pull latest image tag on the box and `docker compose up -d`.
- `rollback.sh` — flip the active tag back, restart.
- `.env.production.example` — full env template for the production compose stack.

## Phase 2 trigger points

Migrate to a dedicated CPX31 (or CPX41) once any of:

- p95 web TTFB > 400ms sustained for a week.
- Polymath + Feera contend on CPU (cgroup throttling visible in `docker stats`).
- A regulatory ask requires Feera-only data residency.

## Phase 2 stretch (Coolify / Kamal)

Reconsider Coolify or Kamal once we have 3+ services beyond web/admin/workers/soketi and `git push` deploys become the daily pain. Until then plain Docker Compose stays in.
