/**
 * Shared types for the storage adapter layer. Mirrors the @feera/payments shape:
 * one StorageProvider interface, swappable implementations per region.
 *
 * Buckets are physical containers in Hetzner Object Storage. ContentKind is the
 * logical label the app uses to pick a bucket and apply size + mime allowlists.
 */

export type BucketName = 'feera-public' | 'feera-user-private' | 'feera-edition';

export type ContentKind =
  | 'profile-photo'
  | 'club-logo'
  | 'court-photo'
  | 'coach-intro-photo'
  | 'verification-doc'
  | 'chat-attachment'
  | 'match-photo-private'
  | 'edition-public'
  | 'edition-editorial'
  | 'edition-flagship-photo';

export type ObjectAcl = 'public-read' | 'private';

export interface ObjectMetadata {
  contentType: string;
  sizeBytes: number;
  acl: ObjectAcl;
  /** Optional cache-control header. Public assets get a 1-year immutable default. */
  cacheControl?: string;
  /** Free-form metadata stored as x-amz-meta-* on the object. */
  custom?: Readonly<Record<string, string>>;
}

export interface PutOpts {
  contentType?: string;
  acl?: ObjectAcl;
  cacheControl?: string;
  custom?: Readonly<Record<string, string>>;
}

export interface PutResult {
  key: string;
  bucket: BucketName;
  etag?: string;
  publicUrl?: string;
}

export interface GetResult {
  body: Uint8Array;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
  lastModified?: Date;
}

export interface ListItem {
  key: string;
  sizeBytes: number;
  lastModified: Date;
  etag?: string;
}

export interface PresignedUploadInput {
  bucket: BucketName;
  key: string;
  contentType: string;
  /** Hard cap enforced via signed Content-Length-Range. */
  maxBytes: number;
  /** Defaults to 5 minutes. Hetzner caps signed URLs at 7 days. */
  ttlSeconds?: number;
  acl?: ObjectAcl;
  cacheControl?: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  bucket: BucketName;
  /** Headers the client MUST send with the PUT. */
  headers: Readonly<Record<string, string>>;
  /** Resolvable URL after the upload completes. Public assets only. */
  publicUrl?: string;
  expiresAt: string;
}

export interface PresignedReadInput {
  bucket: BucketName;
  key: string;
  ttlSeconds?: number;
}

export interface StorageProvider {
  readonly name: 'hetzner';
  put(bucket: BucketName, key: string, body: Buffer | Uint8Array, opts?: PutOpts): Promise<PutResult>;
  get(bucket: BucketName, key: string): Promise<GetResult>;
  delete(bucket: BucketName, key: string): Promise<void>;
  list(bucket: BucketName, prefix?: string, limit?: number): Promise<ListItem[]>;
  createPresignedUploadUrl(input: PresignedUploadInput): Promise<PresignedUpload>;
  createPresignedReadUrl(input: PresignedReadInput): Promise<string>;
}

export interface StorageEnv {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicCdnUrl: string;
  buckets: {
    public: BucketName;
    private: BucketName;
    edition: BucketName;
  };
}
