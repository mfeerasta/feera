import Link from 'next/link';
import { notFound } from 'next/navigation';
import { playFetch } from '@/lib/play/api-client';
import { EmptyState } from '@/components/play/empty-state';

interface CourtRow {
  id: string;
  name: string;
  surface: string;
  isIndoor: boolean;
  isClimateControlled: boolean;
  isPanoramic: boolean;
  isActive: boolean;
}

interface ClubDetail {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  address: string | null;
  hasIndoor: boolean;
  hasOutdoor: boolean;
  hasClimateControl: boolean;
  hasPanoramic: boolean;
  hasWomenOnlyHours: boolean;
  hasShowerFacilities: boolean;
  hasParking: boolean;
  hasFoodService: boolean;
  courts: CourtRow[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

const amenityKeys = [
  { key: 'hasIndoor', label: 'Indoor' },
  { key: 'hasOutdoor', label: 'Outdoor' },
  { key: 'hasClimateControl', label: 'Climate' },
  { key: 'hasPanoramic', label: 'Panoramic' },
  { key: 'hasWomenOnlyHours', label: 'Women only hrs' },
  { key: 'hasShowerFacilities', label: 'Showers' },
  { key: 'hasParking', label: 'Parking' },
  { key: 'hasFoodService', label: 'Food' },
] as const;

export default async function ClubDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await playFetch(`/api/v1/clubs/${encodeURIComponent(slug)}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Failed to load club (HTTP {res.status}).
        </p>
      </section>
    );
  }
  const { data: club } = (await res.json()) as { data: ClubDetail };
  const amenities = amenityKeys.filter(
    (a) => (club as unknown as Record<string, boolean>)[a.key],
  );
  const activeCourts = club.courts.filter((c) => c.isActive);

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <Link
            href="/play/clubs"
            className="text-xs uppercase tracking-[0.25em] text-cream/60 transition-colors duration-150 hover:text-court"
          >
            ← Clubs
          </Link>
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-cream/60">
            {club.countryCode} · {club.city}
          </p>
          <h1 className="mt-2 font-serif text-5xl tracking-tight text-cream md:text-6xl">
            {club.name}
          </h1>
          {club.address && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream/70">
              {club.address}
            </p>
          )}
          {amenities.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-1.5">
              {amenities.map((a) => (
                <li
                  key={a.key}
                  className="border border-cream/30 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-cream/70"
                >
                  {a.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Courts
          </p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight text-ink-deep">
            Pick a court.
          </h2>
          <div className="mt-10">
            {activeCourts.length === 0 ? (
              <EmptyState
                headline="No courts yet."
                body="This club has not published any active courts. Try another club nearby."
                ctaHref="/play/clubs"
                ctaLabel="Browse clubs"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeCourts.map((court) => (
                  <article
                    key={court.id}
                    className="flex flex-col gap-3 border border-ink-deep/15 bg-paper p-6"
                  >
                    <h3 className="font-serif text-2xl tracking-tight text-ink-deep">
                      {court.name}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-deep/60">
                      {court.surface.replace(/_/g, ' ')} ·{' '}
                      {court.isIndoor ? 'Indoor' : 'Outdoor'}
                      {court.isPanoramic ? ' · Panoramic' : ''}
                    </p>
                    <Link
                      href={`/play/clubs/${club.slug}/courts/${court.id}`}
                      className="mt-auto inline-flex items-center justify-center border border-ink-deep px-5 py-2.5 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
                    >
                      Book a slot
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
