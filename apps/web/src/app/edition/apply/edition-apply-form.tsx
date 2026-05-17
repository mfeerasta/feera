'use client';

import { useState } from 'react';

type State =
  | { phase: 'form'; error?: string }
  | { phase: 'submitting' }
  | { phase: 'submitted' };

export function EditionApplyForm() {
  const [state, setState] = useState<State>({ phase: 'form' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ phase: 'submitting' });
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/v1/edition/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fullName: data.get('fullName'),
          email: data.get('email'),
          phone: data.get('phone'),
          city: data.get('city'),
          referrer: data.get('referrer'),
          note: data.get('note'),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          phase: 'form',
          error: body.message ?? 'Could not submit. Try again.',
        });
        return;
      }
      setState({ phase: 'submitted' });
    } catch (err) {
      setState({
        phase: 'form',
        error: err instanceof Error ? err.message : 'Network error.',
      });
    }
  }

  if (state.phase === 'submitted') {
    return (
      <div className="border border-brass/40 p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-brass">Received</p>
        <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-cream">
          Thank you.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          We will be in touch within a week. Until then, play well.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <Field label="Full name" name="fullName" required />
      <Field label="Email" name="email" type="email" required />
      <Field label="Phone (E.164)" name="phone" type="tel" placeholder="+923001234567" />
      <Field label="City" name="city" placeholder="Lahore" required />
      <Field label="Introduced by" name="referrer" placeholder="Member name or club" />

      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.25em] text-cream/60">
          Why Edition?
        </span>
        <textarea
          name="note"
          rows={5}
          required
          className="border border-cream/30 bg-transparent px-4 py-3 text-cream placeholder-cream/30 outline-none transition-colors focus:border-brass"
        />
      </label>

      {state.phase === 'form' && state.error ? (
        <p className="text-xs uppercase tracking-[0.2em] text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state.phase === 'submitting'}
        className="self-start border border-brass px-10 py-4 text-xs uppercase tracking-[0.25em] text-brass transition-colors hover:bg-brass hover:text-ink-deep disabled:opacity-50"
      >
        {state.phase === 'submitting' ? 'Sending…' : 'Submit application'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.25em] text-cream/60">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="border border-cream/30 bg-transparent px-4 py-3 text-cream placeholder-cream/30 outline-none transition-colors focus:border-brass"
      />
    </label>
  );
}
