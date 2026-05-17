/**
 * Browser-side upload helper. Three hops: sign, PUT to Hetzner, confirm.
 *
 * Usage:
 *   const { url, key } = await uploadFile(file, 'profile-photo');
 */

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

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

export interface UploadOptions {
  contextId?: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

interface SignResponse {
  data: {
    uploadUrl: string;
    key: string;
    bucket: string;
    headers: Record<string, string>;
    publicUrl: string | null;
    expiresAt: string;
    kind: ContentKind;
  };
}

interface ConfirmResponse {
  data: UploadResult;
}

interface ApiError {
  error: string;
  message: string;
}

/**
 * Sign + PUT only, without the server-side /confirm step. Use for public
 * assets that get written into a row created later (e.g. club logo posted
 * before the club row exists). Caller passes the returned URL into the
 * subsequent create payload.
 */
export async function uploadFilePublic(
  file: File,
  kind: ContentKind,
  opts: Omit<UploadOptions, 'contextId'> = {},
): Promise<{ key: string; url: string }> {
  const signRes = await fetch('/api/v1/uploads/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      filename: file.name,
    }),
    signal: opts.signal,
  });
  if (!signRes.ok) {
    const j = (await signRes.json().catch(() => null)) as ApiError | null;
    throw new Error(j?.message ?? `Sign failed (HTTP ${signRes.status}).`);
  }
  const sign = (await signRes.json()) as SignResponse;
  if (!sign.data.publicUrl) {
    throw new Error('Kind is not public; use uploadFile() instead.');
  }
  await putToBucket(sign.data.uploadUrl, sign.data.headers, file, opts);
  return { key: sign.data.key, url: sign.data.publicUrl };
}

/**
 * Sign + PUT for a private kind. Returns the storage key the caller must
 * post into its create-coach / send-message / etc payload. The server will
 * mint a signed read URL on demand.
 */
export async function uploadFilePrivate(
  file: File,
  kind: ContentKind,
  opts: Omit<UploadOptions, 'contextId'> = {},
): Promise<{ key: string; bucket: string; sizeBytes: number; contentType: string }> {
  const signRes = await fetch('/api/v1/uploads/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      filename: file.name,
    }),
    signal: opts.signal,
  });
  if (!signRes.ok) {
    const j = (await signRes.json().catch(() => null)) as ApiError | null;
    throw new Error(j?.message ?? `Sign failed (HTTP ${signRes.status}).`);
  }
  const sign = (await signRes.json()) as SignResponse;
  await putToBucket(sign.data.uploadUrl, sign.data.headers, file, opts);
  return {
    key: sign.data.key,
    bucket: sign.data.bucket,
    sizeBytes: file.size,
    contentType: file.type || 'application/octet-stream',
  };
}

export async function uploadFile(
  file: File,
  kind: ContentKind,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  // 1) sign
  const signRes = await fetch('/api/v1/uploads/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      filename: file.name,
      contextId: opts.contextId,
    }),
    signal: opts.signal,
  });
  if (!signRes.ok) {
    const j = (await signRes.json().catch(() => null)) as ApiError | null;
    throw new Error(j?.message ?? `Sign failed (HTTP ${signRes.status}).`);
  }
  const sign = (await signRes.json()) as SignResponse;

  // 2) PUT bytes directly to Hetzner. XHR gives us progress; fetch does not.
  await putToBucket(sign.data.uploadUrl, sign.data.headers, file, opts);

  // 3) confirm + persist on the right row
  const confirmRes = await fetch('/api/v1/uploads/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,
      key: sign.data.key,
      contextId: opts.contextId,
      sizeBytes: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
    signal: opts.signal,
  });
  if (!confirmRes.ok) {
    const j = (await confirmRes.json().catch(() => null)) as ApiError | null;
    throw new Error(j?.message ?? `Confirm failed (HTTP ${confirmRes.status}).`);
  }
  const confirm = (await confirmRes.json()) as ConfirmResponse;
  return confirm.data;
}

function putToBucket(
  url: string,
  headers: Record<string, string>,
  file: File,
  opts: UploadOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new Error('Upload aborted.'));
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => xhr.abort());
    }
    xhr.send(file);
  });
}
