'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Locale = 'en' | 'ur' | 'ar' | 'es' | 'fr' | 'it' | 'pt';
type Visibility = 'public' | 'friends' | 'private';

interface Initial {
  displayName: string;
  locale: Locale;
  city: string;
  genderVisibility: Visibility;
  bio: string;
}

const LOCALES: Locale[] = ['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt'];
const VISIBILITIES: Visibility[] = ['public', 'friends', 'private'];

export function MeForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [form, setForm] = useState<Initial>(initial);

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
          setMessage(body?.message ?? `Update failed (HTTP ${res.status}).`);
          return;
        }
        setStatus('ok');
        setMessage('Saved.');
        router.refresh();
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Network error.');
      }
    });
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Display name</Label>
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
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          maxLength={80}
          placeholder="e.g. Lahore"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="locale">Locale</Label>
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
          <Label htmlFor="vis">Visibility</Label>
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
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          maxLength={2000}
          rows={4}
          className="feera-motion w-full border border-[color:var(--color-border)] bg-transparent p-4 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)]"
          placeholder="A line or two about your game."
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
          {message || 'Changes save to your profile.'}
        </p>
        <Button type="submit" disabled={pending} size="md">
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
