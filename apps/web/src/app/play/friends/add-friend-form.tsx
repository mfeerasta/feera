'use client';

import { useActionState } from 'react';
import { searchAndSendAction, type SearchActionState } from './actions';

interface Labels {
  heading: string;
  placeholder: string;
  cta: string;
  sendCta: string;
  foundLabel: string;
  sentLabel: string;
}

const INITIAL: SearchActionState = { query: '' };

export function AddFriendForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState(searchAndSendAction, INITIAL);

  return (
    <div className="border border-[var(--color-border)] p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
        {labels.heading}
      </p>
      <form action={formAction} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
            {labels.placeholder}
          </span>
          <input
            type="text"
            name="query"
            defaultValue={state.query}
            placeholder={labels.placeholder}
            autoComplete="off"
            className="h-11 border border-[var(--color-border)] bg-transparent px-4 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center border border-[var(--color-fg)] px-6 text-sm transition-colors hover:border-court hover:text-court disabled:opacity-50"
        >
          {labels.cta}
        </button>
      </form>

      {state.error ? (
        <p className="mt-3 text-xs text-red-600">{state.error}</p>
      ) : null}

      {state.sent ? (
        <p className="mt-3 text-xs text-court">{labels.sentLabel}</p>
      ) : null}

      {state.found ? (
        <form action={formAction} className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
              {labels.foundLabel}
            </p>
            <p className="mt-1 font-serif text-lg">{state.found.displayName}</p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              {state.found.city ? `${state.found.city}, ` : ''}{state.found.countryCode}
            </p>
          </div>
          <input type="hidden" name="addresseeUserId" value={state.found.id} />
          <input type="hidden" name="query" value={state.query} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center border border-court bg-court px-6 text-sm text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {labels.sendCta}
          </button>
        </form>
      ) : null}
    </div>
  );
}
