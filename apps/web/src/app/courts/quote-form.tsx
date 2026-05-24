'use client';

import { useState } from 'react';

const COURT_COUNTS = ['2', '4', '6', '8', '10+'];
const COURT_TYPES = ['Full Panoramic', 'Semi-Panoramic', 'Standard Classic', 'Not sure yet'];
const ENVIRONMENTS = ['Outdoor', 'Indoor', 'Covered outdoor', 'Not sure yet'];
const LOCATIONS = [
  'Ontario, Canada',
  'British Columbia, Canada',
  'Alberta, Canada',
  'Quebec, Canada',
  'Other Canada',
  'Florida, USA',
  'California, USA',
  'Texas, USA',
  'New York, USA',
  'Other USA',
];
const BUDGETS = [
  'Under $250K',
  '$250K - $500K',
  '$500K - $1M',
  '$1M - $2M',
  '$2M+',
  'Need guidance',
];
const TIMELINES = [
  'Within 3 months',
  '3-6 months',
  '6-12 months',
  '12+ months',
  'Exploring options',
];

export function QuoteForm() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);

    const data = new FormData(e.currentTarget);
    const payload = Object.fromEntries(data.entries());

    try {
      await fetch('/api/v1/courts/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 border border-court p-12 text-center">
        <p className="font-serif text-3xl text-court">Received.</p>
        <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
          We will review your project details and reach out within 48 hours to
          schedule your free consultation.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 border border-[color:var(--color-border)] p-8"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="name"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="phone"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="location"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Location
        </label>
        <select
          id="location"
          name="location"
          required
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select location</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="courts"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Number of courts
        </label>
        <select
          id="courts"
          name="courts"
          required
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select count</option>
          {COURT_COUNTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="courtType"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Court type
        </label>
        <select
          id="courtType"
          name="courtType"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select type</option>
          {COURT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="environment"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Indoor or outdoor
        </label>
        <select
          id="environment"
          name="environment"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select environment</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="budget"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Budget range
        </label>
        <select
          id="budget"
          name="budget"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select range</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="timeline"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Timeline
        </label>
        <select
          id="timeline"
          name="timeline"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select timeline</option>
          {TIMELINES.map((tl) => (
            <option key={tl} value={tl}>
              {tl}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="notes"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Additional details (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
          placeholder="Tell us about your site, goals, existing facility, or any specific requirements."
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="feera-motion mt-2 border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90 disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Request free consultation'}
      </button>

      <p className="text-[10px] text-[color:var(--color-fg-muted)]">
        No commitment. We respond within 48 hours.
      </p>
    </form>
  );
}
