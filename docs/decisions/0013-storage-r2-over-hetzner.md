# 0013. Storage: Cloudflare R2 (formalised swap from Hetzner OS)

- Status: accepted
- Date: 2026-05-18
- Deciders: M, Claude
- Tags: storage, cost
- Supersedes: ADR-0008 v1 (Hetzner Object Storage)

## Context

ADR-0008 originally chose Hetzner Object Storage (FSN1) for blob storage. Two days into production we re-ran the cost math at projected Phase-3 scale and found the egress numbers swing the decision.

## Cost projection at Phase-3 (50k users, ~100 TB egress/mo from photo views)

| Provider | Storage 1 TB | Egress 100 TB | Total |
|---|---:|---:|---:|
| Cloudflare R2 | $15 | **$0** | **$15/mo** |
| Hetzner Object Storage | $5 | $100 | $105/mo |
| AWS S3 (eu-central-1) | $23 | $9,000 | $9,230/mo |

R2 wins on egress (free forever) and tied on storage. Hetzner OS made sense before R2's free-egress tier matured; now it doesn't.

## Decision

Adopt **Cloudflare R2 as the default storage provider** for all three buckets (`feera-public`, `feera-user-private`, `feera-edition`). Keep the Hetzner adapter (`packages/storage/src/providers/hetzner.ts`) available as a runtime swap for regional residency edge cases (Saudi PDPL may want in-region origin storage in Phase 2-3).

Implementation: `packages/storage/src/providers/r2.ts` is the new default. `getStorage()` resolves to it. Existing call sites unchanged.

## Migration path (zero code change for callers)

1. M creates 3 R2 buckets in Cloudflare dashboard (`WEUR` jurisdiction for GDPR posture).
2. M attaches `cdn.feera.ai` to `feera-public` via Cloudflare custom-domain bind.
3. M generates R2 API token, pastes into `/srv/feera/.env` (`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, region `auto`).
4. `pm2 restart feera-web --update-env`.

Documented in `docs/runbooks/storage.md`.

## R2-specific gotchas (handled in the adapter)

- **No ACL parameter on PutObject.** R2 rejects `x-amz-acl`. Bucket-level public/private is set via custom-domain binding. The adapter strips ACL before the SDK call.
- **Region is `auto`.** R2 has no regional addressing.
- **Path-style addressing required** (`forcePathStyle: true`).
- **Class A operations** (PUT, LIST, DELETE) cost $4.50/M. Negligible at Feera scale (<$1/mo even at Phase 3).
- **Custom domain TLS is auto-provisioned** by Cloudflare. No certbot dance.

## Consequences

- Positive: storage cost stays flat as we grow (it scales with stored bytes, not view volume).
- Positive: one fewer vendor (Cloudflare already runs our DNS, CDN, and now storage).
- Positive: Cloudflare's `Cache-Reserve` and per-object cache rules become available for further egress reduction.
- Negative: R2 is younger than Hetzner OS (GA 2022 vs 2024 respectively for the modern Hetzner version), so SLA experience over multi-year time-horizons is shorter. Mitigation: Hetzner adapter retained as warm fallback.
- Follow-up: Phase 2 wires a runtime `STORAGE_PROVIDER` env flag so the swap is config-only without a code change. Today it's a one-line import swap in `apps/web/src/lib/storage/client.ts`.

## What this does not change

- The `StorageProvider` interface is unchanged. Tests covered.
- Bucket names + content-kind routing unchanged.
- Signed-URL TTL (5 min) unchanged.
- Mime + size allowlists unchanged.
- `cdn.feera.ai` URL surface unchanged (Cloudflare binds the same host to R2 instead of nginx-proxy-to-Hetzner).
