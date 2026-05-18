import Link from 'next/link';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { Card, CardBody } from '@/components/ui/card';
import { ClubSubNav } from './sub-nav';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function ClubOverviewPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { slug } = await params;
  const t = await getT();
  const session = await getSession();

  const data = await withRequestContext(session, async (tx) => {
    const [club] = await tx
      .select()
      .from(clubs)
      .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
      .limit(1);
    if (!club) return null;
    const cts = await tx.select().from(courts).where(eq(courts.clubId, club.id));
    return { club, courts: cts };
  });

  if (!data) {
    return <p className="text-sm text-[color:var(--color-fg-muted)]">{t('clubAdmin.notFound')}</p>;
  }

  return (
    <section className="mx-auto max-w-5xl">
      <Link
        href="/admin/clubs"
        className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
      >
        {t('clubAdmin.backToClubs')}
      </Link>
      <h1 className="mt-4 font-serif text-4xl tracking-tight">{data.club.name}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        {data.club.city}, {data.club.countryCode}
      </p>

      <ClubSubNav slug={slug} active="/" t={t} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label={t('clubAdmin.kpiCourts')} value={String(data.courts.length)} />
        <KpiCard
          label={t('clubAdmin.kpiActive')}
          value={data.club.isActive ? t('clubAdmin.yes') : t('clubAdmin.no')}
        />
        <KpiCard
          label={t('clubAdmin.kpiFeePct')}
          value={`${(data.club.platformFeePct * 100).toFixed(1)}%`}
        />
        <KpiCard label={t('clubAdmin.kpiCurrency')} value={data.club.defaultCurrency} />
      </div>

      <Card className="mt-8">
        <CardBody>
          <h2 className="font-serif text-xl tracking-tight">{t('clubAdmin.courtsHeading')}</h2>
          <ul className="mt-4 divide-y divide-[color:var(--color-border)]">
            {data.courts.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span>{c.name}</span>
                <span className="flex gap-4">
                  <Link
                    href={`/admin/clubs/${slug}/courts/${c.id}/pricing`}
                    className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
                  >
                    {t('clubAdmin.linkPricing')}
                  </Link>
                </span>
              </li>
            ))}
            {data.courts.length === 0 ? (
              <li className="py-3 text-sm text-[color:var(--color-fg-muted)]">
                {t('clubAdmin.noCourts')}
              </li>
            ) : null}
          </ul>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/admin/clubs/${slug}/courts/new/bulk`}
              className="feera-motion text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
            >
              {t('clubAdmin.bulkImport')}
            </Link>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {label}
        </p>
        <p className="mt-2 font-serif text-2xl">{value}</p>
      </CardBody>
    </Card>
  );
}
