'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SlotRef {
  dayIdx: number;
  slotIdx: number;
  iso: string;
}

interface Props {
  courtId: string;
  clubSlug: string;
  slotIndex: SlotRef[];
}

const inputCls =
  'h-11 w-full rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';
const labelCls = 'text-[10px] uppercase tracking-[0.2em] text-ink-deep/60';

export function BookSlotForm({ courtId, clubSlug: _clubSlug, slotIndex }: Props) {
  const router = useRouter();
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState(90);
  const [seatsBooked, setSeatsBooked] = useState(4);
  const [levelMin, setLevelMin] = useState<string>('');
  const [levelMax, setLevelMax] = useState<string>('');
  const [genderPref, setGenderPref] =
    useState<'open' | 'men_only' | 'women_only' | 'mixed'>('open');
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'error' | 'done'>(
    'idle',
  );
  const [message, setMessage] = useState<string | null>(null);

  const picked = useMemo(
    () => slotIndex.find((s) => `${s.dayIdx}:${s.slotIdx}` === pickedKey),
    [pickedKey, slotIndex],
  );

  useEffect(() => {
    function onClick(ev: MouseEvent) {
      const t = ev.target as HTMLElement | null;
      const btn = t?.closest?.('[data-slot-key]') as HTMLElement | null;
      if (!btn) return;
      const key = btn.getAttribute('data-slot-key');
      if (key) {
        setPickedKey(key);
        setPhase('idle');
        setMessage(null);
        setTimeout(() => {
          document
            .getElementById('book-slot-form')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!picked) {
    return (
      <div
        id="book-slot-form"
        className="mt-10 border border-ink-deep/15 bg-paper p-8 text-center"
      >
        <p className="text-sm text-ink-deep/60">
          Pick a free (green) slot above to start a booking.
        </p>
      </div>
    );
  }

  const isOpenMatch = seatsBooked < 4;

  async function submit() {
    if (!picked) return;
    setPhase('submitting');
    setMessage(null);
    try {
      const startAt = new Date(picked.iso);
      const body: Record<string, unknown> = {
        courtId,
        startAt: startAt.toISOString(),
        durationMinutes: durationMin,
        isOpenMatch,
        maxParticipants: 4,
        genderPreference: genderPref,
      };
      if (levelMin) body.requiredLevelMin = Number(levelMin);
      if (levelMax) body.requiredLevelMax = Number(levelMax);
      if (notes.trim()) body.notes = notes.trim();
      // Note: seatsBooked is handled by the server (E2 wires it into the
      // booking row). For now we send maxParticipants=4 + isOpenMatch flag so
      // the open-match feed picks up partial-fill bookings.

      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? `Booking failed (HTTP ${res.status}).`);
      }
      const j = (await res.json()) as { data: { id: string } };
      setPhase('done');
      setMessage('Booking created.');
      setTimeout(() => router.push(`/play/bookings`), 600);
      void j;
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  const startDate = new Date(picked.iso);
  return (
    <div
      id="book-slot-form"
      className="mt-10 border border-ink-deep/15 bg-paper p-8"
    >
      <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
        Book this slot
      </p>
      <h3 className="mt-2 font-serif text-3xl tracking-tight text-ink-deep">
        {startDate.toLocaleString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </h3>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Duration</span>
          <select
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className={inputCls}
          >
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Players you already have</span>
          <select
            value={seatsBooked}
            onChange={(e) => setSeatsBooked(Number(e.target.value))}
            className={inputCls}
          >
            <option value={1}>1 (you, open 3 seats)</option>
            <option value={2}>2 (open 2 seats)</option>
            <option value={3}>3 (open 1 seat)</option>
            <option value={4}>4 (full, no open match)</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Min level (0 to 7)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="7"
            value={levelMin}
            onChange={(e) => setLevelMin(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Max level (0 to 7)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="7"
            value={levelMax}
            onChange={(e) => setLevelMax(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Gender preference</span>
          <select
            value={genderPref}
            onChange={(e) =>
              setGenderPref(
                e.target.value as
                  | 'open'
                  | 'men_only'
                  | 'women_only'
                  | 'mixed',
              )
            }
            className={inputCls}
          >
            <option value="open">Open to anyone</option>
            <option value="mixed">Mixed</option>
            <option value="men_only">Men only</option>
            <option value="women_only">Women only</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className={labelCls}>Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputCls} h-auto py-3`}
            placeholder="Anything the other players should know."
          />
        </label>
      </div>

      {isOpenMatch && (
        <p className="mt-6 border border-brass/40 px-4 py-3 text-xs text-ink-deep/70">
          This booking will be published to the open-matches feed. Players in
          your city can request to fill the remaining {4 - seatsBooked} seat
          {4 - seatsBooked === 1 ? '' : 's'}.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={phase === 'submitting' || phase === 'done'}
          className="inline-flex h-11 items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court disabled:opacity-50"
        >
          {phase === 'submitting'
            ? 'Booking...'
            : phase === 'done'
              ? 'Booked'
              : 'Confirm booking'}
        </button>
        <button
          type="button"
          onClick={() => setPickedKey(null)}
          className="text-sm text-ink-deep/60 transition-colors duration-150 hover:text-court"
        >
          Cancel
        </button>
        {message && (
          <span
            className={`text-xs ${phase === 'error' ? 'text-red-600' : 'text-court'}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
