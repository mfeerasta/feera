import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, matches, users, bookings, clubs, courts } from '@feera/db';
import { and, desc, eq, or } from 'drizzle-orm';
import { getSession } from '@/lib/api/request-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Match history — Feera',
  description: 'Your recent padel matches with rating deltas.',
};

interface MatchRow {
  id: string;
  playedAt: Date;
  teamASetsWon: number;
  teamBSetsWon: number;
  rawScore: unknown;
  verificationStatus: string;
  ratingChanges: unknown;
  teamAPlayer1: string;
  teamAPlayer2: string;
  teamBPlayer1: string;
  teamBPlayer2: string;
  clubName: string | null;
  courtName: string | null;
}

interface RatingDelta {
  ratingDisplayBefore: number;
  ratingDisplayAfter: number;
}

export default async function MyMatchesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in?next=/me/matches');
  }
  const userId = session.userId;

  const rows = (await db
    .select({
      id: matches.id,
      playedAt: matches.playedAt,
      teamASetsWon: matches.teamASetsWon,
      teamBSetsWon: matches.teamBSetsWon,
      rawScore: matches.rawScore,
      verificationStatus: matches.verificationStatus,
      ratingChanges: matches.ratingChanges,
      teamAPlayer1: matches.teamAPlayer1,
      teamAPlayer2: matches.teamAPlayer2,
      teamBPlayer1: matches.teamBPlayer1,
      teamBPlayer2: matches.teamBPlayer2,
      clubName: clubs.name,
      courtName: courts.name,
    })
    .from(matches)
    .leftJoin(bookings, eq(bookings.id, matches.bookingId))
    .leftJoin(courts, eq(courts.id, bookings.courtId))
    .leftJoin(clubs, eq(clubs.id, courts.clubId))
    .where(
      or(
        eq(matches.teamAPlayer1, userId),
        eq(matches.teamAPlayer2, userId),
        eq(matches.teamBPlayer1, userId),
        eq(matches.teamBPlayer2, userId),
      ),
    )
    .orderBy(desc(matches.playedAt))
    .limit(50)) as unknown as MatchRow[];

  // Resolve player names in one batch.
  const playerIdSet = new Set<string>();
  for (const m of rows) {
    playerIdSet.add(m.teamAPlayer1);
    playerIdSet.add(m.teamAPlayer2);
    playerIdSet.add(m.teamBPlayer1);
    playerIdSet.add(m.teamBPlayer2);
  }
  const playerIds = Array.from(playerIdSet);
  const playerRows = playerIds.length
    ? await db.select({ id: users.id, displayName: users.displayName }).from(users)
    : [];
  const nameById = new Map<string, string>(
    playerRows.map((p) => [p.id, p.displayName]),
  );

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">Match history</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            Your last 50.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Every match you have played with the rating delta and verification state.
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          {rows.length === 0 ? (
            <p className="border border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-fg-muted)]">
              No matches yet. Play one, record the score, and you will see it here.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {rows.map((m) => {
                const userTeamA = m.teamAPlayer1 === userId || m.teamAPlayer2 === userId;
                const userTeam = userTeamA ? 'A' : 'B';
                const won =
                  (userTeam === 'A' && m.teamASetsWon > m.teamBSetsWon) ||
                  (userTeam === 'B' && m.teamBSetsWon > m.teamASetsWon);
                const ratingDelta = extractDelta(m.ratingChanges, userId);
                return (
                  <li
                    key={m.id}
                    className="grid grid-cols-1 gap-4 border border-[var(--color-border)] bg-paper p-6 md:grid-cols-[180px_1fr_220px]"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                        {formatDate(m.playedAt)}
                      </p>
                      <p className="mt-1 text-sm text-ink-deep/70">
                        {m.clubName ?? 'Unrecorded venue'}
                        {m.courtName ? ` · ${m.courtName}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span
                          className={`inline-block w-4 ${userTeam === 'A' ? 'border-b-2 border-court' : ''}`}
                        />
                        <span className="font-serif text-base text-ink-deep">
                          {nameById.get(m.teamAPlayer1) ?? '—'} ·{' '}
                          {nameById.get(m.teamAPlayer2) ?? '—'}
                        </span>
                        <span className="ms-auto font-mono text-base text-ink-deep">
                          {m.teamASetsWon}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span
                          className={`inline-block w-4 ${userTeam === 'B' ? 'border-b-2 border-court' : ''}`}
                        />
                        <span className="font-serif text-base text-ink-deep">
                          {nameById.get(m.teamBPlayer1) ?? '—'} ·{' '}
                          {nameById.get(m.teamBPlayer2) ?? '—'}
                        </span>
                        <span className="ms-auto font-mono text-base text-ink-deep">
                          {m.teamBSetsWon}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-deep/50">
                        {formatRawScore(m.rawScore)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-sm ${won ? 'text-court' : 'text-ink-deep/60'}`}
                      >
                        {won ? 'WIN' : 'LOSS'}
                      </span>
                      {ratingDelta ? (
                        <span
                          className={`font-mono text-sm ${ratingDelta.delta > 0 ? 'text-court' : 'text-ink-deep/50'}`}
                        >
                          {ratingDelta.delta > 0 ? '▲' : '▼'}{' '}
                          {ratingDelta.delta > 0 ? '+' : ''}
                          {ratingDelta.delta.toFixed(2)}
                          <span className="ms-2 text-[10px] uppercase tracking-[0.2em] text-ink-deep/40">
                            {ratingDelta.after.toFixed(1)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/40">
                          No rating delta
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                        {m.verificationStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRawScore(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  try {
    return raw
      .map((set) => (Array.isArray(set) ? `${set[0]}-${set[1]}` : ''))
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

function extractDelta(
  ratingChanges: unknown,
  userId: string,
): { delta: number; after: number } | null {
  if (!ratingChanges || typeof ratingChanges !== 'object') return null;
  const open = (ratingChanges as { open?: unknown }).open;
  if (!open || typeof open !== 'object') return null;
  const entry = (open as Record<string, unknown>)[userId];
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as {
    ratingDisplayBefore?: number;
    ratingDisplayAfter?: number;
  };
  if (
    typeof e.ratingDisplayBefore !== 'number' ||
    typeof e.ratingDisplayAfter !== 'number'
  ) {
    return null;
  }
  return {
    delta: e.ratingDisplayAfter - e.ratingDisplayBefore,
    after: e.ratingDisplayAfter,
  };
}
