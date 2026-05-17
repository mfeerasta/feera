# 0008. Object storage: Hetzner Object Storage + Cloudflare CDN

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: storage, media

## Context

Supabase Storage is out (ADR-0005). Feera needs blob storage for:

- Profile photos (privacy-aware ACLs).
- Club logos + photos.
- Match photos shared in chat (privacy-aware).
- Coach intro videos + verification documents (private).
- Tournament hero images.
- Edition editorial photography.

EU residency for GDPR. Cheap egress for image-heavy UX.

## Options considered

### Option A: Hetzner Object Storage (S3-compatible, FRA/HEL)
S3 API → use `@aws-sdk/client-s3` directly. EU regions. €5/TB/month storage, €1/TB egress. New service (GA 2024) but growing fast.

### Option B: Cloudflare R2
Zero egress fees. S3-compatible. Global. Lock-in to Cloudflare account already in use for `feerasta.ai` DNS.

### Option C: MinIO self-hosted on the Hetzner box
Zero per-object cost. But: disk space on a single CPX21 caps quickly; backups + replication on us.

### Option D: AWS S3 (eu-central-1)
Most mature. Egress is the killer ($0.09/GB → expensive for image-heavy product).

## Decision

**Hetzner Object Storage (FSN1, Falkenstein)** as the primary store, fronted by **Cloudflare** as the CDN cache.

## Implementation

- `packages/storage` (new in M3) exposes a `StorageProvider` interface with `put`, `get`, `getSignedUrl`, `delete`, `list`.
- Default impl talks to Hetzner via `@aws-sdk/client-s3`, region `fsn1`, endpoint `https://fsn1.your-objectstorage.com`.
- Buckets:
  - `feera-public` (profile, club logos, marketing) — public read.
  - `feera-user-private` (chat attachments, coach docs) — signed URLs only, 5-min TTL.
  - `feera-edition` (editorial assets) — public read, served behind Cloudflare with custom cache rules.
- Cloudflare worker / cache rules:
  - `cdn.feera.ai/*` → origin `https://feera-public.fsn1.your-objectstorage.com/*` with `Cache-Control: public, max-age=31536000, immutable`.
- Image variants via `next/image` (Next.js handles AVIF/WebP optimisation on first request, caches on Cloudflare). For mobile we deliver pre-sized variants via a `?w=` query param the storage proxy worker resizes on demand.

## Consequences

- Positive: EU-native, S3-compatible, cheap.
- Positive: Cloudflare zero-egress for served files = bandwidth bill stays flat as we scale.
- Negative: signed-URL workflow is more friction than Supabase Storage's RLS. Mitigation: a helper in `packages/storage` makes it a one-liner.
- Follow-up: revisit Cloudflare R2 in Phase 2 if Hetzner Object Storage hits any sharp edges.
