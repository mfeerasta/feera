'use client';

import { useMemo, useState } from 'react';

interface Slot {
  courtId: string;
  startAt: string;
  endAt: string;
  status: 'free' | 'open' | 'confirmed' | 'closed';
  bookingId?: string;
  closureId?: string;
  reason?: string | null;
}

interface Court {
  id: string;
  name: string;
}

interface Props {
  slug: string;
  slotMinutes: number;
  days: number;
  startIso: string;
  courts: Court[];
  grid: Slot[];
}

type SelectionAnchor = { courtId: string; index: number };

export function CalendarGrid({ slotMinutes, days, startIso, courts, grid }: Props) {
  const start = useMemo(() => new Date(startIso), [startIso]);
  const slotsPerDay = (24 * 60) / slotMinutes;
  const totalSlots = days * slotsPerDay;

  const byCourt = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const c of courts) {
      map.set(
        c.id,
        grid.filter((s) => s.courtId === c.id).sort((a, b) => a.startAt.localeCompare(b.startAt)),
      );
    }
    return map;
  }, [courts, grid]);

  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [modal, setModal] = useState<null | {
    courtId: string;
    fromIndex: number;
    toIndex: number;
    slots: Slot[];
  }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent, courtId: string, index: number) {
    const slots = byCourt.get(courtId) ?? [];
    if (e.shiftKey && anchor && anchor.courtId === courtId) {
      const from = Math.min(anchor.index, index);
      const to = Math.max(anchor.index, index);
      setModal({ courtId, fromIndex: from, toIndex: to, slots: slots.slice(from, to + 1) });
    } else {
      const slot = slots[index];
      if (!slot) return;
      setAnchor({ courtId, index });
      setModal({ courtId, fromIndex: index, toIndex: index, slots: [slot] });
    }
  }

  async function blockRange() {
    if (!modal) return;
    setBusy(true);
    setError(null);
    try {
      const first = modal.slots[0];
      const last = modal.slots[modal.slots.length - 1];
      if (!first || !last) return;
      const startAt = first.startAt;
      const endAt = last.endAt;
      const res = await fetch(`/api/v1/courts/${modal.courtId}/closures`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feera-dev-admin': '1' },
        body: JSON.stringify({ startAt, endAt, reason: 'Blocked from calendar' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function unblockRange() {
    if (!modal) return;
    const ids = Array.from(
      new Set(modal.slots.filter((s) => s.closureId).map((s) => s.closureId!)),
    );
    if (ids.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch(`/api/v1/courts/${modal.courtId}/closures/${id}`, {
          method: 'DELETE',
          headers: { 'x-feera-dev-admin': '1' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const hasClosure = modal?.slots.some((s) => s.status === 'closed') ?? false;
  const hasBooking = modal?.slots.some((s) => s.status === 'confirmed' || s.status === 'open') ?? false;

  return (
    <div>
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `120px repeat(${totalSlots}, 14px)`,
            minWidth: `${120 + totalSlots * 14}px`,
          }}
        >
          <div className="sticky start-0 z-10 bg-[color:var(--color-bg)] text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] px-2 py-2">
            Court
          </div>
          {Array.from({ length: days }).map((_, dayIdx) => {
            const d = new Date(start.getTime() + dayIdx * 24 * 60 * 60 * 1000);
            return (
              <div
                key={dayIdx}
                className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] border-s border-[color:var(--color-border)] ps-1"
                style={{ gridColumn: `span ${slotsPerDay}` }}
              >
                {d.toISOString().slice(5, 10)}
              </div>
            );
          })}

          {courts.map((c) => {
            const slots = byCourt.get(c.id) ?? [];
            return [
              <div
                key={`label-${c.id}`}
                className="sticky start-0 z-10 bg-[color:var(--color-bg)] truncate text-xs px-2 py-2 border-t border-[color:var(--color-border)]"
              >
                {c.name}
              </div>,
              ...slots.map((s, i) => {
                const cls = colorFor(s.status);
                return (
                  <button
                    type="button"
                    key={`${c.id}-${i}`}
                    onClick={(e) => handleClick(e, c.id, i)}
                    title={`${s.startAt.slice(11, 16)} ${s.status}`}
                    className={`h-7 border-t border-s border-[color:var(--color-border)] ${cls}`}
                    aria-label={`${c.name} ${s.startAt} ${s.status}`}
                  />
                );
              }),
            ];
          })}
        </div>
      </div>

      {modal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-[420px] max-w-[90vw] border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-6">
            <h3 className="font-serif text-xl tracking-tight">Slot range</h3>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {modal.slots.length} slot(s), {modal.slots[0]?.startAt.slice(0, 16)} to{' '}
              {modal.slots[modal.slots.length - 1]?.endAt.slice(0, 16)}
            </p>
            {hasBooking ? (
              <p className="mt-3 text-xs text-amber-600">
                Range contains active bookings, cannot block.
              </p>
            ) : null}
            {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Close
              </button>
              {hasClosure ? (
                <button
                  type="button"
                  className="border border-[color:var(--color-accent)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent)]"
                  onClick={unblockRange}
                  disabled={busy}
                >
                  Unblock
                </button>
              ) : (
                <button
                  type="button"
                  className="border border-[color:var(--color-fg)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg)]"
                  onClick={blockRange}
                  disabled={busy || hasBooking}
                >
                  Block
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function colorFor(status: Slot['status']): string {
  switch (status) {
    case 'free':
      return 'bg-[color:var(--color-court)]/15 hover:bg-[color:var(--color-court)]/30';
    case 'open':
      return 'bg-amber-200/60 hover:bg-amber-200';
    case 'confirmed':
      return 'bg-[color:var(--color-fg)]/70 hover:bg-[color:var(--color-fg)]/85';
    case 'closed':
      return 'bg-neutral-400/60 hover:bg-neutral-400/80';
  }
}
