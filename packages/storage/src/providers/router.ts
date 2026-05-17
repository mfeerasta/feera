/**
 * Picks the right bucket per ContentKind. Source of truth for the
 * public vs private decision.
 *
 * Public (CDN-fronted, public-read ACL):
 *   profile-photo, club-logo, court-photo, coach-intro-photo, edition-public
 *
 * Private (signed URLs only, 5-min TTL by default):
 *   verification-doc, chat-attachment, match-photo-private
 *
 * Edition bucket (public-read, served behind Cloudflare with longer cache):
 *   edition-editorial, edition-flagship-photo
 */

import type { BucketName, ContentKind, ObjectAcl } from '../types';

const KIND_TO_BUCKET: Readonly<Record<ContentKind, BucketName>> = {
  'profile-photo': 'feera-public',
  'club-logo': 'feera-public',
  'court-photo': 'feera-public',
  'coach-intro-photo': 'feera-public',
  'edition-public': 'feera-public',
  'verification-doc': 'feera-user-private',
  'chat-attachment': 'feera-user-private',
  'match-photo-private': 'feera-user-private',
  'edition-editorial': 'feera-edition',
  'edition-flagship-photo': 'feera-edition',
};

const KIND_TO_ACL: Readonly<Record<ContentKind, ObjectAcl>> = {
  'profile-photo': 'public-read',
  'club-logo': 'public-read',
  'court-photo': 'public-read',
  'coach-intro-photo': 'public-read',
  'edition-public': 'public-read',
  'edition-editorial': 'public-read',
  'edition-flagship-photo': 'public-read',
  'verification-doc': 'private',
  'chat-attachment': 'private',
  'match-photo-private': 'private',
};

export function bucketForKind(kind: ContentKind): BucketName {
  const b = KIND_TO_BUCKET[kind];
  if (!b) throw new Error(`Unknown content kind: ${kind as string}`);
  return b;
}

export function aclForKind(kind: ContentKind): ObjectAcl {
  const a = KIND_TO_ACL[kind];
  if (!a) throw new Error(`Unknown content kind: ${kind as string}`);
  return a;
}

export function isPublicKind(kind: ContentKind): boolean {
  return aclForKind(kind) === 'public-read';
}

export const ALL_CONTENT_KINDS: readonly ContentKind[] = Object.keys(
  KIND_TO_BUCKET,
) as ContentKind[];
