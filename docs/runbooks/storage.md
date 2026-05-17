# Storage runbook: Hetzner Object Storage

Source of truth: ADR-0008. Adapter: `packages/storage`. Front-end CDN: Cloudflare → `cdn.feera.ai`.

## Buckets

Three buckets live in the Hetzner FSN1 (Falkenstein) region:

| Bucket | ACL | Notes |
| --- | --- | --- |
| `feera-public` | public-read | Profile photos, club logos, court photos, coach intro photos, marketing assets. Fronted by `cdn.feera.ai`. |
| `feera-user-private` | private | Verification docs, chat attachments, private match photos. Signed-URL only, 5-min TTL by default. |
| `feera-edition` | public-read | Editorial photography for `/edition`. Public-read but served via Cloudflare with longer cache. |

## First-time provisioning

1. **Create the API token.** In Hetzner Console → Object Storage → Credentials, create a token named `feera-app` (separate from any operator token). Copy the access key + secret into the Hetzner box `~/.env.production` and into your local `.env.local`.
2. **Create the buckets.** Hetzner Console → Object Storage → Create Bucket. Repeat three times with the names above. Region: Falkenstein (`fsn1`). Set `feera-public` and `feera-edition` to "Public Read"; leave `feera-user-private` as "Private".
3. **Apply CORS and run the smoke test:**
   ```sh
   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
     node packages/storage/scripts/setup-buckets.mjs
   ```
   Expected output: `[ok] CORS applied` and `[ok] read+write smoke passed` for each bucket.
4. **Cloudflare CDN.** DNS for `cdn.feera.ai` should already CNAME to `feera-public.fsn1.your-objectstorage.com` per ADR-0008. Verify with `dig cdn.feera.ai`. If missing, add a CNAME record proxied through Cloudflare and create a Cache Rule: hostname equals `cdn.feera.ai` → set Edge Cache TTL 1 year, Browser TTL 1 year.

## CORS

The setup script writes this CORS document to every bucket:

```json
{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://www.feera.ai",
      "https://feera.ai",
      "https://staging.feera.ai",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "x-amz-meta-*"],
    "MaxAgeSeconds": 3600
  }]
}
```

Add a new origin by editing `ALLOWED_ORIGINS` in `packages/storage/scripts/setup-buckets.mjs`, re-running the script. CORS replaces, it does not merge.

## Rotation

Per ADR posture, rotate the `feera-app` access key quarterly:

1. Create a new token in Hetzner Console.
2. Update the env on the Hetzner box and in CI (`DEPLOY_SSH_HOST` + GitHub Actions secrets).
3. Roll the web container (`bash infra/deploy.sh web`).
4. Wait 15 minutes, then delete the old token.

## On-call: signed URL fails with 403

1. Check clock skew on the requesting box: `date -u` should be within 5 minutes of UTC. Most signature failures are time drift.
2. Verify the env vars: `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` match the token in Hetzner Console.
3. Re-run the smoke script to confirm the credentials work at all.
4. Check that the bucket ACL has not been flipped to private (would make publicUrl 403 even though the signed URL still works).

## On-call: uploads succeed but the photo never appears

1. The `/api/v1/uploads/confirm` route did not run, or the column write failed. Check Sentry for `[api/v1/uploads/confirm]`.
2. The Cloudflare cache is stale. Purge `cdn.feera.ai/<key>` via Cloudflare API.
