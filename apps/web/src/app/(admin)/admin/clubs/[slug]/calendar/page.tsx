import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import {
  buildSlotGrid,
  loadCalendarData,
  SLOT_MINUTES,
} from '@/lib/club-admin/calendar';
import { ClubSubNav } from '../sub-nav';
import { CalendarGrid } from './calendar-grid';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string; start?: string; days?: string }>;
}

export default async function ClubCalendarPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { slug } = await params;
  const t = await getT();
  const session = await getSession();

  // Anchor at today 00:00 UTC. Day count default 14.
  const now = new Date();
  const startAnchor = sp.start
    ? new Date(sp.start)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.min(Math.max(Number(sp.days ?? '14') || 14, 1), 30);

  const data = await withRequestContext(session, (tx) =>
    loadCalendarData(tx, { clubSlug: slug, start: startAnchor, days }),
  );
  if (!data) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)]">{t('clubAdmin.notFound')}</p>
    );
  }

  const grid = buildSlotGrid({
    courtIds: data.courts.map((c) => c.id),
    start: data.start,
    days: data.days,
    bookings: data.bookings,
    closures: data.closures,
  });

  return (
    <section className="mx-auto max-w-7xl">
      <h1 className="font-serif text-4xl tracking-tight">{t('clubAdmin.calendarTitle')}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        {t('clubAdmin.calendarSubtitle')}
      </p>
      <ClubSubNav slug={slug} active="/calendar" t={t} />

      <Legend t={t} />

      <CalendarGrid
        slug={slug}
        slotMinutes={SLOT_MINUTES}
        days={data.days}
        startIso={data.start.toISOString()}
        courts={data.courts}
        grid={grid.map((s) => ({
          courtId: s.courtId,
          startAt: s.startAt.toISOString(),
          endAt: s.endAt.toISOString(),
          status: s.status,
          bookingId: s.bookingId,
          closureId: s.closureId,
          reason: s.reason ?? null,
        }))}
      />
    </section>
  );
}

function Legend({ t }: { t: (k: string) => string }) {
  return (
    <div className="mb-3 flex flex-wrap gap-4 text-xs">
      <Swatch className="bg-[color:var(--color-court)]/15" label={t('clubAdmin.legendFree')} />
      <Swatch className="bg-amber-200/40" label={t('clubAdmin.legendOpen')} />
      <Swatch className="bg-[color:var(--color-fg)]/70" label={t('clubAdmin.legendConfirmed')} />
      <Swatch className="bg-neutral-300 bg-stripes" label={t('clubAdmin.legendClosed')} />
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-3 w-3 border border-[color:var(--color-border)] ${className}`} />
      {label}
    </span>
  );
}
