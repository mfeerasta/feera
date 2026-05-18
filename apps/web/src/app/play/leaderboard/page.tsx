import Link from 'next/link';
import { db, users, userRatings, userSocialScores } from '@feera/db';
import { and, desc, eq, gt, isNotNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leaderboard — Feera',
  description: 'Top padel players on Feera by city and country.',
};

interface PageProps {
  searchParams: Promise<{
    country?: string;
    city?: string;
    pool?: 'open' | 'women';
  }>;
}

const PAGE_SIZE = 50;

interface Row {
  userId: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  ratingDisplay: number;
  matchCount: number;
  isProvisional: boolean;
  reliabilityPct: number;
  onTimeRate: number | null;
  womenOnlyPoolRating: number | null;
}

async function loadLeaderboard(args: {
  country?: string;
  city?: string;
  pool: 'open' | 'women';
}): Promise<Row[]> {
  const filters = [isNotNull(users.deletedAt).if(false) ?? sql`users.deleted_at is null`];
  // Drizzle-friendly null check:
  const conds = [sql`${users.deletedAt} is null`, gt(userRatings.matchCount, 0)];
  if (args.country) conds.push(eq(users.countryCode, args.country));
  if (args.city) conds.push(eq(users.city, args.city));

  if (args.pool === 'women') {
    conds.push(eq(users.gender, 'f'));
    conds.push(eq(users.womenOnlyPoolOptIn, true));
    conds.push(isNotNull(userRatings.womenOnlyPoolRating));
  }

  const orderColumn =
    args.pool === 'women'
      ? userRatings.womenOnlyPoolRating
      : userRatings.ratingDisplay;

  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      city: users.city,
      countryCode: users.countryCode,
      ratingDisplay: userRatings.ratingDisplay,
      matchCount: userRatings.matchCount,
      isProvisional: userRatings.isProvisional,
      reliabilityPct: userRatings.reliabilityPct,
      onTimeRate: userSocialScores.onTimeRate,
      womenOnlyPoolRating: userRatings.womenOnlyPoolRating,
    })
    .from(users)
    .innerJoin(userRatings, eq(userRatings.userId, users.id))
    .leftJoin(userSocialScores, eq(userSocialScores.userId, users.id))
    .where(and(...conds))
    .orderBy(desc(orderColumn))
    .limit(PAGE_SIZE);
  // Silence unused filters helper.
  void filters;
  return rows as unknown as Row[];
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const country = sp.country ?? 'PK';
  const city = sp.city ?? '';
  const pool = sp.pool === 'women' ? 'women' : 'open';

  let rows: Row[] = [];
  let error: string | null = null;
  try {
    rows = await loadLeaderboard({
      country: country || undefined,
      city: city || undefined,
      pool,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load leaderboard.';
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">Leaderboard</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            {city ? `Top players. ${city}.` : `Top players. ${country}.`}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Ranked by Glicko-2 display rating. Provisional players are flagged. Reliability
            reflects on-time arrival across recent bookings.
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <form
            method="get"
            className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-[140px_180px_180px_auto]"
          >
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                Country
              </span>
              <select
                name="country"
                defaultValue={country}
                className="h-11 border border-[var(--color-border)] bg-transparent px-4 text-sm"
              >
                <option value="PK">Pakistan</option>
                <option value="AE">UAE</option>
                <option value="SA">Saudi Arabia</option>
                <option value="PT">Portugal</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                City
              </span>
              <input
                type="text"
                name="city"
                defaultValue={city}
                placeholder="All"
                className="h-11 border border-[var(--color-border)] bg-transparent px-4 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                Pool
              </span>
              <select
                name="pool"
                defaultValue={pool}
                className="h-11 border border-[var(--color-border)] bg-transparent px-4 text-sm"
              >
                <option value="open">Open</option>
                <option value="women">Women only</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center border border-[var(--color-fg)] px-6 text-sm transition-colors hover:border-court hover:text-court"
              >
                Apply
              </button>
            </div>
          </form>

          {error ? (
            <p className="border border-red-500/40 bg-paper px-6 py-8 text-sm text-red-600">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className="border border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-fg-muted)]">
              No players ranked yet for these filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                    <th className="py-4 pe-4">#</th>
                    <th className="py-4 pe-4">Player</th>
                    <th className="py-4 pe-4">City</th>
                    <th className="py-4 pe-4 text-end">
                      {pool === 'women' ? 'Women pool' : 'Rating'}
                    </th>
                    <th className="py-4 pe-4 text-end">Reliability</th>
                    <th className="py-4 text-end">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const rating =
                      pool === 'women' && r.womenOnlyPoolRating != null
                        ? toDisplay(r.womenOnlyPoolRating)
                        : r.ratingDisplay;
                    const rank = i + 1;
                    return (
                      <tr
                        key={r.userId}
                        className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-card)]/30"
                      >
                        <td className="py-4 pe-4 font-serif text-base">
                          {r.isProvisional ? (
                            <span className="border border-brass/50 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-brass">
                              prov
                            </span>
                          ) : (
                            <span className={rank === 1 ? 'border-b-2 border-brass pb-1' : ''}>
                              {rank}
                            </span>
                          )}
                        </td>
                        <td className="py-4 pe-4">
                          <Link
                            href={`/play/players/${r.userId}`}
                            className="font-serif text-base hover:text-court"
                          >
                            {r.displayName}
                          </Link>
                        </td>
                        <td className="py-4 pe-4 text-[var(--color-fg-muted)]">
                          {r.city ?? '—'} · {r.countryCode}
                        </td>
                        <td className="py-4 pe-4 text-end font-mono text-base">
                          {rating.toFixed(1)}
                        </td>
                        <td className="py-4 pe-4 text-end text-[var(--color-fg-muted)]">
                          {r.reliabilityPct}%
                        </td>
                        <td className="py-4 text-end text-[var(--color-fg-muted)]">
                          {r.matchCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function toDisplay(internal: number): number {
  const raw = (internal - 800) / 200;
  return Math.round(Math.min(7, Math.max(0, raw)) * 10) / 10;
}
