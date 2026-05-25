import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
import { withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { LocaleSwitcher } from '@/components/locale-switcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Padel clubs on Feera',
  description: 'Browse padel clubs by city. Book a court in seconds.',
};

interface ClubRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  hasIndoor: boolean;
  hasOutdoor: boolean;
  hasClimateControl: boolean;
  hasPanoramic: boolean;
  hasPrayerRoom: boolean;
  hasShowerFacilities: boolean;
  hasParking: boolean;
  hasFoodService: boolean;
  hasWomenOnlyHours: boolean;
}

function amenityPills(c: ClubRow): string[] {
  const pills: string[] = [];
  if (c.hasIndoor) pills.push('Indoor');
  if (c.hasOutdoor) pills.push('Outdoor');
  if (c.hasClimateControl) pills.push('Climate');
  if (c.hasPanoramic) pills.push('Panoramic');
  if (c.hasShowerFacilities) pills.push('Showers');
  if (c.hasParking) pills.push('Parking');
  if (c.hasFoodService) pills.push('Food');
  if (c.hasWomenOnlyHours) pills.push('Women only hours');
  if (c.hasPrayerRoom) pills.push('Prayer room');
  return pills;
}

export default async function PublicClubsDirectoryPage() {
  const t = await getT();
  const rows = (await withRequestContext(null, (tx) =>
    tx
      .select({
        id: clubs.id,
        name: clubs.name,
        slug: clubs.slug,
        city: clubs.city,
        countryCode: clubs.countryCode,
        hasIndoor: clubs.hasIndoor,
        hasOutdoor: clubs.hasOutdoor,
        hasClimateControl: clubs.hasClimateControl,
        hasPanoramic: clubs.hasPanoramic,
        hasPrayerRoom: clubs.hasPrayerRoom,
        hasShowerFacilities: clubs.hasShowerFacilities,
        hasParking: clubs.hasParking,
        hasFoodService: clubs.hasFoodService,
        hasWomenOnlyHours: clubs.hasWomenOnlyHours,
      })
      .from(clubs)
      .where(and(eq(clubs.isActive, true), isNull(clubs.deletedAt)))
      .orderBy(asc(clubs.city), asc(clubs.name))
      .limit(200),
  )) as ClubRow[];

  const byCity = new Map<string, ClubRow[]>();
  for (const r of rows) {
    const key = `${r.city}, ${r.countryCode}`;
    const list = byCity.get(key) ?? [];
    list.push(r);
    byCity.set(key, list);
  }
  const cities = [...byCity.entries()];

  return (
    <div className="min-h-screen bg-cream text-ink-deep">
      <header className="border-b border-ink-deep/10 bg-paper">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            feera
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/clubs/onboard"
              className="text-ink-deep/70 transition-colors duration-150 hover:text-court"
            >
              {t('clubs.onboardTitle')}
            </Link>
            <Link
              href="/sign-in"
              className="text-ink-deep/70 transition-colors duration-150 hover:text-court"
            >
              {t('common.signIn')}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-[80px]">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">
            {t('nav.clubs')}
          </p>
          <h1 className="mt-6 max-w-[20ch] font-serif text-5xl leading-none tracking-tight text-cream md:text-6xl">
            {t('clubs.directoryTitle')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/70">
            {t('clubs.directorySubtitle')}
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-[80px]">
          {cities.length === 0 ? (
            <p className="text-sm text-ink-deep/60">
              {t('clubs.noResults')}{' '}
              <Link
                href="/clubs/onboard"
                className="text-ink-deep underline underline-offset-4 hover:text-court"
              >
                {t('clubs.onboardTitle')}
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-16">
              {cities.map(([city, list]) => (
                <div key={city}>
                  <h2 className="font-serif text-3xl tracking-tight">
                    {city}
                  </h2>
                  <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((club) => (
                      <Link
                        key={club.id}
                        href={`/clubs/${club.slug}`}
                        className="group flex flex-col gap-4 border border-ink-deep/15 bg-paper p-6 transition-colors duration-150 hover:border-court"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden border border-ink-deep/10 bg-cream">
                          <Image
                            src="/images/clubs/default-club-thumb.png"
                            alt={club.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                        <h3 className="font-serif text-2xl tracking-tight text-ink-deep group-hover:text-court">
                          {club.name}
                        </h3>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-deep/50">
                          {club.city}, {club.countryCode}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {amenityPills(club).map((p) => (
                            <span
                              key={p}
                              className="border border-ink-deep/15 px-2 py-1 text-xs text-ink-deep/70"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-ink-deep/10 bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12 text-xs text-ink-deep/50">
          Feera ©2026
        </div>
      </footer>
    </div>
  );
}
