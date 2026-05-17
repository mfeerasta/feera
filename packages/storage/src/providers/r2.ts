/**
 * Cloudflare R2 adapter. S3-compatible at `https://<account-id>.r2.cloudflarestorage.com`.
 * Region = `auto` (R2 has no regional addressing).
 *
 * Public access: R2 buckets are private by default. Make them public by attaching
 * a custom domain in the Cloudflare dashboard (e.g. cdn.feera.ai). DO NOT pass the
 * S3 ACL parameter — R2 rejects it.
 *
 * Egress: free (this is why we chose R2 over Hetzner OS — see ADR-0008).
 *
 * Lazy-init: the S3Client is constructed on first use. Throws if envs are missing.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  BucketName,
  GetResult,
  ListItem,
  PresignedReadInput,
  PresignedUpload,
  PresignedUploadInput,
  PutOpts,
  PutResult,
  StorageEnv,
  StorageProvider,
} from '../types';

const DEFAULT_TTL_SECONDS = 300;
const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export interface R2AdapterOptions {
  env?: Partial<StorageEnv>;
  /** Override for tests (e.g. aws-sdk-client-mock). */
  client?: S3Client;
}

export class R2StorageAdapter implements StorageProvider {
  readonly name = 'r2' as const;
  private _client: S3Client | null;
  private readonly env: StorageEnv;

  constructor(opts: R2AdapterOptions = {}) {
    this.env = resolveEnv(opts.env);
    this._client = opts.client ?? null;
  }

  private get client(): S3Client {
    if (this._client) return this._client;
    if (!this.env.accessKeyId || !this.env.secretAccessKey) {
      throw new Error(
        '[storage/r2] S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set.',
      );
    }
    if (!this.env.endpoint) {
      throw new Error(
        '[storage/r2] S3_ENDPOINT must point at https://<account-id>.r2.cloudflarestorage.com',
      );
    }
    this._client = new S3Client({
      endpoint: this.env.endpoint,
      region: this.env.region,
      // R2 + Cloudflare endpoints want path-style addressing.
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.env.accessKeyId,
        secretAccessKey: this.env.secretAccessKey,
      },
    });
    return this._client;
  }

  async put(
    bucket: BucketName,
    key: string,
    body: Buffer | Uint8Array,
    opts: PutOpts = {},
  ): Promise<PutResult> {
    // R2 does NOT accept the ACL header. Public-vs-private is decided per
    // bucket via the Cloudflare dashboard custom-domain bind (we expose the
    // public bucket at cdn.feera.ai).
    const isPublic = bucket !== this.env.buckets.private;
    const cacheControl =
      opts.cacheControl ?? (isPublic ? PUBLIC_CACHE_CONTROL : undefined);

    const out = await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        CacheControl: cacheControl,
        Metadata: opts.custom ? { ...opts.custom } : undefined,
      }),
    );
    return {
      key,
      bucket,
      etag: out.ETag ?? undefined,
      publicUrl: isPublic ? this.publicUrl(bucket, key) : undefined,
    };
  }

  async get(bucket: BucketName, key: string): Promise<GetResult> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = out.Body
      ? new Uint8Array(
          await (out.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray(),
        )
      : new Uint8Array();
    return {
      body,
      contentType: out.ContentType ?? undefined,
      sizeBytes: typeof out.ContentLength === 'number' ? out.ContentLength : undefined,
      etag: out.ETag ?? undefined,
      lastModified: out.LastModified ?? undefined,
    };
  }

  async head(bucket: BucketName, key: string) {
    const out = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      contentType: out.ContentType ?? undefined,
      sizeBytes: typeof out.ContentLength === 'number' ? out.ContentLength : undefined,
      etag: out.ETag ?? undefined,
      lastModified: out.LastModified ?? undefined,
    };
  }

  async delete(bucket: BucketName, key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async list(bucket: BucketName, prefix?: string, limit = 1000): Promise<ListItem[]> {
    const out = await this.client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: limit }),
    );
    return (out.Contents ?? []).map((c) => ({
      key: c.Key ?? '',
      sizeBytes: typeof c.Size === 'number' ? c.Size : 0,
      lastModified: c.LastModified ?? new Date(0),
      etag: c.ETag ?? undefined,
    }));
  }

  async createPresignedUploadUrl(input: PresignedUploadInput): Promise<PresignedUpload> {
    const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const isPublic = input.bucket !== this.env.buckets.private;
    const cacheControl =
      input.cacheControl ?? (isPublic ? PUBLIC_CACHE_CONTROL : undefined);

    const cmd = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType,
      CacheControl: cacheControl,
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: ttl });

    // Headers the client MUST set so the signature matches.
    const headers: Record<string, string> = {
      'content-type': input.contentType,
    };
    if (cacheControl) headers['cache-control'] = cacheControl;

    return {
      uploadUrl,
      key: input.key,
      bucket: input.bucket,
      headers,
      publicUrl: isPublic ? this.publicUrl(input.bucket, input.key) : undefined,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  async createPresignedReadUrl(input: PresignedReadInput): Promise<string> {
    const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const cmd = new GetObjectCommand({ Bucket: input.bucket, Key: input.key });
    return getSignedUrl(this.client, cmd, { expiresIn: ttl });
  }

  publicUrl(bucket: BucketName, key: string): string {
    // Public bucket fronted by Cloudflare CDN at cdn.feera.ai. Other public
    // buckets (e.g. edition) get their own custom domain in Phase 2; for now
    // fall through to the public R2 dev URL.
    if (bucket === this.env.buckets.public) {
      return `${this.env.publicCdnUrl.replace(/\/$/, '')}/${encodeKey(key)}`;
    }
    return `${this.env.endpoint.replace(/\/$/, '')}/${bucket}/${encodeKey(key)}`;
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function resolveEnv(overrides?: Partial<StorageEnv>): StorageEnv {
  const env: StorageEnv = {
    endpoint: overrides?.endpoint ?? process.env.S3_ENDPOINT ?? '',
    region: overrides?.region ?? process.env.S3_REGION ?? 'auto',
    accessKeyId: overrides?.accessKeyId ?? process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: overrides?.secretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY ?? '',
    publicCdnUrl: overrides?.publicCdnUrl ?? process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.feera.ai',
    buckets: overrides?.buckets ?? {
      public: (process.env.S3_BUCKET_PUBLIC ?? 'feera-public') as BucketName,
      private: (process.env.S3_BUCKET_PRIVATE ?? 'feera-user-private') as BucketName,
      edition: (process.env.S3_BUCKET_EDITION ?? 'feera-edition') as BucketName,
    },
  };
  return env;
}

/** Process-wide singleton, lazily constructed. */
let _instance: R2StorageAdapter | null = null;
export function getR2Storage(): R2StorageAdapter {
  if (!_instance) _instance = new R2StorageAdapter();
  return _instance;
}

/** Reset the singleton, primarily for tests. */
export function resetR2Storage(): void {
  _instance = null;
}
