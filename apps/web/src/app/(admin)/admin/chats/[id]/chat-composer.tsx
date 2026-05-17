'use client';

import { useState, type FormEvent } from 'react';

export function ChatComposer({ chatId }: { chatId: string }) {
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
        headers: {
          'content-type': 'application/json',
          'x-feera-dev-admin': '1',
        },
        body: JSON.stringify({ body, kind: 'text' }),
      });
      if (!res.ok) {
        setError(`Send failed (HTTP ${res.status}).`);
      } else {
        setBody('');
        window.location.reload();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Type a message"
        className="w-full rounded-none border border-ink-deep/30 bg-transparent px-4 py-3 text-sm text-ink-deep focus:border-court focus:outline-none"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-end inline-flex h-10 items-center rounded-none border border-ink-deep bg-transparent px-5 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court disabled:opacity-50"
      >
        {pending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
