export * from './types';
export * from './moderation';
export {
  bucketForKind,
  aclForKind,
  isPublicKind,
  ALL_CONTENT_KINDS,
} from './providers/router';
export {
  R2StorageAdapter,
  getR2Storage,
  resetR2Storage,
} from './providers/r2';
// Default storage provider (ADR-0008 v2): Cloudflare R2.
// Existing call sites import `getStorage` and stay provider-agnostic.
export { getR2Storage as getStorage, resetR2Storage as resetStorage } from './providers/r2';
// Hetzner adapter retained for fallback / regional needs.
export {
  HetznerStorageAdapter,
  getHetznerStorage,
  resetHetznerStorage,
} from './providers/hetzner';
export {
  createPresignedUploadUrl,
  createPresignedReadUrl,
  slugifyFilename,
  type PrepareUploadInput,
  type PrepareUploadResult,
  type PrepareReadInput,
} from './sign';
