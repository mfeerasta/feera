import Image from 'next/image';
import Link from 'next/link';
import { playFetch } from '@/lib/play/api-client';
import { EmptyState } from '@/components/play/empty-state';

interface CoachRow {
  userId: string;
  coachId: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  hourlyRate: number;
  hourlyRateMax: number | null;
  currency: string;
  averageRating: number | null;
  ratingCount: number;
  reliabilityPct: number | null;
  isEditionEndorsed: boolean;
  responseTimeAvgHours: number;
}

interface PageProps {
  searchParams: Promise<{
    city?: string;
    country?: string;
    language?: string;
    specialty?: string;
    hourlyRateMax?: string;
    sort?: 'rating' | 'reliability' | 'priceAsc' | 'priceDesc';
  }>;
}

const inputCls =
  'h-11 rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';

function formatRate(min: number, max: number | null, currency: string): string {
  if (max && max > min) {
    return `${currency} ${Math.round(min)} to ${Math.round(max)} / hr`;
  }
  return `${currency} ${Math.round(min)} / hr`;
}

export default async function PlayCoachesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ limit: '60', sort: sp.sort ?? 'rating' });
  if (sp.country) qs.set('country', sp.country);
  if (sp.city) qs.set('city', sp.city);
  if (sp.language) qs.set('language', sp.language);
  if (sp.specialty) qs.set('specialty', sp.specialty);
  if (sp.hourlyRateMax) qs.set('hourlyRateMax', sp.hourlyRateMax);

  const res = await playFetch(`/api/v1/coaches?${qs.toString()}`);
  let coaches: CoachRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: CoachRow[] };
    coaches = json.data;
  } else {
    error = `Failed to load coaches (HTTP ${res.status}).`;
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Marketplace
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight">
            Coaches, verified.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Every coach on Feera is vetted by our team. Filter by language, city, specialty, and rate. Book a 30 to 240 minute session in two taps.
          </p>
          <p className="mt-6 text-xs text-cream/60">
            Want to coach on Feera?{' '}
            <Link
              href="/play/coach-onboard"
              className="text-cream underline-offset-4 hover:text-court hover:underline"
            >
              Apply to be listed.
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <form
            method="get"
            className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr_160px_160px_auto]"
          >
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Country
              </span>
              <select
                name="country"
                defaultValue={sp.country ?? ''}
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
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Language
              </span>
              <input
                type="text"
                name="language"
                defaultValue={sp.language ?? ''}
                placeholder="English"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Specialty
              </span>
              <input
                type="text"
                name="specialty"
                defaultValue={sp.specialty ?? ''}
                placeholder="Tournament prep"
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
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Max rate per hour
              </span>
              <input
                type="number"
                name="hourlyRateMax"
                min="1"
                step="1"
                defaultValue={sp.hourlyRateMax ?? ''}
                placeholder="e.g. 5000"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Sort
              </span>
              <select name="sort" defaultValue={sp.sort ?? 'rating'} className={inputCls}>
                <option value="rating">Highest rated</option>
                <option value="reliability">Most reliable</option>
                <option value="priceAsc">Price low to high</option>
                <option value="priceDesc">Price high to low</option>
              </select>
            </label>
          </form>

          {error ? (
            <p className="border border-red-500/40 bg-paper px-6 py-8 text-sm text-red-600">
              {error}
            </p>
          ) : coaches.length === 0 ? (
            <EmptyState
              headline="No coaches match these filters."
              body="Try a wider city or remove the rate cap. Coaches are added daily as they pass verification."
              ctaHref="/play/coaches"
              ctaLabel="Reset filters"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coaches.map((c) => (
                <article
                  key={c.userId}
                  className="flex flex-col gap-4 border border-ink-deep/15 bg-paper p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-ink-deep/15 bg-cream">
                      <Image
                        src="/images/coaches/default-coach-avatar.png"
                        alt={c.displayName}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                        {c.countryCode}
                        {c.city ? ` · ${c.city}` : ''}
                      </p>
                      <h2 className="mt-1 font-serif text-2xl leading-tight tracking-tight text-ink-deep">
                        {c.displayName}
                      </h2>
                      <p className="mt-2 text-xs text-ink-deep/60">
                        {c.averageRating != null
                          ? `${c.averageRating.toFixed(1)} stars (${c.ratingCount})`
                          : 'New coach'}
                        {c.reliabilityPct != null && c.reliabilityPct > 0
                          ? ` · ${c.reliabilityPct}% reliability`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {c.bio && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink-deep/75">
                      {c.bio}
                    </p>
                  )}

                  {c.specialties.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {c.specialties.slice(0, 4).map((s) => (
                        <li
                          key={s}
                          className="border border-ink-deep/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-ink-deep/60"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}

                  {c.languages.length > 0 && (
                    <p className="text-xs text-ink-deep/60">
                      Speaks {c.languages.slice(0, 4).join(', ')}
                    </p>
                  )}

                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <div>
                      <p className="font-serif text-xl text-ink-deep">
                        {formatRate(c.hourlyRate, c.hourlyRateMax, c.currency)}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                        Replies in {c.responseTimeAvgHours}h
                        {c.isEditionEndorsed ? ' · Edition endorsed' : ''}
                      </p>
                    </div>
                    <Link
                      href={`/play/coaches/${c.userId}`}
                      className="inline-flex h-10 items-center border border-ink-deep px-4 text-xs uppercase tracking-[0.15em] text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
                    >
                      Book a session
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
