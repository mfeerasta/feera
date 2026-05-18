'use client';

import { useState } from 'react';

interface Row {
  userId: string;
  displayName: string | null;
  bookingCount: number;
  lastBookedAt: string | null;
  matchCount: number;
  lastPlayedAt: string | null;
  totalSpendMinor: number;
  currency: string | null;
  isVip: boolean;
  isBanned: boolean;
  notes: string | null;
  spendDisplay: string;
}

interface Labels {
  colName: string;
  colBookings: string;
  colMatches: string;
  colSpend: string;
  colLastActive: string;
  colFlags: string;
  vip: string;
  banned: string;
  edit: string;
  close: string;
  save: string;
  notes: string;
  empty: string;
}

export function MembersTable({ slug, rows, t }: { slug: string; rows: Row[]; t: Labels }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ isVip: boolean; isBanned: boolean; notes: string }>({
    isVip: false,
    isBanned: false,
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  function openEditor(r: Row) {
    setEditing(r);
    setDraft({ isVip: r.isVip, isBanned: r.isBanned, notes: r.notes ?? '' });
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/clubs/${slug}/members/${editing.userId}/notes`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'x-feera-dev-admin': '1' },
          body: JSON.stringify(draft),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[color:var(--color-border)] text-left">
            <tr>
              <th className="px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{t.colName}</th>
              <th className="px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{t.colBookings}</th>
              <th className="px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{t.colMatches}</th>
              <th className="px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{t.colSpend}</th>
              <th className="px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{t.colLastActive}</th>
              <th className="px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{t.colFlags}</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-border)]">
            {rows.map((r) => (
              <tr
                key={r.userId}
                className="feera-motion hover:bg-[color:var(--color-bg-fold)] cursor-pointer"
                onClick={() => openEditor(r)}
              >
                <td className="px-5 py-3">{r.displayName ?? r.userId.slice(0, 8)}</td>
                <td className="px-5 py-3">{r.bookingCount}</td>
                <td className="px-5 py-3">{r.matchCount}</td>
                <td className="px-5 py-3">{r.spendDisplay}</td>
                <td className="px-5 py-3 text-xs text-[color:var(--color-fg-muted)]">
                  {(r.lastBookedAt ?? r.lastPlayedAt ?? '—').slice(0, 10)}
                </td>
                <td className="px-5 py-3 text-xs">
                  {r.isVip ? (
                    <span className="me-2 inline-block border border-[color:var(--color-accent)] px-2 py-0.5 text-[color:var(--color-accent)]">
                      {t.vip}
                    </span>
                  ) : null}
                  {r.isBanned ? (
                    <span className="inline-block border border-red-500 px-2 py-0.5 text-red-600">
                      {t.banned}
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-end">
                  <button
                    type="button"
                    className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditor(r);
                    }}
                  >
                    {t.edit}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-sm text-[color:var(--color-fg-muted)]">
                  {t.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
        >
          <div className="w-[560px] max-w-[95vw] border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl">{editing.displayName ?? editing.userId.slice(0, 8)}</h3>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">{editing.spendDisplay}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]"
              >
                {t.close}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isVip}
                  onChange={(e) => setDraft({ ...draft, isVip: e.target.checked })}
                />
                {t.vip}
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isBanned}
                  onChange={(e) => setDraft({ ...draft, isBanned: e.target.checked })}
                />
                {t.banned}
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>{t.notes}</span>
                <textarea
                  rows={6}
                  className="border border-[color:var(--color-border)] bg-transparent p-2 text-sm"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </label>
            </div>

            {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="border border-[color:var(--color-fg)] px-4 py-2 text-xs uppercase tracking-[0.18em]"
                onClick={save}
                disabled={busy}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
