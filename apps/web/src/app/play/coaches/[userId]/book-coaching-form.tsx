'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Slot {
  startAt: string;
  endAt: string;
}

interface Props {
  coachUserId: string;
  currency: string;
  hourlyRate: number;
  slots: Slot[];
}

const inputCls =
  'h-11 w-full rounded-none border border-ink-deep/30 bg-transparent px-3 text-sm text-ink-deep focus:border-court focus:outline-none';
const labelCls = 'text-[10px] uppercase tracking-[0.2em] text-ink-deep/60';

function groupByDay(slots: Slot[]): Record<string, Slot[]> {
  const out: Record<string, Slot[]> = {};
  for (const s of slots) {
    const date = new Date(s.startAt);
    const key = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!out[key]) out[key] = [];
    out[key].push(s);
  }
  return out;
}

export function BookCoachingForm({
  coachUserId,
  currency,
  hourlyRate,
  slots,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [sessionType, setSessionType] = useState<'single' | 'group' | 'clinic'>('single');
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'error' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const grouped = useMemo(() => groupByDay(slots), [slots]);
  const dayKeys = Object.keys(grouped);

  if (slots.length === 0) {
    return (
      <p className="mt-6 text-sm text-ink-deep/70">
        No open slots in the next 14 days. The coach may be on a break, or every
        slot is booked. Try again tomorrow.
      </p>
    );
  }

  const totalPrice = Math.round(hourlyRate * (duration / 60) * 100) / 100;

  async function submit() {
    if (!selected) return;
    setPhase('submitting');
    setMessage(null);
    try {
      const res = await fetch('/api/v1/coaching-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          coachUserId,
          startAt: selected,
          durationMinutes: duration,
          sessionType,
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? `Booking failed (HTTP ${res.status}).`);
      }
      const j = (await res.json()) as { data: { id: string } };
      setPhase('done');
      setMessage('Session booked. Redirecting to confirmation.');
      setTimeout(
        () => router.push(`/play/coaches/${coachUserId}/book/${encodeURIComponent(selected)}?sessionId=${j.data.id}`),
        500,
      );
    } catch (err) {
      setPhase('error');
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {dayKeys.slice(0, 7).map((day) => (
          <div key={day}>
            <p className={labelCls}>{day}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {grouped[day]!.map((s) => {
                const isSel = selected === s.startAt;
                const time = new Date(s.startAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <button
                    key={s.startAt}
                    type="button"
                    onClick={() => {
                      setSelected(s.startAt);
                      setPhase('idle');
                      setMessage(null);
                    }}
                    className={`border px-2.5 py-1.5 text-xs tabular-nums transition-colors duration-150 ${
                      isSel
                        ? 'border-court bg-court/15 text-ink-deep'
                        : 'border-ink-deep/20 text-ink-deep/70 hover:border-ink-deep'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {dayKeys.length > 7 && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
            {dayKeys.length - 7} more day{dayKeys.length - 7 === 1 ? '' : 's'} below.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Duration</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputCls}
          >
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>120 min</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Type</span>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as typeof sessionType)}
            className={inputCls}
          >
            <option value="single">Single (1 to 1)</option>
            <option value="group">Group (2 to 3)</option>
            <option value="clinic">Clinic (4 plus)</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Notes for the coach (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Tell the coach what you want to work on."
          className={`${inputCls} h-auto py-3`}
        />
      </label>

      <div className="border-t border-ink-deep/15 pt-4">
        <div className="flex items-baseline justify-between">
          <span className={labelCls}>Total</span>
          <span className="font-serif text-2xl text-ink-deep">
            {currency} {totalPrice.toFixed(2)}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-deep/60">
          Cancellation window: 24 hours before the session.
        </p>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!selected || phase === 'submitting' || phase === 'done'}
        className="inline-flex h-11 items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court disabled:opacity-50"
      >
        {phase === 'submitting'
          ? 'Booking...'
          : phase === 'done'
            ? 'Booked'
            : selected
              ? 'Book this slot'
              : 'Pick a slot to continue'}
      </button>

      {message && (
        <p className={`text-xs ${phase === 'error' ? 'text-red-600' : 'text-court'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
