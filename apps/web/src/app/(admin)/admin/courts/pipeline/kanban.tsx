'use client';

import { useCallback, useState, type DragEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewDealForm } from './new-deal-form';

export interface Deal {
  id: string;
  projectName: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string | null;
  stage: string | null;
  contactName: string | null;
  contactEmail: string | null;
  projectType: string | null;
  plannedCourts: number | null;
  projectedCapex: number | null;
  expectedConsultingFee: number | null;
  equityOption: boolean | null;
  probability: number | null;
  notesMd: string | null;
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  'lead',
  'qualified',
  'proposal-sent',
  'engaged',
  'in-build',
  'opened',
  'stabilized',
] as const;

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  'proposal-sent': 'Proposal Sent',
  engaged: 'Engaged',
  'in-build': 'In Build',
  opened: 'Opened',
  stabilized: 'Stabilized',
};

function formatCurrency(cents: number | null): string {
  if (cents == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents);
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  const months = Math.floor(diffDays / 30);
  return `${months}mo ago`;
}

interface KanbanProps {
  initialDeals: Deal[];
}

export function Kanban({ initialDeals }: KanbanProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const dealsByStage = useCallback(
    (stage: string) => deals.filter((d) => (d.stage ?? 'lead') === stage),
    [deals],
  );

  const totalDeals = deals.length;
  const weightedPipeline = deals.reduce((sum, d) => {
    const fee = d.expectedConsultingFee ?? 0;
    const prob = (d.probability ?? 0) / 100;
    return sum + fee * prob;
  }, 0);

  const handleDragStart = (e: DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData('text/plain');
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    );

    try {
      const res = await fetch(`/api/v1/courts/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        // Revert on failure
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stage: deal.stage } : d)),
        );
      }
    } catch {
      // Revert on network error
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: deal.stage } : d)),
      );
    }
  };

  const handleDealCreated = (deal: Deal) => {
    setDeals((prev) => [deal, ...prev]);
    setShowForm(false);
  };

  return (
    <div>
      {/* Pipeline stats */}
      <div className="mb-8 flex flex-wrap items-center gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
            Total Deals
          </p>
          <p className="mt-1 font-serif text-2xl">{totalDeals}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
            Weighted Pipeline
          </p>
          <p className="mt-1 font-serif text-2xl">
            {formatCurrency(weightedPipeline)}
          </p>
        </div>
        {STAGES.map((stage) => {
          const count = dealsByStage(stage).length;
          if (count === 0) return null;
          return (
            <div key={stage}>
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                {STAGE_LABELS[stage]}
              </p>
              <p className="mt-1 font-serif text-2xl">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Add deal toggle */}
      <div className="mb-6">
        <Button
          variant="inverted"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel' : 'Add deal'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-8">
          <NewDealForm
            onCreated={handleDealCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDealsList = dealsByStage(stage);
          const isDragOver = dragOverStage === stage;

          return (
            <div
              key={stage}
              className={[
                'flex min-w-[240px] flex-1 flex-col',
                isDragOver
                  ? 'rounded-sm border-2 border-dashed border-court'
                  : 'border-2 border-transparent',
              ].join(' ')}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column header */}
              <div className="mb-3 border-b-2 border-court pb-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                  {STAGE_LABELS[stage]}
                </p>
                <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                  {stageDealsList.length} deal{stageDealsList.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3">
                {stageDealsList.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal.id)}
                    className="cursor-grab p-4 hover:border-court active:cursor-grabbing"
                  >
                    <p className="text-sm font-medium text-[color:var(--color-fg)]">
                      {deal.projectName}
                    </p>

                    {deal.city && (
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {deal.city}
                        {deal.country ? `, ${deal.country}` : ''}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {deal.expectedConsultingFee != null && (
                        <span className="text-xs font-medium">
                          {formatCurrency(deal.expectedConsultingFee)}
                        </span>
                      )}
                      {deal.plannedCourts != null && (
                        <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                          {deal.plannedCourts} court{deal.plannedCourts !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {deal.equityOption && (
                        <span className="border border-court px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-court">
                          Equity
                        </span>
                      )}
                      {deal.probability != null && (
                        <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                          {deal.probability}%
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[10px] text-[color:var(--color-fg-muted)]">
                      {relativeDate(deal.updatedAt ?? deal.createdAt)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
