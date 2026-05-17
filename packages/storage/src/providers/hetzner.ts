/**
 * Hetzner Object Storage adapter. S3-compatible, region fsn1, endpoint
 * https://fsn1.your-objectstorage.com per ADR-0008.
 *
 * Lazy-init: the S3Client is constructed on first use. Throws a typed error if
 * envs are missing so build-time imports do not crash.
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

export interface HetznerAdapterOptions {
  env?: Partial<StorageEnv>;
  /** Override for tests. Injects a pre-built S3Client (e.g. aws-sdk-client-mock). */
  client?: S3Client;
}

export class HetznerStorageAdapter implements StorageProvider {
  readonly name = 'hetzner' as const;
  private _client: S3Client | null;
  private readonly env: StorageEnv;

  constructor(opts: HetznerAdapterOptions = {}) {
    this.env = resolveEnv(opts.env);
    this._client = opts.client ?? null;
  }

  private get client(): S3Client {
    if (this._client) return this._client;
    if (!this.env.accessKeyId || !this.env.secretAccessKey) {
      throw new Error(
        '[storage/hetzner] S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set.',
      );
    }
    this._client = new S3Client({
      endpoint: this.env.endpoint,
      region: this.env.region,
      // Hetzner uses path-style addressing.
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
    const acl = opts.acl ?? (bucket === 'feera-user-private' ? 'private' : 'public-read');
    const cacheControl =
      opts.cacheControl ?? (acl === 'public-read' ? PUBLIC_CACHE_CONTROL : undefined);

    const out = await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        ACL: acl,
        CacheControl: cacheControl,
        Metadata: opts.custom ? { ...opts.custom } : undefined,
      }),
    );
    return {
      key,
      bucket,
      etag: out.ETag ?? undefined,
      publicUrl: acl === 'public-read' ? this.publicUrl(bucket, key) : undefined,
    };
  }

  async get(bucket: BucketName, key: string): Promise<GetResult> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = out.Body
      ? new Uint8Array(await (out.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray())
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
    const acl = input.acl ?? (input.bucket === 'feera-user-private' ? 'private' : 'public-read');
    const cacheControl =
      input.cacheControl ?? (acl === 'public-read' ? PUBLIC_CACHE_CONTROL : undefined);

    const cmd = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ACL: acl,
      CacheControl: cacheControl,
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: ttl });

    // Headers the client MUST set so the signature matches.
    const headers: Record<string, string> = {
      'content-type': input.contentType,
      'x-amz-acl': acl,
    };
    if (cacheControl) headers['cache-control'] = cacheControl;

    return {
      uploadUrl,
      key: input.key,
      bucket: input.bucket,
      headers,
      publicUrl: acl === 'public-read' ? this.publicUrl(input.bucket, input.key) : undefined,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  async createPresignedReadUrl(input: PresignedReadInput): Promise<string> {
    const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const cmd = new GetObjectCommand({ Bucket: input.bucket, Key: input.key });
    return getSignedUrl(this.client, cmd, { expiresIn: ttl });
  }

  publicUrl(bucket: BucketName, key: string): string {
    if (bucket === this.env.buckets.public) {
      // CDN-fronted for the main public bucket.
      return `${this.env.publicCdnUrl.replace(/\/$/, '')}/${encodeKey(key)}`;
    }
    // Edition uses its own bucket but is also publicly readable. Until a
    // dedicated CDN host is provisioned for it, point at the origin.
    return `${this.env.endpoint.replace(/\/$/, '')}/${bucket}/${encodeKey(key)}`;
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function resolveEnv(overrides?: Partial<StorageEnv>): StorageEnv {
  const env: StorageEnv = {
    endpoint: overrides?.endpoint ?? process.env.S3_ENDPOINT ?? 'https://fsn1.your-objectstorage.com',
    region: overrides?.region ?? process.env.S3_REGION ?? 'fsn1',
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
let _instance: HetznerStorageAdapter | null = null;
export function getHetznerStorage(): HetznerStorageAdapter {
  if (!_instance) _instance = new HetznerStorageAdapter();
  return _instance;
}

/** Reset the singleton, primarily for tests. */
export function resetHetznerStorage(): void {
  _instance = null;
}
