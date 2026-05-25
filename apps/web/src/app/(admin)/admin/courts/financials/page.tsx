import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody } from '@/components/ui/card';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const sections = [
  {
    title: 'Global assumptions',
    description: 'Editable assumption inputs will appear here in Phase 7.',
  },
  {
    title: '3-year P&L',
    description: 'Auto-calculated revenue by stream, EBITDA, margins.',
  },
  {
    title: 'Scenario save and compare',
    description: 'Save scenarios and diff between them.',
  },
  {
    title: 'Sweden stress test',
    description:
      '4-scenario stress test (base, mild -25%, moderate -50%, severe -75%).',
  },
];

export default async function FinancialsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts Business
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Financial model
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Live, editable 3-year model for Feera Courts.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardBody>
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                {s.title}
              </p>
              <p className="mt-4 text-sm text-ink-deep/60">{s.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
