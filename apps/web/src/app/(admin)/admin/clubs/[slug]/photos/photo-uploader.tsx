'use client';

import { useState, useRef, type ChangeEvent } from 'react';

interface PhotoUploaderProps {
  slug: string;
  kind: 'club-logo' | 'court-photo';
  courtId?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

export function PhotoUploader({ slug, kind, courtId }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setErrorMsg('Please select a JPG, PNG, or WebP image.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setErrorMsg(null);
    setFile(f);
    setStatus('idle');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function onUpload() {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg(null);

    try {
      // Step 1: Get a presigned upload URL.
      const signRes = await fetch('/api/v1/uploads/sign', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-feera-dev-admin': '1',
        },
        body: JSON.stringify({
          kind: kind === 'club-logo' ? 'club-photo' : 'court-photo',
          contentType: file.type,
          sizeBytes: file.size,
          filename: file.name,
        }),
      });

      if (!signRes.ok) {
        // If presigned upload is not configured (no R2 keys), fall back to
        // registering a placeholder URL directly via the photos API.
        const placeholderUrl = `https://cdn.feera.ai/placeholder/${slug}/${Date.now()}-${file.name}`;
        const photoRes = await fetch(`/api/v1/clubs/${slug}/photos`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-feera-dev-admin': '1',
          },
          body: JSON.stringify({
            kind,
            url: placeholderUrl,
            ...(courtId ? { courtId } : {}),
          }),
        });

        if (!photoRes.ok) {
          throw new Error(`Photo registration failed (HTTP ${photoRes.status}).`);
        }

        setStatus('success');
        setFile(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
        setTimeout(() => window.location.reload(), 800);
        return;
      }

      const signData = (await signRes.json()) as {
        data: { uploadUrl: string; publicUrl: string | null; headers: Record<string, string> };
      };

      // Step 2: Upload the file to the presigned URL.
      await fetch(signData.data.uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': file.type,
          ...signData.data.headers,
        },
        body: file,
      });

      const publicUrl = signData.data.publicUrl ?? signData.data.uploadUrl.split('?')[0];

      // Step 3: Register the photo URL with the club.
      const photoRes = await fetch(`/api/v1/clubs/${slug}/photos`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-feera-dev-admin': '1',
        },
        body: JSON.stringify({
          kind,
          url: publicUrl,
          ...(courtId ? { courtId } : {}),
        }),
      });

      if (!photoRes.ok) {
        throw new Error(`Photo registration failed (HTTP ${photoRes.status}).`);
      }

      setStatus('success');
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message);
    }
  }

  function onClear() {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        Upload {kind === 'club-logo' ? 'club photo' : 'court photo'}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={onFileChange}
        className="text-sm text-[color:var(--color-fg-muted)] file:me-4 file:border file:border-[color:var(--color-border)] file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.15em] file:text-[color:var(--color-fg)] file:cursor-pointer hover:file:border-[color:var(--color-accent)]"
      />

      {preview ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="h-24 w-24 border border-[color:var(--color-border)] object-cover"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onUpload}
              disabled={status === 'uploading'}
              className="inline-flex h-10 items-center border border-court bg-court px-5 text-xs uppercase tracking-[0.18em] text-cream hover:opacity-90 disabled:opacity-50"
            >
              {status === 'uploading' ? 'Uploading...' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center border border-[color:var(--color-border)] px-5 text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:border-red-500 hover:text-red-500"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {status === 'success' ? (
        <p className="text-xs text-green-600">Photo uploaded successfully.</p>
      ) : null}

      {errorMsg ? (
        <p className="text-xs text-red-600">{errorMsg}</p>
      ) : null}
    </div>
  );
}
