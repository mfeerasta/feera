# 0009. Hosting: Hetzner Docker Compose + Caddy

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: infra, deploy

## Context

M wants to host on Hetzner. Existing Falkenstein DE box `46.225.157.75` (Guard-Patrol, CPX21 3vCPU/4GB/80GB) already runs Polymath, cards.feerasta.ai, sentinel, hermes, and a card-discounts scrape pipeline. We need a deploy story that matches that footprint without breaking what's there.

## Options considered

### Option A: Docker Compose + Caddy on the existing CPX21
Pros:
- Same ops model as Polymath. Same nginx-style fronting (Caddy = auto-TLS).
- No PaaS layer to learn.
- Zero added monthly cost until we add a dedicated Feera box.

Cons:
- Single box. Outage = total. Acceptable for closed beta (200 users); upgrade to second box in Phase 2.
- Hand-rolled CI deploys.

### Option B: Coolify / Dokploy (self-hosted PaaS on Hetzner)
Pros:
- Git push → deploy. Preview environments. Built-in Postgres + Redis + Soketi templates.
- Web UI to babysit deploys.

Cons:
- Extra layer of abstraction; another thing to upgrade and break.
- Coolify v4 changed a lot recently; rough edges in 2026.

### Option C: New dedicated Hetzner box for Feera
Pros: blast radius isolation from Polymath + cards.
Cons: €15/mo earlier than we need it. Phase 2 decision.

### Option D: Hetzner Cloud Apps (managed)
Beta as of 2026. Not feature-complete. Skip.

## Decision

**Docker Compose + Caddy on the existing CPX21 `46.225.157.75`** for Phase 1. Migrate to a dedicated CPX31 (4vCPU/8GB) before the closed beta if load testing shows contention.

Defer Coolify until we have 3+ services and `git push` deploys become the daily pain.

## Implementation

Repo layout:

```
infra/
  docker-compose.yml         # web + admin + soketi + workers + caddy
  Caddyfile                  # TLS via Let's Encrypt, reverse proxy per app
  Dockerfile.web             # multi-stage Next 16 standalone build
  Dockerfile.workers         # Node 22 + the workers entrypoint
  deploy.sh                  # rsync + docker compose up -d on the box
  rollback.sh                # docker compose tag revert
  .env.production.example
```

Deploy flow:

1. CI builds Docker images, pushes to GHCR (`ghcr.io/feerasta-ai/feera-web:<sha>`).
2. `deploy.sh` SSHs to the box, pulls the new image, runs `docker compose up -d`.
3. Caddy reloads gracefully (zero downtime, health check on `/api/health`).
4. Run `drizzle-kit migrate` against Neon in a one-shot job before flipping traffic.

Caddyfile sketch:

```
feera.ai, www.feera.ai {
  encode zstd gzip
  reverse_proxy web:3000
}

admin.feera.ai {
  encode zstd gzip
  reverse_proxy admin:3001
}

realtime.feera.ai {
  reverse_proxy soketi:6001
}

cdn.feera.ai {
  reverse_proxy https://feera-public.fsn1.your-objectstorage.com {
    header_up Host {upstream_hostport}
  }
}
```

## Consequences

- Positive: no managed-platform bill. Full control.
- Positive: matches existing ops on Guard-Patrol → one runbook covers everything on that box.
- Negative: single point of failure for Phase 1. Mitigation: nightly Neon backups (free tier covers 7d PITR), Hetzner snapshots weekly.
- Negative: zero preview-deploy URLs out of the box. Mitigation: spin up preview Neon branch per PR + locally run web (or a tiny separate `preview.feera.ai` Caddy host).
- Follow-up: ADR-00NN in Phase 2 if Coolify or Kamal pulls ahead.
