'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Props {
  bookingId: string;
  seatsOpen: number;
  disabled: boolean;
}

const inputCls =
  'h-11 w-full rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';
const labelCls = 'text-[10px] uppercase tracking-[0.2em] text-ink-deep/60';

export function JoinRequestForm({ bookingId, seatsOpen, disabled }: Props) {
  const [message, setMessage] = useState('');
  const [seats, setSeats] = useState(1);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'error' | 'done'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPhase('submitting');
    setError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          seatsRequested: seats,
          ...(message.trim() ? { message: message.trim() } : {}),
        }),
      });
      if (res.status === 401) {
        setPhase('error');
        setError('Please sign in to request a seat.');
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? `Request failed (HTTP ${res.status}).`);
      }
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setError((err as Error).message);
    }
  }

  if (phase === 'done') {
    return (
      <div className="border border-court/40 bg-paper p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-court">
          Request sent
        </p>
        <h3 className="mt-2 font-serif text-3xl tracking-tight text-ink-deep">
          The organizer will respond shortly.
        </h3>
        <p className="mt-4 text-sm text-ink-deep/70">
          You will get a notification when they approve or decline.
        </p>
        <Link
          href="/play/open"
          className="mt-8 inline-flex items-center justify-center border border-ink-deep px-6 py-3 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
        >
          Back to open matches
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-ink-deep/15 bg-paper p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
        Request to join
      </p>
      <h3 className="mt-2 font-serif text-3xl tracking-tight text-ink-deep">
        Send a quick note.
      </h3>
      <div className="mt-8 flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Seats</span>
          <select
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            disabled={disabled}
            className={inputCls}
          >
            {Array.from({ length: Math.max(seatsOpen, 1) }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Message (optional)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="Say hi and mention your level."
            className={`${inputCls} h-auto py-3`}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || phase === 'submitting'}
          className="inline-flex h-11 items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court disabled:opacity-50"
        >
          {disabled
            ? 'No seats open'
            : phase === 'submitting'
              ? 'Sending...'
              : 'Send request'}
        </button>
        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
