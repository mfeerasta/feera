import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface PortfolioPosition {
  id: string;
  projectId: string | null;
  projectName: string | null;
  city: string | null;
  acquiredDate: string | null;
  stakePct: number | null;
  capitalInvested: number | null;
  latestEbitda: number | null;
  ebitdaAsOf: string | null;
  lifetimeDistributions: number | null;
  ytdDistributions: number | null;
  exitMultiple: number | null;
  notes: string | null;
}

interface Distribution {
  id: string;
  positionId: string;
  projectName: string | null;
  distributionDate: string;
  amount: number;
  notes: string | null;
}

interface PortfolioStats {
  totalInvested: number;
  totalDistributions: number;
  totalPaperEquity: number;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

function fmtMoney(cents: number | null | undefined): string {
  if (cents == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents);
}

function fmtPct(pct: number | null | undefined): string {
  if (pct == null) return '0.0%';
  return `${pct.toFixed(1)}%`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function impliedPaperValue(pos: PortfolioPosition): number {
  const ebitda = pos.latestEbitda ?? 0;
  const multiple = pos.exitMultiple ?? 8.0;
  const stake = pos.stakePct ?? 0;
  return (ebitda * multiple * stake) / 100;
}

export default async function EquityPortfolioPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/courts/portfolio');
  let positions: PortfolioPosition[] = [];
  let distributions: Distribution[] = [];
  let stats: PortfolioStats = {
    totalInvested: 0,
    totalDistributions: 0,
    totalPaperEquity: 0,
  };
  let error: string | null = null;

  if (res.ok) {
    const json = (await res.json()) as {
      data: PortfolioPosition[];
      stats: PortfolioStats;
      distributions: Distribution[];
    };
    positions = json.data;
    stats = json.stats;
    distributions = json.distributions;
  } else {
    error = `Failed to load portfolio (HTTP ${res.status}).`;
  }

  const statTiles = [
    { label: 'Total capital invested', value: fmtMoney(stats.totalInvested) },
    {
      label: 'Total distributions received',
      value: fmtMoney(stats.totalDistributions),
    },
    {
      label: 'Implied paper equity',
      value: fmtMoney(stats.totalPaperEquity),
    },
    { label: 'Blended IRR', value: 'Calculating...' },
  ];

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts Business
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Equity Portfolio
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Ownership stakes, distributions, and implied valuations.
        </p>
      </div>

      {/* Aggregate stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="border border-[color:var(--color-border)] p-4"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              {tile.label}
            </p>
            <p className="mt-2 font-serif text-2xl text-court">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Portfolio positions */}
      {error ? (
        <p className="mb-8 text-sm text-red-600">{error}</p>
      ) : positions.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-deep/60">
              No equity positions yet. Positions appear here when you take a
              stake in a project.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {positions.map((pos) => {
              const paperValue = impliedPaperValue(pos);
              return (
                <Card key={pos.id}>
                  <CardBody>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                      {pos.city ?? 'Location TBD'}
                    </p>
                    <h3 className="mt-1 font-serif text-xl tracking-tight">
                      {pos.projectName ?? 'Unnamed project'}
                    </h3>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">
                          Acquisition date
                        </span>
                        <span>{fmtDate(pos.acquiredDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">Stake</span>
                        <span>{fmtPct(pos.stakePct)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">
                          Capital invested
                        </span>
                        <span>{fmtMoney(pos.capitalInvested)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">Latest EBITDA</span>
                        <span>
                          {fmtMoney(pos.latestEbitda)}
                          {pos.ebitdaAsOf && (
                            <span className="ms-1 text-xs text-ink-deep/40">
                              as of {fmtDate(pos.ebitdaAsOf)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">
                          Distributions YTD
                        </span>
                        <span>{fmtMoney(pos.ytdDistributions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">
                          Distributions lifetime
                        </span>
                        <span>{fmtMoney(pos.lifetimeDistributions)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[color:var(--color-border)] pt-2">
                        <span className="text-ink-deep/50">
                          Implied paper value
                        </span>
                        <span className="font-medium text-court">
                          {fmtMoney(paperValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-deep/50">Exit multiple</span>
                        <span className="text-xs text-ink-deep/60">
                          {(pos.exitMultiple ?? 8.0).toFixed(1)}x EV/EBITDA
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Distributions history */}
          {distributions.length > 0 && (
            <div>
              <h2 className="mb-4 font-serif text-2xl tracking-tight">
                Distributions history
              </h2>
              <Card>
                <CardBody className="p-0">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Date</TH>
                        <TH>Project</TH>
                        <TH>Amount</TH>
                        <TH>Notes</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {distributions.map((dist) => (
                        <TR key={dist.id}>
                          <TD className="whitespace-nowrap text-ink-deep/60">
                            {fmtDate(dist.distributionDate)}
                          </TD>
                          <TD className="font-medium">
                            {dist.projectName ?? 'Unknown'}
                          </TD>
                          <TD className="whitespace-nowrap text-court">
                            {fmtMoney(dist.amount)}
                          </TD>
                          <TD className="text-ink-deep/60">
                            {dist.notes ?? '-'}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardBody>
              </Card>
            </div>
          )}
        </>
      )}
    </section>
  );
}
