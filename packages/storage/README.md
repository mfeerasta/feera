# @feera/storage

S3-compatible object storage adapter. Default provider is Hetzner Object Storage (FSN1) per ADR-0008.

## Buckets

| Bucket | ACL | Served via | Used for |
| --- | --- | --- | --- |
| `feera-public` | public-read | cdn.feera.ai (Cloudflare) | profile-photo, club-logo, court-photo, coach-intro-photo, edition-public |
| `feera-user-private` | private | signed URLs, 5 min TTL | verification-doc, chat-attachment, match-photo-private |
| `feera-edition` | public-read | Cloudflare with longer cache | edition-editorial, edition-flagship-photo |

## Usage

```ts
import { createPresignedUploadUrl } from '@feera/storage';

const r = await createPresignedUploadUrl({
  kind: 'profile-photo',
  userId: session.userId,
  contentType: 'image/jpeg',
  sizeBytes: file.size,
  filename: file.name,
});

if (!r.ok) {
  // r.error.code is 'mime_not_allowed' | 'too_large' | 'invalid_kind'
  throw new Error(r.error.message);
}

// Hand uploadUrl + headers to the browser. The browser PUTs the file directly
// to Hetzner, bypassing the Next.js server.
return r.upload;
```

## Bucket provisioning

Buckets are created in the Hetzner Console (S3 CreateBucket via the SDK works but the ACL surface is partial). See `docs/runbooks/storage.md` for the click-path. Once buckets exist:

```sh
S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
  node packages/storage/scripts/setup-buckets.mjs
```

Applies CORS rules for the four allowed origins (`https://www.feera.ai`, `https://feera.ai`, `https://staging.feera.ai`, `http://localhost:3000`) and runs a read+write smoke against each bucket.

## Environment

```
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_REGION=fsn1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_PUBLIC=feera-public
S3_BUCKET_PRIVATE=feera-user-private
S3_BUCKET_EDITION=feera-edition
NEXT_PUBLIC_CDN_URL=https://cdn.feera.ai
```

Run `pnpm -C packages/storage test` to verify.
