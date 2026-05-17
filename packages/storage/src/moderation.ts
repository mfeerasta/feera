/**
 * Cheap file-shape moderation: mime + size allowlists per ContentKind.
 *
 * Real image moderation (NSFW, faces, OCR) ships in M4 via a Cloudflare
 * worker that intercepts requests against `cdn.feera.ai`. This module exists
 * to refuse obviously wrong uploads (a 500MB MP4 in the profile photo slot,
 * an HTML payload in a verification document).
 */

import type { ContentKind } from './types';

export const ALLOWED_MIME: Readonly<Record<ContentKind, readonly string[]>> = {
  'profile-photo': ['image/jpeg', 'image/png', 'image/webp'],
  'club-logo': ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  'court-photo': ['image/jpeg', 'image/png', 'image/webp'],
  'coach-intro-photo': ['image/jpeg', 'image/png', 'image/webp'],
  'verification-doc': ['application/pdf', 'image/jpeg', 'image/png'],
  'chat-attachment': [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ],
  'match-photo-private': ['image/jpeg', 'image/png', 'image/webp'],
  'edition-public': ['image/jpeg', 'image/png', 'image/webp'],
  'edition-editorial': ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  'edition-flagship-photo': ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
};

const MB = 1024 * 1024;

export const MAX_BYTES: Readonly<Record<ContentKind, number>> = {
  'profile-photo': 5 * MB,
  'club-logo': 2 * MB,
  'court-photo': 8 * MB,
  'coach-intro-photo': 5 * MB,
  'verification-doc': 25 * MB,
  'chat-attachment': 1 * MB,
  'match-photo-private': 8 * MB,
  'edition-public': 10 * MB,
  'edition-editorial': 25 * MB,
  'edition-flagship-photo': 25 * MB,
};

export const MIME_TO_EXT: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

export type ValidationOk = { ok: true };
export type ValidationErr = { ok: false; code: 'mime_not_allowed' | 'too_large' | 'invalid_kind'; message: string };
export type ValidationResult = ValidationOk | ValidationErr;

export function validateUpload(
  kind: ContentKind,
  contentType: string,
  sizeBytes: number,
): ValidationResult {
  const allowed = ALLOWED_MIME[kind];
  if (!allowed) {
    return { ok: false, code: 'invalid_kind', message: `Unknown content kind: ${kind}` };
  }
  if (!allowed.includes(contentType)) {
    return {
      ok: false,
      code: 'mime_not_allowed',
      message: `Content type ${contentType} not allowed for ${kind}. Allowed: ${allowed.join(', ')}.`,
    };
  }
  const max = MAX_BYTES[kind];
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, code: 'too_large', message: 'sizeBytes must be a positive integer.' };
  }
  if (sizeBytes > max) {
    return {
      ok: false,
      code: 'too_large',
      message: `File is ${formatBytes(sizeBytes)}; max for ${kind} is ${formatBytes(max)}.`,
    };
  }
  return { ok: true };
}

export function extForMime(contentType: string): string {
  return MIME_TO_EXT[contentType] ?? 'bin';
}

function formatBytes(n: number): string {
  if (n >= MB) return `${(n / MB).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}
