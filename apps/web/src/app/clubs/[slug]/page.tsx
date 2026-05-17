import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, isNull, sql as dsql } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
import { withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const club = await loadClub(slug);
  if (!club) return { title: 'Club not found' };
  return {
    title: `${club.name} on Feera`,
    description: `Book a padel court at ${club.name} in ${club.city}.`,
  };
}

interface ClubDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  address: string | null;
  websiteUrl: string | null;
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

async function loadClub(slug: string): Promise<ClubDetail | null> {
  const rows = (await withRequestContext(null, (tx) =>
    tx
      .select({
        id: clubs.id,
        name: clubs.name,
        slug: clubs.slug,
        city: clubs.city,
        countryCode: clubs.countryCode,
        address: clubs.address,
        websiteUrl: clubs.websiteUrl,
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
      .where(
        and(
          eq(clubs.slug, slug),
          eq(clubs.isActive, true),
          isNull(clubs.deletedAt),
        ),
      )
      .limit(1),
  )) as ClubDetail[];
  return rows[0] ?? null;
}

async function loadCourtCount(clubId: string): Promise<number> {
  const rows = (await withRequestContext(null, (tx) =>
    tx
      .select({ count: dsql<number>`count(*)::int` })
      .from(courts)
      .where(and(eq(courts.clubId, clubId), eq(courts.isActive, true))),
  )) as Array<{ count: number }>;
  return rows[0]?.count ?? 0;
}

function amenityList(c: ClubDetail): string[] {
  const out: string[] = [];
  if (c.hasIndoor) out.push('Indoor courts');
  if (c.hasOutdoor) out.push('Outdoor courts');
  if (c.hasClimateControl) out.push('Climate control');
  if (c.hasPanoramic) out.push('Panoramic glass');
  if (c.hasShowerFacilities) out.push('Showers');
  if (c.hasParking) out.push('Parking');
  if (c.hasFoodService) out.push('Food service');
  if (c.hasWomenOnlyHours) out.push('Women only hours');
  if (c.hasPrayerRoom) out.push('Prayer room');
  return out;
}

export default async function PublicClubDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const club = await loadClub(slug);
  if (!club) notFound();
  const courtCount = await loadCourtCount(club.id);

  return (
    <div className="min-h-screen bg-cream text-ink-deep">
      <header className="border-b border-ink-deep/10 bg-paper">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            feera
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/clubs"
              className="text-ink-deep/70 transition-colors duration-150 hover:text-court"
            >
              All clubs
            </Link>
            <Link
              href="/sign-in"
              className="text-ink-deep/70 transition-colors duration-150 hover:text-court"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-[80px]">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">
            {club.city}, {club.countryCode}
          </p>
          <h1 className="mt-6 font-serif text-5xl leading-none tracking-tight text-cream md:text-6xl">
            {club.name}
          </h1>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`/play/clubs/${club.slug}/book`}
              className="inline-flex items-center justify-center border border-cream px-6 py-3 text-sm text-cream transition-colors duration-150 hover:border-court hover:text-court"
            >
              Book a slot
            </Link>
            {club.websiteUrl ? (
              <a
                href={club.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border border-cream/40 px-6 py-3 text-sm text-cream/80 transition-colors duration-150 hover:border-court hover:text-court"
              >
                Club website
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-[80px] md:grid-cols-3">
          <div className="md:col-span-2">
            <div
              aria-hidden
              className="aspect-[16/9] w-full border border-ink-deep/15 bg-paper"
            />
            <p className="mt-6 text-sm text-ink-deep/60">
              {courtCount} active court{courtCount === 1 ? '' : 's'}.
              {club.address ? ` ${club.address}.` : ''}
            </p>
          </div>
          <aside>
            <h2 className="font-serif text-2xl tracking-tight">Amenities</h2>
            <ul className="mt-6 flex flex-col gap-2 text-sm text-ink-deep/80">
              {amenityList(club).map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <span aria-hidden className="h-px w-4 bg-court" />
                  {a}
                </li>
              ))}
              {amenityList(club).length === 0 ? (
                <li className="text-ink-deep/50">No amenities listed.</li>
              ) : null}
            </ul>
          </aside>
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
