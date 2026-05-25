import { gateAdmin } from '@/lib/admin/gate';
import { adminFetch } from '@/lib/admin/api-client';
import { FinancialModel, type SavedScenario } from './financial-model';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

export default async function FinancialsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  let scenarios: SavedScenario[] = [];
  try {
    const res = await adminFetch('/api/v1/courts/financials/scenarios');
    if (res.ok) {
      const json = await res.json();
      scenarios = json.data ?? [];
    }
  } catch {
    // Non-critical: model works without saved scenarios
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts Business
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Financial model
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Live, editable 3-year model for Feera Courts. Change any assumption to see instant impact.
        </p>
      </div>

      <FinancialModel initialScenarios={scenarios} />
    </section>
  );
}
