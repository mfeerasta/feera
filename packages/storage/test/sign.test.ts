/**
 * Storage adapter tests. Use aws-sdk-client-mock to intercept S3 calls so the
 * suite runs offline. The real provider is exercised by the bucket-setup
 * runbook and the `storage-smoke` GitHub workflow.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  HetznerStorageAdapter,
  bucketForKind,
  aclForKind,
  validateUpload,
  createPresignedUploadUrl,
  ALL_CONTENT_KINDS,
} from '../src/index';

const TEST_ENV = {
  endpoint: 'https://fsn1.your-objectstorage.com',
  region: 'fsn1',
  accessKeyId: 'TEST_KEY',
  secretAccessKey: 'TEST_SECRET',
  publicCdnUrl: 'https://cdn.feera.ai',
  buckets: {
    public: 'feera-public' as const,
    private: 'feera-user-private' as const,
    edition: 'feera-edition' as const,
  },
};

describe('bucketForKind router', () => {
  it('routes public kinds to feera-public', () => {
    expect(bucketForKind('profile-photo')).toBe('feera-public');
    expect(bucketForKind('club-logo')).toBe('feera-public');
    expect(bucketForKind('court-photo')).toBe('feera-public');
    expect(bucketForKind('coach-intro-photo')).toBe('feera-public');
    expect(bucketForKind('edition-public')).toBe('feera-public');
  });

  it('routes sensitive kinds to feera-user-private', () => {
    expect(bucketForKind('verification-doc')).toBe('feera-user-private');
    expect(bucketForKind('chat-attachment')).toBe('feera-user-private');
    expect(bucketForKind('match-photo-private')).toBe('feera-user-private');
  });

  it('routes editorial kinds to feera-edition', () => {
    expect(bucketForKind('edition-editorial')).toBe('feera-edition');
    expect(bucketForKind('edition-flagship-photo')).toBe('feera-edition');
  });

  it('assigns private ACL to private kinds, public-read otherwise', () => {
    expect(aclForKind('verification-doc')).toBe('private');
    expect(aclForKind('chat-attachment')).toBe('private');
    expect(aclForKind('profile-photo')).toBe('public-read');
    expect(aclForKind('edition-editorial')).toBe('public-read');
  });

  it('covers every declared ContentKind', () => {
    for (const k of ALL_CONTENT_KINDS) {
      expect(bucketForKind(k)).toBeTruthy();
      expect(aclForKind(k)).toBeTruthy();
    }
  });
});

describe('validateUpload', () => {
  it('rejects wrong mime type for profile-photo', () => {
    const r = validateUpload('profile-photo', 'application/pdf', 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('mime_not_allowed');
  });

  it('rejects oversize chat-attachment', () => {
    const r = validateUpload('chat-attachment', 'image/jpeg', 50 * 1024 * 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too_large');
  });

  it('accepts valid profile-photo', () => {
    expect(validateUpload('profile-photo', 'image/jpeg', 200_000).ok).toBe(true);
  });

  it('accepts valid PDF verification doc', () => {
    expect(validateUpload('verification-doc', 'application/pdf', 1_000_000).ok).toBe(true);
  });

  it('rejects zero or negative sizes', () => {
    expect(validateUpload('profile-photo', 'image/png', 0).ok).toBe(false);
    expect(validateUpload('profile-photo', 'image/png', -10).ok).toBe(false);
  });
});

describe('HetznerStorageAdapter with mocked S3', () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    s3Mock.reset();
  });

  afterEach(() => {
    s3Mock.reset();
  });

  it('PUT routes through PutObjectCommand and returns a CDN URL for public-read', async () => {
    s3Mock.on(PutObjectCommand).resolves({ ETag: '"abc123"' });
    const adapter = new HetznerStorageAdapter({
      env: TEST_ENV,
      client: new S3Client({
        region: 'fsn1',
        endpoint: 'https://fsn1.your-objectstorage.com',
        forcePathStyle: true,
        credentials: { accessKeyId: 'TEST_KEY', secretAccessKey: 'TEST_SECRET' },
      }),
    });
    const res = await adapter.put(
      'feera-public',
      'profile-photo/u1/abc.jpg',
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/jpeg', acl: 'public-read' },
    );
    expect(res.bucket).toBe('feera-public');
    expect(res.key).toBe('profile-photo/u1/abc.jpg');
    expect(res.etag).toBe('"abc123"');
    expect(res.publicUrl).toBe('https://cdn.feera.ai/profile-photo/u1/abc.jpg');
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args[0].input.Bucket).toBe('feera-public');
    expect(calls[0]?.args[0].input.ACL).toBe('public-read');
  });

  it('createPresignedUploadUrl returns a usable URL and the headers the client must send', async () => {
    // Note: getSignedUrl signs locally with the provided credentials, so no
    // network call hits the mock. We just assert URL shape + headers.
    const adapter = new HetznerStorageAdapter({ env: TEST_ENV });
    const result = await adapter.createPresignedUploadUrl({
      bucket: 'feera-public',
      key: 'profile-photo/u1/abc.jpg',
      contentType: 'image/jpeg',
      maxBytes: 500_000,
      ttlSeconds: 300,
      acl: 'public-read',
    });
    expect(result.uploadUrl).toMatch(/^https:\/\/fsn1\.your-objectstorage\.com\/feera-public\/profile-photo\/u1\/abc\.jpg\?/u);
    expect(result.uploadUrl).toContain('X-Amz-Signature=');
    expect(result.uploadUrl).toContain('X-Amz-Expires=300');
    expect(result.headers['content-type']).toBe('image/jpeg');
    expect(result.headers['x-amz-acl']).toBe('public-read');
    expect(result.publicUrl).toBe('https://cdn.feera.ai/profile-photo/u1/abc.jpg');
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('createPresignedReadUrl signs a GET for the private bucket', async () => {
    const adapter = new HetznerStorageAdapter({ env: TEST_ENV });
    const url = await adapter.createPresignedReadUrl({
      bucket: 'feera-user-private',
      key: 'verification-doc/u1/x.pdf',
      ttlSeconds: 60,
    });
    expect(url).toMatch(/^https:\/\/fsn1\.your-objectstorage\.com\/feera-user-private\/verification-doc\/u1\/x\.pdf\?/u);
    expect(url).toContain('X-Amz-Expires=60');
  });
});

describe('createPresignedUploadUrl (top-level helper)', () => {
  it('rejects invalid kind + size combo before touching S3', async () => {
    const r = await createPresignedUploadUrl({
      kind: 'profile-photo',
      userId: '00000000-0000-4000-8000-000000000001',
      contentType: 'video/mp4',
      sizeBytes: 1024,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('mime_not_allowed');
  });

  it('mints a key under the right bucket for valid input', async () => {
    const adapter = new HetznerStorageAdapter({ env: TEST_ENV });
    const r = await createPresignedUploadUrl({
      kind: 'club-logo',
      userId: '00000000-0000-4000-8000-000000000001',
      contentType: 'image/png',
      sizeBytes: 50_000,
      filename: 'My Club.png',
      provider: adapter,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.upload.bucket).toBe('feera-public');
      expect(r.upload.key).toMatch(/^club-logo\/00000000-0000-4000-8000-000000000001\/[a-f0-9-]+-my-club\.png$/u);
      expect(r.upload.publicUrl).toContain('https://cdn.feera.ai/');
    }
  });
});
