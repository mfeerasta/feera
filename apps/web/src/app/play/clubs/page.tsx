import Link from 'next/link';
import { playFetch } from '@/lib/play/api-client';
import { EmptyState } from '@/components/play/empty-state';

interface ClubRow {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  hasIndoor: boolean;
  hasOutdoor: boolean;
  hasClimateControl: boolean;
  hasPanoramic: boolean;
  hasWomenOnlyHours: boolean;
  hasShowerFacilities: boolean;
  hasParking: boolean;
  hasFoodService: boolean;
}

interface PageProps {
  searchParams: Promise<{
    countryCode?: string;
    city?: string;
    amenity?: string | string[];
  }>;
}

const inputCls =
  'h-11 rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';

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

export default async function PlayClubsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const selectedAmenities = new Set(
    Array.isArray(sp.amenity) ? sp.amenity : sp.amenity ? [sp.amenity] : [],
  );

  const qs = new URLSearchParams({ limit: '60' });
  if (sp.countryCode) qs.set('country_code', sp.countryCode);
  if (sp.city) qs.set('city', sp.city);

  const res = await playFetch(`/api/v1/clubs?${qs.toString()}`);
  let clubs: ClubRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: ClubRow[] };
    clubs = json.data;
  } else {
    error = `Failed to load clubs (HTTP ${res.status}).`;
  }

  const filtered =
    selectedAmenities.size === 0
      ? clubs
      : clubs.filter((c) =>
          Array.from(selectedAmenities).every(
            (a) => (c as unknown as Record<string, boolean>)[a],
          ),
        );

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Browse
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight">
            Clubs near you.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Filter by city, country, and what each venue offers. Tap any club to
            see courts and live availability.
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <form
            method="get"
            className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr_auto]"
          >
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Country
              </span>
              <select
                name="countryCode"
                defaultValue={sp.countryCode ?? ''}
                className={inputCls}
              >
                <option value="">Any</option>
                <option value="PK">Pakistan</option>
                <option value="AE">UAE</option>
                <option value="SA">Saudi Arabia</option>
                <option value="PT">Portugal</option>
                <option value="ES">Spain</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                City
              </span>
              <input
                type="text"
                name="city"
                defaultValue={sp.city ?? ''}
                placeholder="Lahore"
                className={inputCls}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
              >
                Apply
              </button>
            </div>
            <fieldset className="md:col-span-3">
              <legend className="mb-3 text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Amenities
              </legend>
              <div className="flex flex-wrap gap-2">
                {amenityKeys.map((a) => {
                  const checked = selectedAmenities.has(a.key);
                  return (
                    <label
                      key={a.key}
                      className={`inline-flex cursor-pointer items-center gap-2 border px-3 py-2 text-xs transition-colors duration-150 ${
                        checked
                          ? 'border-court text-court'
                          : 'border-ink-deep/20 text-ink-deep/70 hover:border-ink-deep'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="amenity"
                        value={a.key}
                        defaultChecked={checked}
                        className="sr-only"
                      />
                      {a.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </form>

          {error ? (
            <p className="border border-red-500/40 bg-paper px-6 py-8 text-sm text-red-600">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <EmptyState
              headline="Nothing here yet."
              body="No clubs match these filters in this city. Try a wider net, or check back as we onboard more venues."
              ctaHref="/play"
              ctaLabel="Back to play"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((club) => {
                const amenities = amenityKeys.filter(
                  (a) =>
                    (club as unknown as Record<string, boolean>)[a.key],
                );
                return (
                  <article
                    key={club.id}
                    className="flex flex-col gap-4 border border-ink-deep/15 bg-paper p-6"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                        {club.countryCode} · {club.city}
                      </p>
                      <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink-deep">
                        {club.name}
                      </h2>
                    </div>
                    {amenities.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {amenities.slice(0, 5).map((a) => (
                          <li
                            key={a.key}
                            className="border border-ink-deep/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-ink-deep/60"
                          >
                            {a.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={`/play/clubs/${club.slug}`}
                      className="mt-auto text-sm text-ink-deep underline-offset-4 transition-colors duration-150 hover:text-court hover:underline"
                    >
                      View courts
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
