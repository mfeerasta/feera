import Link from 'next/link';
import { headers } from 'next/headers';

interface TournamentRow {
  id: string;
  name: string;
  slug: string;
  format: string;
  city: string | null;
  countryCode: string;
  startAt: string;
  endAt: string;
  status: string;
  entryFee: number;
  currency: string;
  genderPreference: string;
  minLevel: number | null;
  maxLevel: number | null;
}

interface PageProps {
  searchParams: Promise<{
    city?: string;
    format?: string;
    gender_preference?: string;
    min_level?: string;
    max_level?: string;
    from?: string;
    to?: string;
  }>;
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export default async function TournamentsListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.city) qs.set('city', sp.city);
  if (sp.format) qs.set('format', sp.format);
  if (sp.gender_preference) qs.set('gender_preference', sp.gender_preference);
  if (sp.min_level) qs.set('min_level', sp.min_level);
  if (sp.max_level) qs.set('max_level', sp.max_level);
  if (sp.from) qs.set('from', sp.from);
  if (sp.to) qs.set('to', sp.to);
  qs.set('status', 'open');

  const base = await origin();
  const res = await fetch(`${base}/api/v1/tournaments?${qs.toString()}`, {
    cache: 'no-store',
  });
  const rows: TournamentRow[] = res.ok ? ((await res.json()).data as TournamentRow[]) : [];

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">Compete</p>
        <h1 className="mt-2 font-serif text-5xl tracking-tight text-ink-deep">
          Open tournaments
        </h1>
        <p className="mt-4 max-w-xl text-sm text-ink-deep/70">
          Browse upcoming Americano, Mexicano, and bracket events across the network.
          Filter by city, format, level, and gender.
        </p>
      </header>

      <form className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-6">
        <input
          name="city"
          defaultValue={sp.city ?? ''}
          placeholder="City"
          className="border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
        />
        <select
          name="format"
          defaultValue={sp.format ?? ''}
          className="border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
        >
          <option value="">Any format</option>
          <option value="americano">Americano</option>
          <option value="mexicano">Mexicano</option>
          <option value="round_robin">Round robin</option>
          <option value="single_elimination">Knockout</option>
          <option value="king_of_the_court">King of the court</option>
        </select>
        <select
          name="gender_preference"
          defaultValue={sp.gender_preference ?? ''}
          className="border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          <option value="open">Open</option>
          <option value="men_only">Men only</option>
          <option value="women_only">Women only</option>
          <option value="mixed">Mixed</option>
        </select>
        <input
          name="min_level"
          defaultValue={sp.min_level ?? ''}
          placeholder="Min level"
          className="border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
        />
        <input
          name="max_level"
          defaultValue={sp.max_level ?? ''}
          placeholder="Max level"
          className="border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="border border-ink-deep bg-ink-deep px-3 py-2 text-sm text-cream hover:bg-court hover:border-court"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="border border-dashed border-ink-deep/20 px-6 py-16 text-center text-sm text-ink-deep/60">
          No open tournaments match. Check back soon or widen your filters.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => (
            <li key={t.id}>
              <Link
                href={`/play/tournaments/${t.id}`}
                className="group flex h-full flex-col border border-ink-deep/15 bg-paper p-6 transition-colors hover:border-court"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                  {t.format.replace(/_/g, ' ')} . {t.countryCode}
                </p>
                <h2 className="mt-3 font-serif text-2xl tracking-tight text-ink-deep group-hover:text-court">
                  {t.name}
                </h2>
                <p className="mt-2 text-sm text-ink-deep/60">
                  {t.city ?? 'Online'} . {new Date(t.startAt).toLocaleDateString()}
                </p>
                <p className="mt-4 text-sm text-ink-deep/70">
                  {t.entryFee > 0 ? `${t.entryFee} ${t.currency}` : 'Free entry'}
                </p>
                <span className="mt-auto pt-6 text-xs uppercase tracking-[0.2em] text-court">
                  View details
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
