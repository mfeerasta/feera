import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

interface Project {
  id: string;
  slug: string;
  projectName: string;
  city: string | null;
  region: string | null;
  country: string | null;
  status: string | null;
  totalCapex: number | null;
  ourEquityPct: number | null;
  healthBudget: string | null;
  healthSchedule: string | null;
  healthScope: string | null;
  healthDemand: string | null;
  nextMilestone: string | null;
  nextMilestoneDate: string | null;
  openingDate: string | null;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

function formatCurrency(cents: number | null): string {
  if (cents == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents);
}

function healthDot(value: string | null): string {
  if (value === 'green') return 'bg-green-500';
  if (value === 'amber') return 'bg-amber-500';
  if (value === 'red') return 'bg-red-500';
  return 'bg-gray-300';
}

function overallHealth(project: Project): string {
  const values = [
    project.healthBudget,
    project.healthSchedule,
    project.healthScope,
    project.healthDemand,
  ];
  if (values.includes('red')) return 'red';
  if (values.includes('amber')) return 'amber';
  return 'green';
}

export default async function CourtsProjectsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/courts/projects');
  let projects: Project[] = [];
  let error: string | null = null;

  if (res.ok) {
    const json = (await res.json()) as { data: Project[] };
    projects = json.data;
  } else {
    error = `Failed to load projects (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-[1400px]">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Projects</h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Active court build and consulting projects.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : projects.length === 0 ? (
        <div className="border border-[color:var(--color-border)] p-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            No projects yet. Projects are created from deals in the pipeline.
          </p>
          <Link
            href="/admin/courts/pipeline"
            className="mt-4 inline-block text-sm text-court transition-colors duration-150 hover:text-court/80"
          >
            Go to pipeline
          </Link>
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Project</TH>
              <TH>City</TH>
              <TH>Status</TH>
              <TH>Health</TH>
              <TH>Capex</TH>
              <TH>Equity %</TH>
              <TH>Next Milestone</TH>
              <TH>Opening Date</TH>
            </TR>
          </THead>
          <TBody>
            {projects.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link
                    href={`/admin/courts/projects/${p.slug}`}
                    className="font-medium text-court hover:text-court/80"
                  >
                    {p.projectName}
                  </Link>
                </TD>
                <TD>
                  {p.city ?? '-'}
                  {p.country ? `, ${p.country}` : ''}
                </TD>
                <TD>
                  <span className="text-xs uppercase tracking-wider">
                    {p.status ?? 'active'}
                  </span>
                </TD>
                <TD>
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${healthDot(overallHealth(p))}`}
                    title={overallHealth(p)}
                  />
                </TD>
                <TD>{formatCurrency(p.totalCapex)}</TD>
                <TD>{p.ourEquityPct != null ? `${p.ourEquityPct}%` : '-'}</TD>
                <TD>
                  {p.nextMilestone ? (
                    <span>
                      {p.nextMilestone}
                      {p.nextMilestoneDate ? (
                        <span className="ms-2 text-xs text-[color:var(--color-fg-muted)]">
                          {p.nextMilestoneDate}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    '-'
                  )}
                </TD>
                <TD>{p.openingDate ?? '-'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}
