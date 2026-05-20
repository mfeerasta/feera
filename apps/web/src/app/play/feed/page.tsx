import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  db,
  friendships,
  users,
  matches,
  bookings,
  clubs,
  courts,
  tournamentRegistrations,
  tournaments,
} from '@feera/db';
import { and, desc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/api/request-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Feed — Feera',
  description: 'Recent activity from your padel friends.',
};

interface FeedEvent {
  kind: 'match' | 'open_match' | 'tournament_reg';
  happenedAt: Date;
  actorName: string;
  actorId: string;
  text: string;
  href: string;
}

const HORIZON_DAYS = 30;

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/feed');
  const userId = session.userId;

  // 1. Resolve friend IDs (accepted both directions).
  const friendRows = await db
    .select({
      requester: friendships.requesterUserId,
      addressee: friendships.addresseeUserId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        sql`(${friendships.requesterUserId} = ${userId} OR ${friendships.addresseeUserId} = ${userId})`,
      ),
    );
  const friendIds = new Set<string>();
  for (const r of friendRows) {
    if (r.requester !== userId) friendIds.add(r.requester);
    if (r.addressee !== userId) friendIds.add(r.addressee);
  }

  if (friendIds.size === 0) {
    return <EmptyShell />;
  }

  const since = new Date(Date.now() - HORIZON_DAYS * 24 * 3600 * 1000);
  const fIds = Array.from(friendIds);

  // 2. Recent matches involving any friend.
  const recentMatches = await db
    .select({
      id: matches.id,
      playedAt: matches.playedAt,
      teamAPlayer1: matches.teamAPlayer1,
      teamAPlayer2: matches.teamAPlayer2,
      teamBPlayer1: matches.teamBPlayer1,
      teamBPlayer2: matches.teamBPlayer2,
      teamASetsWon: matches.teamASetsWon,
      teamBSetsWon: matches.teamBSetsWon,
    })
    .from(matches)
    .where(
      and(
        gt(matches.playedAt, since),
        or(
          inArray(matches.teamAPlayer1, fIds),
          inArray(matches.teamAPlayer2, fIds),
          inArray(matches.teamBPlayer1, fIds),
          inArray(matches.teamBPlayer2, fIds),
        ),
      ),
    )
    .orderBy(desc(matches.playedAt))
    .limit(40);

  // 3. Open matches that any friend organized in the last 30 days.
  const recentOpen = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      organizerUserId: bookings.organizerUserId,
      clubId: clubs.id,
      clubName: clubs.name,
      courtName: courts.name,
    })
    .from(bookings)
    .leftJoin(courts, eq(courts.id, bookings.courtId))
    .leftJoin(clubs, eq(clubs.id, courts.clubId))
    .where(
      and(
        eq(bookings.isOpenMatch, true),
        gt(bookings.createdAt, since),
        inArray(bookings.organizerUserId, fIds),
      ),
    )
    .orderBy(desc(bookings.createdAt))
    .limit(20);

  // 4. Tournament registrations by friends.
  const recentRegs = await db
    .select({
      regId: tournamentRegistrations.id,
      userId: tournamentRegistrations.userId,
      registeredAt: tournamentRegistrations.registeredAt,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentSlug: tournaments.slug,
    })
    .from(tournamentRegistrations)
    .leftJoin(tournaments, eq(tournaments.id, tournamentRegistrations.tournamentId))
    .where(
      and(
        gt(tournamentRegistrations.registeredAt, since),
        inArray(tournamentRegistrations.userId, fIds),
      ),
    )
    .orderBy(desc(tournamentRegistrations.registeredAt))
    .limit(20);

  // 5. Resolve all user display names involved.
  const involved = new Set<string>(fIds);
  for (const m of recentMatches) {
    involved.add(m.teamAPlayer1);
    involved.add(m.teamAPlayer2);
    involved.add(m.teamBPlayer1);
    involved.add(m.teamBPlayer2);
  }
  for (const r of recentOpen) involved.add(r.organizerUserId);
  const involvedArr = Array.from(involved);
  const nameRows = involvedArr.length
    ? await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, involvedArr))
    : [];
  const nameOf = new Map<string, string>(nameRows.map((u) => [u.id, u.displayName]));

  const events: FeedEvent[] = [];

  for (const m of recentMatches) {
    const friendIn = [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].find((id) =>
      friendIds.has(id),
    );
    if (!friendIn) continue;
    const friendName = nameOf.get(friendIn) ?? '—';
    const onA = m.teamAPlayer1 === friendIn || m.teamAPlayer2 === friendIn;
    const friendWon = onA
      ? m.teamASetsWon > m.teamBSetsWon
      : m.teamBSetsWon > m.teamASetsWon;
    const score = `${m.teamASetsWon}-${m.teamBSetsWon}`;
    events.push({
      kind: 'match',
      happenedAt: m.playedAt,
      actorName: friendName,
      actorId: friendIn,
      text: `${friendWon ? 'won' : 'lost'} a match ${score}`,
      href: `/play/players/${friendIn}`,
    });
  }

  for (const r of recentOpen) {
    if (!r.clubId) continue;
    events.push({
      kind: 'open_match',
      happenedAt: r.startAt,
      actorName: nameOf.get(r.organizerUserId) ?? '—',
      actorId: r.organizerUserId,
      text: `opened a match at ${r.clubName ?? 'a club'}${r.courtName ? ' on ' + r.courtName : ''}`,
      href: `/play/open/${r.id}`,
    });
  }

  for (const r of recentRegs) {
    if (!r.tournamentId) continue;
    events.push({
      kind: 'tournament_reg',
      happenedAt: r.registeredAt,
      actorName: nameOf.get(r.userId) ?? '—',
      actorId: r.userId,
      text: `registered for ${r.tournamentName ?? 'a tournament'}`,
      href: `/play/tournaments/${r.tournamentId}`,
    });
  }

  events.sort((a, b) => b.happenedAt.getTime() - a.happenedAt.getTime());

  // Group by day label.
  const groups = new Map<string, FeedEvent[]>();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
  function dayLabel(d: Date): string {
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  }
  for (const e of events) {
    const k = dayLabel(e.happenedAt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">Feed</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            Recent moves from your circle.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Matches your friends played, open courts they opened, tournaments
            they entered. Last 30 days.
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          {events.length === 0 ? (
            <p className="border border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-fg-muted)]">
              Nothing yet. Your friends will fill this in once they play.
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {Array.from(groups.entries()).map(([label, evs]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-muted)]">
                    {label}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)]">
                    {evs.map((e, i) => (
                      <li
                        key={`${e.kind}:${e.actorId}:${i}`}
                        className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-4"
                      >
                        <div className="text-sm">
                          <Link
                            href={`/play/players/${e.actorId}`}
                            className="font-serif text-base hover:text-court"
                          >
                            {e.actorName}
                          </Link>{' '}
                          <span className="text-[var(--color-fg-muted)]">{e.text}</span>
                        </div>
                        <Link
                          href={e.href}
                          className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)] hover:text-court"
                        >
                          View
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function EmptyShell() {
  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">Feed</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            Add a friend to start.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Your feed needs friends. Once they play or open a court, you will
            see it here.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/play/friends"
              className="inline-flex items-center justify-center border border-cream px-6 py-3 text-sm transition-colors hover:border-court hover:text-court"
            >
              Find friends
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
