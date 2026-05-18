import { and, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { Card, CardBody } from '@/components/ui/card';
import { listClubMembers } from '@/lib/club-admin/members';
import { formatMinor } from '@/lib/club-admin/revenue';
import { ClubSubNav } from '../sub-nav';
import { MembersTable } from './members-table';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function ClubMembersPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { slug } = await params;
  const t = await getT();
  const session = await getSession();

  const data = await withRequestContext(session, async (tx) => {
    const [club] = await tx
      .select({ id: clubs.id, defaultCurrency: clubs.defaultCurrency })
      .from(clubs)
      .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
      .limit(1);
    if (!club) return null;
    const members = await listClubMembers(tx, {
      clubId: club.id,
      daysBack: 365,
      limit: 500,
    });
    return { club, members };
  });

  if (!data) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)]">{t('clubAdmin.notFound')}</p>
    );
  }

  const rows = data.members.map((m) => ({
    ...m,
    spendDisplay: formatMinor(m.totalSpendMinor, m.currency ?? data.club.defaultCurrency),
  }));

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="font-serif text-4xl tracking-tight">{t('clubAdmin.membersTitle')}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        {t('clubAdmin.membersSubtitle')}
      </p>
      <ClubSubNav slug={slug} active="/members" t={t} />

      <Card>
        <CardBody className="p-0">
          <MembersTable slug={slug} rows={rows} t={{
            colName: t('clubAdmin.colName'),
            colBookings: t('clubAdmin.colBookings'),
            colMatches: t('clubAdmin.colMatches'),
            colSpend: t('clubAdmin.colSpend'),
            colLastActive: t('clubAdmin.colLastActive'),
            colFlags: t('clubAdmin.colFlags'),
            vip: t('clubAdmin.vip'),
            banned: t('clubAdmin.banned'),
            edit: t('clubAdmin.edit'),
            close: t('clubAdmin.close'),
            save: t('clubAdmin.save'),
            notes: t('clubAdmin.notes'),
            empty: t('clubAdmin.noMembers'),
          }} />
        </CardBody>
      </Card>
    </section>
  );
}
