# Storage runbook (Cloudflare R2)

Per ADR-0008 (v2), Feera uses Cloudflare R2 for all blob storage. Zero egress fees, S3-compatible, served via `cdn.feera.ai` custom domain.

## Buckets

| Bucket | Visibility | Custom domain | Purpose |
|---|---|---|---|
| `feera-public` | Public via custom domain | `cdn.feera.ai` | Profile photos, club logos, court photos, coach intro photos |
| `feera-user-private` | Private (signed URLs only, 5-min TTL) | — | Verification documents, chat attachments, match private photos |
| `feera-edition` | Public via custom domain | `cdn-edition.feera.ai` (Phase 2) | Editorial photography, flagship club photos, Journal assets |

## First-time setup (M does this once)

1. **Cloudflare dashboard → R2 → Create bucket** three times for the names above. Use the `WEUR` (Western Europe) jurisdiction for GDPR posture (matches Neon Frankfurt).
2. **Settings → Custom Domains → Connect Domain** for `feera-public`. Enter `cdn.feera.ai`. Cloudflare auto-creates the DNS record + provisions TLS. Same for `feera-edition` → `cdn-edition.feera.ai` when Phase 2 ships.
3. **Settings → CORS Policy** on each bucket. Add an entry:
   ```json
   [
     {
       "AllowedOrigins": [
         "https://www.feera.ai",
         "https://feera.ai",
         "http://localhost:3000"
       ],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["content-type", "cache-control", "x-amz-meta-*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **R2 → Manage R2 API tokens → Create API token**. Permissions: `Object Read & Write` scoped to the 3 Feera buckets. Copy the Access Key ID + Secret + the S3 endpoint URL.
5. Paste into `/srv/feera/.env` on the Hetzner box:
   ```
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_ACCESS_KEY_ID=<from step 4>
   S3_SECRET_ACCESS_KEY=<from step 4>
   S3_BUCKET_PUBLIC=feera-public
   S3_BUCKET_PRIVATE=feera-user-private
   S3_BUCKET_EDITION=feera-edition
   NEXT_PUBLIC_CDN_URL=https://cdn.feera.ai
   ```
6. `ssh root@46.225.157.75 "pm2 restart feera-web --update-env"`.

## Verify

```bash
curl -X POST https://www.feera.ai/api/v1/uploads/sign \
  -H 'content-type: application/json' \
  -d '{"kind":"profile-photo","contentType":"image/png","sizeBytes":1024}'
```

## Content kinds (size + mime allowlist)

| Kind | Bucket | Mime | Max size |
|---|---|---|---:|
| `profile-photo` | public | image/jpeg, image/png, image/webp | 5 MB |
| `club-logo` | public | image/jpeg, image/png, image/webp, image/svg+xml | 2 MB |
| `court-photo` | public | image/jpeg, image/png, image/webp | 8 MB |
| `coach-intro-photo` | public | image/jpeg, image/png, image/webp | 5 MB |
| `verification-doc` | private | application/pdf, image/jpeg, image/png | 25 MB |
| `chat-attachment` | private | image/jpeg, image/png, image/webp, image/gif, application/pdf | 10 MB |
| `match-photo-private` | private | image/jpeg, image/png, image/webp | 8 MB |
| `edition-public` | edition | image/jpeg, image/png, image/webp | 8 MB |
| `edition-editorial` | edition | image/jpeg, image/png, image/webp | 25 MB |
| `edition-flagship-photo` | edition | image/jpeg, image/png, image/webp | 25 MB |

Defined in `packages/storage/src/moderation.ts`.

## R2 quirks

- **No ACL on PutObject.** R2 rejects `x-amz-acl`. Public vs private is set per bucket via custom-domain bind. Adapter strips ACL automatically.
- **Region is `auto`.** R2 has no regional addressing.
- **Path-style addressing required** (`forcePathStyle: true`).
- **Class A operations** (PUT, LIST, DELETE) cost $4.50/M. Negligible at Feera scale.

## Fallback to Hetzner Object Storage

If R2 has an incident (Cloudflare SLA 99.95%):

1. Edit `/srv/feera/.env`:
   ```
   S3_ENDPOINT=https://fsn1.your-objectstorage.com
   S3_REGION=fsn1
   S3_ACCESS_KEY_ID=<hetzner key>
   S3_SECRET_ACCESS_KEY=<hetzner secret>
   ```
2. Swap one import in `apps/web/src/lib/storage/client.ts`: `getR2Storage` → `getHetznerStorage`.
3. `pm2 restart feera-web --update-env`.

Phase 2 adds a runtime `STORAGE_PROVIDER` env flag so the swap is env-only.

## Backups

R2 keeps 7-day object versioning by default if enabled per bucket. Enable in Dashboard → R2 → Bucket → Settings → Object Versioning.

For private bucket (verification docs are legally important), enable versioning + a Lifecycle rule that moves > 1 year old versions to `Infrequent Access` tier.

## Costs

| Phase | Storage | Egress | R2 monthly |
|---|---:|---:|---:|
| Beta (200 users) | 4 GB | 1 GB | $0.06 |
| Phase 2 (5k users) | 75 GB | 50 GB | $1.13 |
| Phase 3 (50k users) | 1 TB | 100 TB | $15 |

Egress is free on R2 forever, so the headline number scales only with stored bytes.

## Migration from Hetzner OS (if photos previously uploaded there)

1. `rclone copy hetzner:feera-public ./tmp-public --transfers=8`
2. `rclone copy ./tmp-public r2:feera-public --transfers=8`
3. Repeat per bucket.
4. SQL one-off to rewrite URL columns:
   ```sql
   update users set profile_photo_url = replace(profile_photo_url, 'fsn1.your-objectstorage.com/feera-public', 'cdn.feera.ai') where profile_photo_url is not null;
   -- repeat for clubs.logo_url, courts.photos jsonb, coaches.verification_documents jsonb
   ```
