import Link from 'next/link';
import { playFetch } from '@/lib/play/api-client';
import { EmptyState } from '@/components/play/empty-state';

interface OpenBooking {
  id: string;
  courtId: string;
  courtName?: string;
  clubName?: string;
  clubSlug?: string;
  city?: string;
  startAt: string;
  endAt: string;
  seatsOpen: number;
  maxParticipants: number;
  organizerName?: string;
  organizerRatingDisplay?: number | null;
  requiredLevelMin?: number | null;
  requiredLevelMax?: number | null;
  genderPreference: 'open' | 'men_only' | 'women_only' | 'mixed';
}

interface PageProps {
  searchParams: Promise<{
    city?: string;
    from?: string;
    to?: string;
    levelMin?: string;
    levelMax?: string;
    gender?: string;
  }>;
}

const inputCls =
  'h-11 rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';

function fmtRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const datePart = s.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timePart = `${s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return `${datePart} · ${timePart}`;
}

export default async function OpenMatchesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ limit: '60' });
  if (sp.city) qs.set('city', sp.city);
  if (sp.from) qs.set('from', sp.from);
  if (sp.to) qs.set('to', sp.to);
  if (sp.levelMin) qs.set('levelMin', sp.levelMin);
  if (sp.levelMax) qs.set('levelMax', sp.levelMax);
  if (sp.gender) qs.set('gender', sp.gender);

  const res = await playFetch(`/api/v1/bookings/open?${qs.toString()}`);
  let rows: OpenBooking[] = [];
  let error: string | null = null;
  if (res.ok) {
    const j = (await res.json()) as { data: OpenBooking[] };
    rows = j.data;
  } else if (res.status === 404) {
    error = null; // endpoint not deployed yet, treat as empty.
  } else {
    error = `Failed to load open matches (HTTP ${res.status}).`;
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Open matches
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-cream md:text-6xl">
            Find a game tonight.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Bookings with seats open in your city. Filter by level and time,
            then request to join.
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <form
            method="get"
            className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-6"
          >
            <label className="flex flex-col gap-2 md:col-span-2">
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
                From
              </span>
              <input
                type="datetime-local"
                name="from"
                defaultValue={sp.from ?? ''}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                To
              </span>
              <input
                type="datetime-local"
                name="to"
                defaultValue={sp.to ?? ''}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Level min
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="7"
                name="levelMin"
                defaultValue={sp.levelMin ?? ''}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Level max
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="7"
                name="levelMax"
                defaultValue={sp.levelMax ?? ''}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
                Gender preference
              </span>
              <select
                name="gender"
                defaultValue={sp.gender ?? ''}
                className={inputCls}
              >
                <option value="">Any</option>
                <option value="open">Open</option>
                <option value="mixed">Mixed</option>
                <option value="men_only">Men only</option>
                <option value="women_only">Women only</option>
              </select>
            </label>
            <div className="flex items-end md:col-span-4">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
              >
                Apply filters
              </button>
            </div>
          </form>

          {error ? (
            <p className="border border-red-500/40 bg-paper px-6 py-8 text-sm text-red-600">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <EmptyState
              headline="Nothing here yet."
              body="No open matches match these filters right now. Browse clubs and start your own, friends will join."
              ctaHref="/play/clubs"
              ctaLabel="Browse clubs"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rows.map((b) => (
                <article
                  key={b.id}
                  className="flex flex-col gap-3 border border-ink-deep/15 bg-paper p-6"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                      {b.city ?? ''} {b.clubName ? `· ${b.clubName}` : ''}
                    </p>
                    <span className="border border-brass/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-brass">
                      {b.seatsOpen} open
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl tracking-tight text-ink-deep">
                    {b.courtName ?? 'Court'}
                  </h2>
                  <p className="text-sm text-ink-deep/70">
                    {fmtRange(b.startAt, b.endAt)}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.15em] text-ink-deep/60">
                    {b.organizerName && (
                      <span className="border border-ink-deep/15 px-2 py-1">
                        Host: {b.organizerName}
                        {typeof b.organizerRatingDisplay === 'number'
                          ? ` · ${b.organizerRatingDisplay.toFixed(1)}`
                          : ''}
                      </span>
                    )}
                    {(b.requiredLevelMin || b.requiredLevelMax) && (
                      <span className="border border-ink-deep/15 px-2 py-1">
                        Level {b.requiredLevelMin ?? 0}-{b.requiredLevelMax ?? 7}
                      </span>
                    )}
                    {b.genderPreference !== 'open' && (
                      <span className="border border-ink-deep/15 px-2 py-1">
                        {b.genderPreference.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/play/open/${b.id}`}
                    className="mt-auto inline-flex items-center justify-center border border-ink-deep px-5 py-2.5 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
                  >
                    Request to join
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
