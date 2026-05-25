'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import type { Deal } from './kanban';

const inputCls =
  'h-10 w-full rounded-none border border-ink-deep/30 bg-transparent px-3 text-sm text-[color:var(--color-fg)] focus:border-court focus:outline-none';

const labelCls =
  'text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]';

interface NewDealFormProps {
  onCreated: (deal: Deal) => void;
  onCancel: () => void;
}

export function NewDealForm({ onCreated, onCancel }: NewDealFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      projectName: fd.get('projectName'),
      city: fd.get('city') || null,
      region: fd.get('region') || null,
      country: fd.get('country') || null,
      contactName: fd.get('contactName') || null,
      contactEmail: fd.get('contactEmail') || null,
      projectType: fd.get('projectType') || null,
      plannedCourts: fd.get('plannedCourts') ? Number(fd.get('plannedCourts')) : null,
      projectedCapex: fd.get('projectedCapex') ? Number(fd.get('projectedCapex')) : null,
      expectedConsultingFee: fd.get('expectedConsultingFee')
        ? Number(fd.get('expectedConsultingFee'))
        : null,
      equityOption: fd.get('equityOption') === 'on',
      notesMd: fd.get('notesMd') || null,
    };

    try {
      const res = await fetch('/api/v1/courts/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ message: 'Request failed.' }));
        setError(json.message ?? `HTTP ${res.status}`);
        setSubmitting(false);
        return;
      }

      const json = (await res.json()) as { data: Deal };
      onCreated(json.data);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Project name */}
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <span className={labelCls}>Project name *</span>
            <input
              type="text"
              name="projectName"
              required
              className={inputCls}
              placeholder="e.g. Bahria Town Padel Club"
            />
          </label>

          {/* Location */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>City</span>
            <input type="text" name="city" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Region</span>
            <input type="text" name="region" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Country</span>
            <input type="text" name="country" className={inputCls} />
          </label>

          {/* Contact */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Contact name</span>
            <input type="text" name="contactName" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Contact email</span>
            <input type="email" name="contactEmail" className={inputCls} />
          </label>

          {/* Project details */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Project type</span>
            <select name="projectType" className={inputCls}>
              <option value="">Select...</option>
              <option value="greenfield">Greenfield</option>
              <option value="conversion">Conversion</option>
              <option value="addition">Addition</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Planned courts</span>
            <input
              type="number"
              name="plannedCourts"
              min={1}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Projected capex (USD)</span>
            <input
              type="number"
              name="projectedCapex"
              min={0}
              className={inputCls}
            />
          </label>

          {/* Financials */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Expected consulting fee (USD)</span>
            <input
              type="number"
              name="expectedConsultingFee"
              min={0}
              className={inputCls}
            />
          </label>

          {/* Equity */}
          <label className="flex items-center gap-3 self-end">
            <input
              type="checkbox"
              name="equityOption"
              className="h-4 w-4 accent-court"
            />
            <span className={labelCls}>Equity option</span>
          </label>

          {/* Notes */}
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <span className={labelCls}>Notes</span>
            <textarea
              name="notesMd"
              rows={3}
              className="w-full rounded-none border border-ink-deep/30 bg-transparent px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-court focus:outline-none"
            />
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <Button type="submit" variant="inverted" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create deal'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
