import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Kanban } from './kanban';
import type { Deal } from './kanban';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

export default async function CourtsPipelinePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/courts/deals');
  let deals: Deal[] = [];
  let error: string | null = null;

  if (res.ok) {
    const json = (await res.json()) as { data: Deal[] };
    deals = json.data;
  } else {
    error = `Failed to load deals (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-[1400px]">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Deal Pipeline
        </h1>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <Kanban initialDeals={deals} />
      )}
    </section>
  );
}
