'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type DisputeKind = 'wrong_score' | 'wrong_winner' | 'ineligible_player' | 'other';

const KIND_LABEL: Record<DisputeKind, string> = {
  wrong_score: 'The score is wrong',
  wrong_winner: 'The winning team is wrong',
  ineligible_player: 'One of the players should not have been on court',
  other: 'Something else is off',
};

const KIND_ORDER: DisputeKind[] = [
  'wrong_score',
  'wrong_winner',
  'ineligible_player',
  'other',
];

export function DisputeForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<DisputeKind>('wrong_score');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setErr('Please add at least a sentence so we can understand the issue.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/dispute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind, reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Could not submit (HTTP ${res.status}).`);
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="border border-court bg-paper px-6 py-8 text-sm text-ink-deep">
        <p className="font-serif text-xl tracking-tight">
          Dispute submitted.
        </p>
        <p className="mt-2 text-ink-deep/70">
          An admin will review and respond. The match has been flagged so
          ratings are not finalised in the meantime.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 border border-ink-deep/15 bg-paper px-6 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          What is wrong
        </p>
        <div className="mt-3 space-y-2">
          {KIND_ORDER.map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-start gap-3 border border-ink-deep/15 px-4 py-3 text-sm text-ink-deep transition-colors duration-150 hover:border-court has-[:checked]:border-court has-[:checked]:bg-court/5"
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="mt-1 accent-court"
              />
              <span>{KIND_LABEL[k]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="dispute-note" className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Explain what happened
        </label>
        <textarea
          id="dispute-note"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          maxLength={1000}
          required
          className="mt-2 w-full rounded-none border border-ink-deep/20 bg-transparent px-4 py-3 text-sm text-ink-deep focus-visible:border-court focus-visible:outline-none"
          placeholder="Tell the admin what should be corrected. Include the actual score if you have it."
        />
        <p className="mt-1 text-xs text-ink-deep/50">
          {reason.length} of 1000 characters.
        </p>
      </div>

      {err && (
        <p className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {err}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="submit"
          size="md"
          variant="inverted"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit dispute'}
        </Button>
      </div>
    </form>
  );
}
