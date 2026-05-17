'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile } from '@/lib/storage/client';

interface Props {
  courtId: string;
  courtName: string;
  initialPhotos: ReadonlyArray<{ url: string; key?: string }>;
}

export function CourtPhotoUploader({ courtId, courtName, initialPhotos }: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const r = await uploadFile(file, 'court-photo', { contextId: courtId });
      setPhotos((p) => [...p, { url: r.url, key: r.key }]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="border border-ink-deep/15 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-deep/60">{courtName}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {photos.length === 0 ? (
          <p className="text-xs text-ink-deep/50">No photos yet.</p>
        ) : (
          photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.key ?? i}
              src={p.url}
              alt={`${courtName} photo ${i + 1}`}
              className="h-20 w-28 border border-ink-deep/15 object-cover"
              width={112}
              height={80}
            />
          ))
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          disabled={uploading}
          aria-label={`Upload photo for ${courtName}`}
          className="text-sm text-ink-deep"
        />
        {uploading ? (
          <span className="text-xs text-ink-deep/60">Uploading.</span>
        ) : error ? (
          <span className="text-xs text-red-600">{error}</span>
        ) : null}
      </div>
    </div>
  );
}
