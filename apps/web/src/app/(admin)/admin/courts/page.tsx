import Link from 'next/link';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody } from '@/components/ui/card';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const kpis = [
  { label: 'Active leads', value: '0' },
  { label: 'Engagements signed YTD', value: '0' },
  { label: 'YTD Revenue', value: '$0' },
  { label: 'Capital deployed', value: '$0' },
  { label: 'Hardware courts placed', value: '0' },
  { label: 'Portfolio equity value', value: '$0' },
];

export default async function CourtsDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts vertical
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Courts</h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Operator dashboard for the Feera Courts business.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-[color:var(--color-border)] p-4"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              {kpi.label}
            </p>
            <p className="mt-2 font-serif text-2xl text-court">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              Pipeline overview
            </p>
            <p className="mt-4 text-sm text-ink-deep/60">
              Track court leads from first contact to signed engagement.
            </p>
            <Link
              href="/admin/courts/pipeline"
              className="mt-4 inline-block text-sm text-court transition-colors duration-150 hover:text-court/80"
            >
              View pipeline &rarr;
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              Revenue mix
            </p>
            <p className="mt-4 text-sm text-ink-deep/60">
              Revenue chart will render here when data is available.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              Cash position
            </p>
            <p className="mt-4 text-sm text-ink-deep/60">
              Cash position chart will render here when data is available.
            </p>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
