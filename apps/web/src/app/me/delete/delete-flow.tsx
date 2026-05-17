'use client';

import Link from 'next/link';
import { useState } from 'react';

type Stage = 'idle' | 'requested' | 'confirmed';

interface Props {
  initialToken: string | null;
}

export function DeleteAccountFlow({ initialToken }: Props) {
  const [stage, setStage] = useState<Stage>(initialToken ? 'requested' : 'idle');
  const [token, setToken] = useState<string>(initialToken ?? '');
  const [willDeleteAt, setWillDeleteAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/me/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? 'Failed to start deletion.');
        return;
      }
      setToken(json.data.confirmationToken);
      setWillDeleteAt(json.data.willDeleteAt);
      setStage('requested');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/me/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmationToken: token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? 'Failed to confirm.');
        return;
      }
      setWillDeleteAt(json.data.willDeleteAt);
      setStage('confirmed');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'idle') {
    return (
      <div>
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          We will email a confirmation link. Click it (or paste the token here)
          within 7 days to schedule the purge.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={request}
            disabled={busy}
            className="feera-motion inline-flex items-center border border-[color:var(--color-fg)] bg-[color:var(--color-fg)] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[color:var(--color-bg)] disabled:opacity-50"
          >
            {busy ? 'Sending...' : 'Request deletion'}
          </button>
          <Link
            href="/me/export"
            className="feera-motion inline-flex items-center text-sm uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Download my data first
          </Link>
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (stage === 'requested') {
    return (
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-6">
        <h2 className="font-serif text-xl tracking-tight">Confirm deletion</h2>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          A confirmation link has been emailed to you.
          {willDeleteAt
            ? ` Your account will be purged after ${new Date(willDeleteAt).toLocaleString()}.`
            : ''}
        </p>
        <label className="mt-6 block text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Confirmation token
        </label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-2 w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm"
          aria-label="Confirmation token"
        />
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !token}
            className="feera-motion inline-flex items-center border border-red-600 bg-red-600 px-6 py-3 text-sm uppercase tracking-[0.18em] text-white disabled:opacity-50"
          >
            {busy ? 'Confirming...' : 'Confirm deletion'}
          </button>
          <Link
            href="/me"
            className="feera-motion inline-flex items-center text-sm uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Cancel
          </Link>
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-6">
      <h2 className="font-serif text-xl tracking-tight">Scheduled</h2>
      <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
        Your account is scheduled for purge
        {willDeleteAt ? ` on ${new Date(willDeleteAt).toLocaleString()}.` : '.'}
        {' '}
        To cancel before then, sign in and email support@feera.ai.
      </p>
      <Link
        href="/"
        className="feera-motion mt-6 inline-flex items-center border border-[color:var(--color-fg)] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[color:var(--color-fg)] hover:bg-[color:var(--color-fg)] hover:text-[color:var(--color-bg)]"
      >
        Back to home
      </Link>
    </div>
  );
}
