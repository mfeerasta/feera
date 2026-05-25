'use client';

import { useState } from 'react';
import { trackCourtsEvent } from '@/lib/courts/analytics';

const PROJECT_STAGES = [
  'Idea',
  'Site under consideration',
  'Under construction',
  'Open and operating',
];

const CAPEX_RANGES = [
  'Under $500K',
  '$500K - $1M',
  '$1M - $2M',
  '$2M+',
  'Unknown',
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
      trackCourtsEvent('courts_lead_form_submitted', {
        capex_range: String(payload.capexRange ?? ''),
        project_stage: String(payload.projectStage ?? ''),
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
          We will review your project details and reach out within 48 hours.
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
          htmlFor="company"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Company / project name
        </label>
        <input
          id="company"
          name="company"
          type="text"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="targetCity"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Target city
        </label>
        <input
          id="targetCity"
          name="targetCity"
          type="text"
          required
          placeholder="e.g. Troy MI, Windsor ON"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court placeholder:text-[color:var(--color-fg-muted)]/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="projectStage"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Project stage
        </label>
        <select
          id="projectStage"
          name="projectStage"
          required
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select stage</option>
          {PROJECT_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="capexRange"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Capex range
        </label>
        <select
          id="capexRange"
          name="capexRange"
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
        >
          <option value="">Select range</option>
          {CAPEX_RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="message"
          className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
        >
          Message (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="border border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm text-[color:var(--color-fg)] outline-none focus:border-court"
          placeholder="Tell us about your project, site, goals, or any specific requirements."
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="feera-motion mt-2 border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90 disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Request a feasibility study'}
      </button>

      <p className="text-[10px] text-[color:var(--color-fg-muted)]">
        No commitment. We respond within 48 hours.
      </p>
    </form>
  );
}
