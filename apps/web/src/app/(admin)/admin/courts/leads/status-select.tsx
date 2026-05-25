'use client';

import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'call-booked', label: 'Call booked' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'converted', label: 'Converted' },
] as const;

export function StatusSelect({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(newStatus: string) {
    const prev = status;
    setStatus(newStatus);
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/courts/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setStatus(prev);
        const json = await res.json().catch(() => null);
        alert(json?.message ?? 'Failed to update status.');
      }
    } catch {
      setStatus(prev);
      alert('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-ink-deep/20 bg-transparent px-2 py-1 text-xs text-ink-deep focus:outline-none focus:ring-1 focus:ring-court disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
