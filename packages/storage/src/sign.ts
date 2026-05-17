/**
 * High-level sign helpers. The HTTP layer calls these instead of poking the
 * provider directly: it gets bucket routing, validation, slug + key minting,
 * and TTL defaults in one call.
 */

import { randomUUID } from 'node:crypto';
import { getR2Storage } from './providers/r2';
import { aclForKind, bucketForKind, isPublicKind } from './providers/router';
import { extForMime, validateUpload, type ValidationErr } from './moderation';
import type { ContentKind, PresignedUpload, StorageProvider } from './types';

export interface PrepareUploadInput {
  kind: ContentKind;
  userId: string;
  contentType: string;
  sizeBytes: number;
  /** Optional filename hint, used only for slugified suffix. */
  filename?: string;
  /** Optional context (clubId, courtId, chatId, etc) appended to the key. */
  contextId?: string;
  /** Override TTL on the signed PUT. Defaults to 5 minutes. */
  ttlSeconds?: number;
  /** Override provider (tests). */
  provider?: StorageProvider;
}

export type PrepareUploadResult =
  | { ok: true; upload: PresignedUpload; kind: ContentKind }
  | { ok: false; error: ValidationErr };

export async function createPresignedUploadUrl(
  input: PrepareUploadInput,
): Promise<PrepareUploadResult> {
  const v = validateUpload(input.kind, input.contentType, input.sizeBytes);
  if (!v.ok) return { ok: false, error: v };

  const bucket = bucketForKind(input.kind);
  const acl = aclForKind(input.kind);
  const ext = extForMime(input.contentType);
  const slug = input.filename ? slugifyFilename(input.filename) : 'upload';
  const segments = [input.kind, input.userId];
  if (input.contextId) segments.push(input.contextId);
  segments.push(`${randomUUID()}-${slug}.${ext}`);
  const key = segments.join('/');

  const provider = input.provider ?? getR2Storage();
  const upload = await provider.createPresignedUploadUrl({
    bucket,
    key,
    contentType: input.contentType,
    maxBytes: input.sizeBytes,
    ttlSeconds: input.ttlSeconds,
    acl,
  });
  return { ok: true, upload, kind: input.kind };
}

export interface PrepareReadInput {
  kind: ContentKind;
  key: string;
  ttlSeconds?: number;
  provider?: StorageProvider;
}

export async function createPresignedReadUrl(input: PrepareReadInput): Promise<string> {
  const bucket = bucketForKind(input.kind);
  const provider = input.provider ?? getR2Storage();
  // Public assets do not need signing; return the CDN URL directly.
  if (isPublicKind(input.kind) && 'publicUrl' in provider) {
    const p = provider as unknown as { publicUrl: (b: string, k: string) => string };
    return p.publicUrl(bucket, input.key);
  }
  return provider.createPresignedReadUrl({
    bucket,
    key: input.key,
    ttlSeconds: input.ttlSeconds ?? 300,
  });
}

function slugifyFilename(name: string): string {
  // Strip extension if present; the canonical ext comes from the mime type.
  const stem = name.replace(/\.[^/.]+$/u, '');
  return (
    stem
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{ASCII}]/gu, '')
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 48) || 'upload'
  );
}

export { slugifyFilename };
