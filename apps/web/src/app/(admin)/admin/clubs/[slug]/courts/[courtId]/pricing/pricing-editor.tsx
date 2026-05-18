'use client';

import { useState } from 'react';

interface Rule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  pricePerSlot: number;
  currency: string;
  isMemberOnly: boolean;
  isPeak: boolean;
  appliesToEditionOnly: boolean;
}

interface Labels {
  addRule: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  price: string;
  currency: string;
  peak: string;
  memberOnly: string;
  editionOnly: string;
  save: string;
  delete: string;
  overlapWarning: string;
  dayLabels: string[];
  noRules: string;
}

interface Draft {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  pricePerSlot: string;
  currency: string;
  isMemberOnly: boolean;
  isPeak: boolean;
  appliesToEditionOnly: boolean;
}

export function PricingEditor({
  courtId,
  initialRules,
  labels,
}: {
  courtId: string;
  initialRules: Rule[];
  labels: Labels;
}) {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [draft, setDraft] = useState<Draft>({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '12:00',
    pricePerSlot: '0',
    currency: 'PKR',
    isMemberOnly: false,
    isPeak: false,
    appliesToEditionOnly: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateDraft(): string | null {
    if (draft.endTime <= draft.startTime) return 'endTime must be after startTime';
    if (Number(draft.pricePerSlot) < 0) return 'price must be non-negative';
    if (!/^[A-Z]{3}$/.test(draft.currency)) return 'currency must be 3-letter ISO';
    return null;
  }

  function detectOverlap(d: Draft): boolean {
    return rules.some(
      (r) =>
        r.dayOfWeek === d.dayOfWeek &&
        r.startTime < d.endTime &&
        r.endTime > d.startTime,
    );
  }

  async function addRule() {
    const v = validateDraft();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/courts/${courtId}/pricing`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-feera-dev-admin': '1' },
        body: JSON.stringify({
          dayOfWeek: draft.dayOfWeek,
          startTime: draft.startTime,
          endTime: draft.endTime,
          pricePerSlot: Number(draft.pricePerSlot),
          currency: draft.currency,
          isMemberOnly: draft.isMemberOnly,
          isPeak: draft.isPeak,
          appliesToEditionOnly: draft.appliesToEditionOnly,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Rule };
      setRules([...rules, json.data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/courts/${courtId}/pricing/${id}`, {
        method: 'DELETE',
        headers: { 'x-feera-dev-admin': '1' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRules(rules.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const willOverlap = detectOverlap(draft);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-serif text-lg">{labels.addRule}</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          <label className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
            {labels.dayOfWeek}
            <select
              value={draft.dayOfWeek}
              onChange={(e) => setDraft({ ...draft, dayOfWeek: Number(e.target.value) })}
              className="mt-1 block w-full border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
            >
              {labels.dayLabels.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
            {labels.startTime}
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              className="mt-1 block w-full border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
            {labels.endTime}
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              className="mt-1 block w-full border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
            {labels.price}
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.pricePerSlot}
              onChange={(e) => setDraft({ ...draft, pricePerSlot: e.target.value })}
              className="mt-1 block w-full border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
            {labels.currency}
            <input
              type="text"
              maxLength={3}
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
              className="mt-1 block w-full border border-[color:var(--color-border)] bg-transparent px-2 py-1 text-sm"
            />
          </label>
          <div className="flex flex-col gap-1 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isPeak}
                onChange={(e) => setDraft({ ...draft, isPeak: e.target.checked })}
              />
              {labels.peak}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isMemberOnly}
                onChange={(e) => setDraft({ ...draft, isMemberOnly: e.target.checked })}
              />
              {labels.memberOnly}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.appliesToEditionOnly}
                onChange={(e) =>
                  setDraft({ ...draft, appliesToEditionOnly: e.target.checked })
                }
              />
              {labels.editionOnly}
            </label>
          </div>
        </div>
        {willOverlap ? (
          <p className="mt-3 text-xs text-amber-600">{labels.overlapWarning}</p>
        ) : null}
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        <div className="mt-3">
          <button
            type="button"
            onClick={addRule}
            disabled={busy}
            className="border border-[color:var(--color-fg)] px-4 py-2 text-xs uppercase tracking-[0.18em]"
          >
            {labels.save}
          </button>
        </div>
      </div>

      <div>
        <table className="w-full text-sm">
          <thead className="border-b border-[color:var(--color-border)] text-left">
            <tr>
              <th className="py-2 text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
                {labels.dayOfWeek}
              </th>
              <th className="py-2 text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
                {labels.startTime}
              </th>
              <th className="py-2 text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
                {labels.endTime}
              </th>
              <th className="py-2 text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
                {labels.price}
              </th>
              <th className="py-2 text-xs uppercase tracking-[0.15em] text-[color:var(--color-fg-muted)]">
                {labels.currency}
              </th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-border)]">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{labels.dayLabels[r.dayOfWeek]}</td>
                <td className="py-2">{r.startTime.slice(0, 5)}</td>
                <td className="py-2">{r.endTime.slice(0, 5)}</td>
                <td className="py-2">{r.pricePerSlot.toFixed(2)}</td>
                <td className="py-2">{r.currency}</td>
                <td className="py-2 text-end">
                  <button
                    type="button"
                    className="text-xs uppercase tracking-[0.18em] text-red-500"
                    onClick={() => deleteRule(r.id)}
                    disabled={busy}
                  >
                    {labels.delete}
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-sm text-[color:var(--color-fg-muted)]">
                  {labels.noRules}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
