import { asc, eq } from 'drizzle-orm';
import { courtPricingRules, courts } from '@feera/db';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { Card, CardBody } from '@/components/ui/card';
import { ClubSubNav } from '../../../sub-nav';
import { PricingEditor } from './pricing-editor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; courtId: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function CourtPricingPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { slug, courtId } = await params;
  const t = await getT();
  const session = await getSession();

  const data = await withRequestContext(session, async (tx) => {
    const [court] = await tx
      .select()
      .from(courts)
      .where(eq(courts.id, courtId))
      .limit(1);
    if (!court) return null;
    const rules = await tx
      .select()
      .from(courtPricingRules)
      .where(eq(courtPricingRules.courtId, courtId))
      .orderBy(asc(courtPricingRules.dayOfWeek), asc(courtPricingRules.startTime));
    return { court, rules };
  });

  if (!data) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)]">{t('clubAdmin.notFound')}</p>
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="font-serif text-4xl tracking-tight">{data.court.name}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        {t('clubAdmin.pricingSubtitle')}
      </p>
      <ClubSubNav slug={slug} active="/courts" t={t} />

      <Card>
        <CardBody>
          <PricingEditor
            courtId={courtId}
            initialRules={data.rules.map((r) => ({
              id: r.id,
              dayOfWeek: r.dayOfWeek,
              startTime: r.startTime,
              endTime: r.endTime,
              pricePerSlot: r.pricePerSlot,
              currency: r.currency,
              isMemberOnly: r.isMemberOnly,
              isPeak: r.isPeak,
              appliesToEditionOnly: r.appliesToEditionOnly,
            }))}
            labels={{
              addRule: t('clubAdmin.addPricingRule'),
              dayOfWeek: t('clubAdmin.dayOfWeek'),
              startTime: t('clubAdmin.startTime'),
              endTime: t('clubAdmin.endTime'),
              price: t('clubAdmin.price'),
              currency: t('clubAdmin.currency'),
              peak: t('clubAdmin.peak'),
              memberOnly: t('clubAdmin.memberOnly'),
              editionOnly: t('clubAdmin.editionOnly'),
              save: t('clubAdmin.save'),
              delete: t('clubAdmin.delete'),
              overlapWarning: t('clubAdmin.overlapWarning'),
              dayLabels: [
                t('clubAdmin.daySun'),
                t('clubAdmin.dayMon'),
                t('clubAdmin.dayTue'),
                t('clubAdmin.dayWed'),
                t('clubAdmin.dayThu'),
                t('clubAdmin.dayFri'),
                t('clubAdmin.daySat'),
              ],
              noRules: t('clubAdmin.noPricingRules'),
            }}
          />
        </CardBody>
      </Card>
    </section>
  );
}
