'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Gender = 'm' | 'f' | 'x';
type Visibility = 'public' | 'friends' | 'private';

interface Initial {
  gender: Gender | null;
  genderVisibility: Visibility;
  womenOnlyPoolOptIn: boolean;
}

const labelCls = 'text-[10px] uppercase tracking-[0.22em] text-ink-deep/60';
const helpCls = 'mt-2 text-xs leading-relaxed text-ink-deep/55';
const btnPrimary =
  'inline-flex h-12 items-center justify-center border border-ink-deep bg-ink-deep px-6 text-sm text-cream transition-colors duration-150 hover:bg-court hover:border-court disabled:opacity-40 disabled:pointer-events-none';

export function PrivacyForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Initial>(initial);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function save(next: Partial<Initial> = {}) {
    const merged = { ...form, ...next };
    setForm(merged);
    setMessage(null);
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = {
          genderVisibility: merged.genderVisibility,
        };
        if (merged.gender !== null) body.gender = merged.gender;
        // Women pool only meaningful for women; coerce to false otherwise.
        body.womenOnlyPoolOptIn =
          merged.gender === 'f' ? merged.womenOnlyPoolOptIn : false;

        const res = await fetch('/api/v1/me', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => null)) as { message?: string } | null;
          setMessage({ kind: 'error', text: b?.message ?? `Save failed (HTTP ${res.status}).` });
          return;
        }
        setMessage({ kind: 'ok', text: 'Saved.' });
        router.refresh();
      } catch (e) {
        setMessage({
          kind: 'error',
          text: e instanceof Error ? e.message : 'Network error.',
        });
      }
    });
  }

  return (
    <div className="space-y-12">
      <section>
        <p className={labelCls}>Your gender</p>
        <p className={helpCls}>
          Used for matchmaking and tournament eligibility. We never display this
          unless you choose to.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { v: 'm' as const, label: 'Man' },
            { v: 'f' as const, label: 'Woman' },
            { v: 'x' as const, label: 'Prefer not to say' },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => save({ gender: opt.v, womenOnlyPoolOptIn: opt.v === 'f' ? form.womenOnlyPoolOptIn : false })}
              disabled={pending}
              className={`h-14 border px-4 text-left text-sm ${
                form.gender === opt.v
                  ? 'border-ink-deep bg-ink-deep text-cream'
                  : 'border-ink-deep/30 bg-paper text-ink-deep hover:border-ink-deep'
              } disabled:opacity-60`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className={labelCls}>Who can see your gender?</p>
        <p className={helpCls}>
          Open matches, level, and reliability stay visible to other players
          regardless. This setting only controls the gender field.
        </p>
        <div className="mt-4 space-y-2">
          {[
            { v: 'public' as const, title: 'Anyone can see', body: 'Players, clubs, and tournament organizers can see your gender.' },
            { v: 'friends' as const, title: 'Only your accepted friends see', body: 'Friends you have explicitly added can see it. No one else.' },
            { v: 'private' as const, title: 'Only you see', body: 'Hidden from everyone except you. Matchmaking still uses it.' },
          ].map((opt) => (
            <label
              key={opt.v}
              className={`flex cursor-pointer items-start gap-4 border p-4 ${
                form.genderVisibility === opt.v
                  ? 'border-ink-deep bg-paper'
                  : 'border-ink-deep/15 bg-paper hover:border-ink-deep/40'
              }`}
            >
              <input
                type="radio"
                name="vis"
                value={opt.v}
                checked={form.genderVisibility === opt.v}
                onChange={() => save({ genderVisibility: opt.v })}
                disabled={pending}
                className="mt-1"
              />
              <span className="block">
                <span className="block text-sm font-medium text-ink-deep">{opt.title}</span>
                <span className="mt-1 block text-xs text-ink-deep/60">{opt.body}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {form.gender === 'f' && (
        <section className="border border-brass/40 bg-paper p-5">
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              checked={form.womenOnlyPoolOptIn}
              onChange={(e) => save({ womenOnlyPoolOptIn: e.target.checked })}
              disabled={pending}
              className="mt-1"
            />
            <span className="block">
              <span className="block text-sm font-medium text-ink-deep">
                Show me in the women only matchmaking pool
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-ink-deep/60">
                When on, you can join women only open matches and you build a
                parallel rating that only changes when all four players are
                women. Your open level is unaffected.
              </span>
            </span>
          </label>
        </section>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.kind === 'error' ? 'text-red-600' : 'text-court'
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => save()}
          disabled={pending}
          className={btnPrimary}
        >
          {pending ? 'Saving' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
