import { and, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  formatMinor,
  getRecentPayments,
  getRevenueSummary,
  getWeeklyBuckets,
} from '@/lib/club-admin/revenue';
import { ClubSubNav } from '../sub-nav';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function ClubRevenuePage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { slug } = await params;
  const t = await getT();
  const session = await getSession();

  const data = await withRequestContext(session, async (tx) => {
    const [club] = await tx
      .select({ id: clubs.id, name: clubs.name, defaultCurrency: clubs.defaultCurrency })
      .from(clubs)
      .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
      .limit(1);
    if (!club) return null;
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [summary, weekly, recent] = await Promise.all([
      getRevenueSummary(tx, { clubId: club.id, from, to }),
      getWeeklyBuckets(tx, { clubId: club.id, weeks: 13 }),
      getRecentPayments(tx, { clubId: club.id, limit: 20 }),
    ]);
    return { club, summary, weekly, recent };
  });

  if (!data) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)]">{t('clubAdmin.notFound')}</p>
    );
  }
  const currency = data.summary.currency ?? data.club.defaultCurrency;

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="font-serif text-4xl tracking-tight">{t('clubAdmin.revenueTitle')}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        {t('clubAdmin.revenueSubtitle')}
      </p>
      <ClubSubNav slug={slug} active="/revenue" t={t} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label={t('clubAdmin.kpiGross')}
          value={formatMinor(data.summary.grossMinor, currency)}
          hint={`${t('clubAdmin.bookingsCount')}: ${data.summary.bookingCount}`}
        />
        <KpiCard
          label={t('clubAdmin.kpiPlatformFees')}
          value={formatMinor(data.summary.platformFeeMinor, currency)}
        />
        <KpiCard
          label={t('clubAdmin.kpiNet')}
          value={formatMinor(data.summary.netMinor, currency)}
          hint={`${t('clubAdmin.refunds')}: ${formatMinor(data.summary.refundsMinor, currency)}`}
        />
        <KpiCard
          label={t('clubAdmin.kpiAvgBasket')}
          value={formatMinor(data.summary.avgBasketMinor, currency)}
          hint={`${t('clubAdmin.momGrowth')}: ${data.summary.momGrowthPct.toFixed(1)}%`}
        />
      </div>

      <Card className="mt-8">
        <CardBody>
          <h2 className="font-serif text-xl tracking-tight">
            {t('clubAdmin.weeklyChart')}
          </h2>
          <WeeklyBarChart weekly={data.weekly} currency={currency} />
        </CardBody>
      </Card>

      <Card className="mt-8">
        <CardBody className="p-0">
          <h2 className="px-6 pt-6 pb-4 font-serif text-xl tracking-tight">
            {t('clubAdmin.recentPayments')}
          </h2>
          <Table>
            <THead>
              <TR>
                <TH>{t('clubAdmin.colDate')}</TH>
                <TH>{t('clubAdmin.colPayer')}</TH>
                <TH>{t('clubAdmin.colCourt')}</TH>
                <TH>{t('clubAdmin.colAmount')}</TH>
                <TH>{t('clubAdmin.colStatus')}</TH>
                <TH>{t('clubAdmin.colRefund')}</TH>
              </TR>
            </THead>
            <TBody>
              {data.recent.map((p) => (
                <TR key={p.id}>
                  <TD>{p.paidAt ? p.paidAt.slice(0, 10) : '—'}</TD>
                  <TD>{p.payerName ?? '—'}</TD>
                  <TD>{p.courtName ?? '—'}</TD>
                  <TD>
                    {formatMinor(Math.round(p.amount * 100), p.currency)}
                  </TD>
                  <TD className="text-xs uppercase tracking-[0.15em]">{p.status}</TD>
                  <TD>
                    {p.refundedAmount > 0
                      ? formatMinor(Math.round(p.refundedAmount * 100), p.currency)
                      : '—'}
                  </TD>
                </TR>
              ))}
              {data.recent.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-sm text-[color:var(--color-fg-muted)]">
                    {t('clubAdmin.noPayments')}
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </section>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {label}
        </p>
        <p className="mt-2 font-serif text-2xl">{value}</p>
        {hint ? (
          <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">{hint}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function WeeklyBarChart({
  weekly,
  currency,
}: {
  weekly: { weekStart: string; grossMinor: number }[];
  currency: string;
}) {
  const maxV = Math.max(1, ...weekly.map((w) => w.grossMinor));
  const W = 720;
  const H = 200;
  const padding = 28;
  const barCount = Math.max(weekly.length, 1);
  const barW = (W - padding * 2) / barCount;

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[720px]" role="img" aria-label="Weekly revenue">
        <line
          x1={padding}
          y1={H - padding}
          x2={W - padding}
          y2={H - padding}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        {weekly.map((w, i) => {
          const h = Math.round(((H - padding * 2) * w.grossMinor) / maxV);
          const x = padding + i * barW + 2;
          const y = H - padding - h;
          return (
            <g key={w.weekStart}>
              <rect
                x={x}
                y={y}
                width={Math.max(2, barW - 4)}
                height={h}
                fill="currentColor"
                fillOpacity={0.85}
              >
                <title>
                  {w.weekStart}: {formatMinor(w.grossMinor, currency)}
                </title>
              </rect>
              <text
                x={x + barW / 2 - 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {w.weekStart.slice(5)}
              </text>
            </g>
          );
        })}
        {weekly.length === 0 ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fillOpacity={0.5}>
            No data
          </text>
        ) : null}
      </svg>
    </div>
  );
}
