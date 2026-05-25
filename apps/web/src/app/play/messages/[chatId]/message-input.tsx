'use client';

import { useState, type FormEvent } from 'react';

export function MessageInput({ chatId }: { chatId: string }) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, kind: 'text' }),
      });
      if (!res.ok) {
        setError(`Send failed (HTTP ${res.status}).`);
      } else {
        setBody('');
        window.location.reload();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-3">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message..."
        autoComplete="off"
        className="flex-1 border border-[var(--color-border)] bg-transparent px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:border-court focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="inline-flex h-[46px] items-center border border-court bg-court px-6 text-xs uppercase tracking-[0.18em] text-cream hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Sending...' : 'Send'}
      </button>
      {error ? (
        <p className="absolute mt-14 text-xs text-red-600">{error}</p>
      ) : null}
    </form>
  );
}
