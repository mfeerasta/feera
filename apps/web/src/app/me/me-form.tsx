'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadFile } from '@/lib/storage/client';
import { useT } from '@/lib/i18n/context';

type Locale = 'en' | 'ur' | 'ar' | 'es' | 'fr' | 'it' | 'pt';
type Visibility = 'public' | 'friends' | 'private';

interface Initial {
  displayName: string;
  locale: Locale;
  city: string;
  genderVisibility: Visibility;
  bio: string;
  profilePhotoUrl?: string | null;
}

const LOCALES: Locale[] = ['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt'];
const VISIBILITIES: Visibility[] = ['public', 'friends', 'private'];

export function MeForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [form, setForm] = useState<Initial>(initial);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.profilePhotoUrl ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setStatus('idle');
    setMessage('');
    try {
      const r = await uploadFile(file, 'profile-photo');
      setPhotoUrl(r.url);
      setStatus('ok');
      setMessage(t('me.savedJustNow'));
      router.refresh();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('idle');
    setMessage('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/v1/me', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            displayName: form.displayName,
            locale: form.locale,
            city: form.city.trim() === '' ? null : form.city.trim(),
            genderVisibility: form.genderVisibility,
            bio: form.bio.trim() === '' ? null : form.bio.trim(),
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          setStatus('error');
          setMessage(body?.message ?? t('errors.unknown'));
          return;
        }
        setStatus('ok');
        setMessage(t('me.savedJustNow'));
        router.refresh();
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('errors.network'));
      }
    });
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="grid gap-3">
        <Label htmlFor="profilePhoto">{t('nav.profile')}</Label>
        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={t('nav.profile')}
              className="h-16 w-16 rounded-full border border-[color:var(--color-border)] object-cover"
              width={64}
              height={64}
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-16 w-16 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-muted)]"
            />
          )}
          <div className="grid gap-1">
            <input
              ref={fileInputRef}
              id="profilePhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              disabled={photoUploading || pending}
              className="text-sm text-[color:var(--color-fg)]"
            />
            <p className="text-xs text-[color:var(--color-fg-muted)]">
              {photoUploading ? t('common.loading') : 'JPG, PNG, WEBP · ≤ 5 MB'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="displayName">{t('me.displayName')}</Label>
        <Input
          id="displayName"
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          required
          minLength={1}
          maxLength={160}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="city">{t('me.city')}</Label>
        <Input
          id="city"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          maxLength={80}
          placeholder={t('onboarding.cityPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="locale">{t('localeSwitcher.label')}</Label>
          <select
            id="locale"
            value={form.locale}
            onChange={(e) =>
              setForm((f) => ({ ...f, locale: e.target.value as Locale }))
            }
            className="feera-motion h-11 w-full border border-[color:var(--color-border)] bg-transparent px-4 text-sm text-[color:var(--color-fg)]"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vis">{t('me.section.privacy')}</Label>
          <select
            id="vis"
            value={form.genderVisibility}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                genderVisibility: e.target.value as Visibility,
              }))
            }
            className="feera-motion h-11 w-full border border-[color:var(--color-border)] bg-transparent px-4 text-sm text-[color:var(--color-fg)]"
          >
            <option value="public">{t('privacyControls.allowMessagesAll')}</option>
            <option value="friends">{t('privacyControls.allowMessagesFriends')}</option>
            <option value="private">{t('privacyControls.allowMessagesNone')}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bio">{t('me.bio')}</Label>
        <textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          maxLength={2000}
          rows={4}
          className="feera-motion w-full border border-[color:var(--color-border)] bg-transparent p-4 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)]"
          placeholder={t('me.bioPlaceholder')}
        />
      </div>

      <div className="flex items-center justify-between">
        <p
          className={
            status === 'error'
              ? 'text-sm text-red-500'
              : status === 'ok'
                ? 'text-sm text-[color:var(--color-accent)]'
                : 'text-sm text-[color:var(--color-fg-muted)]'
          }
        >
          {message || t('me.subtitle')}
        </p>
        <Button type="submit" disabled={pending} size="md">
          {pending ? t('common.saving') : t('me.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
