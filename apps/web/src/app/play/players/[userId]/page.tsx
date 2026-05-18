import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, desc, eq, gte, isNull, or, sql } from 'drizzle-orm';
import {
  bookings,
  clubs,
  courts,
  matches,
  userRatings,
  userSocialScores,
  users,
} from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { maskUserForViewer } from '@/lib/api/user-serializer';
import { getEdgeBetween, loadFriendIds } from '@/lib/friends/service';
import { sendByIdAction } from '@/app/play/friends/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
}

interface RecentMatch {
  id: string;
  playedAt: Date;
  teamAPlayer1: string;
  teamAPlayer2: string;
  teamBPlayer1: string;
  teamBPlayer2: string;
  teamASetsWon: number;
  teamBSetsWon: number;
  ratingDelta: number | null;
  playerNames: Map<string, string>;
}

interface OpenBooking {
  id: string;
  startAt: Date;
  clubName: string | null;
  courtName: string | null;
  city: string | null;
  seatsBooked: number;
  maxParticipants: number;
}

interface TopClub {
  clubId: string;
  clubName: string;
  matchCount: number;
}

interface ProfileData {
  user: {
    id: string;
    displayName: string;
    city: string | null;
    countryCode: string;
    profilePhotoUrl: string | null;
    bio: string | null;
    gender: string | null;
    genderVisibility: 'public' | 'friends' | 'private';
    isVerifiedCoach: boolean;
    editionMemberStatus: string;
  };
  rating: {
    ratingDisplay: number;
    reliabilityPct: number;
    matchCount: number;
    isProvisional: boolean;
  } | null;
  social: { onTimeRate: number | null } | null;
  recentMatches: RecentMatch[];
  openBookings: OpenBooking[];
  topClubs: TopClub[];
  edgeStatus: 'none' | 'pending_out' | 'pending_in' | 'accepted' | 'blocked';
}

async function loadProfile(
  targetUserId: string,
  viewerUserId: string,
): Promise<ProfileData | null> {
  const session = await getSession();
  return withRequestContext(session, async (tx) => {
    const [u] = await tx
      .select({
        id: users.id,
        displayName: users.displayName,
        city: users.city,
        countryCode: users.countryCode,
        profilePhotoUrl: users.profilePhotoUrl,
        bio: users.bio,
        gender: users.gender,
        genderVisibility: users.genderVisibility,
        isVerifiedCoach: users.isVerifiedCoach,
        editionMemberStatus: users.editionMemberStatus,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!u || u.deletedAt !== null) return null;

    const [rating] = await tx
      .select({
        ratingDisplay: userRatings.ratingDisplay,
        reliabilityPct: userRatings.reliabilityPct,
        matchCount: userRatings.matchCount,
        isProvisional: userRatings.isProvisional,
      })
      .from(userRatings)
      .where(eq(userRatings.userId, targetUserId))
      .limit(1);

    const [social] = await tx
      .select({ onTimeRate: userSocialScores.onTimeRate })
      .from(userSocialScores)
      .where(eq(userSocialScores.userId, targetUserId))
      .limit(1);

    // Recent matches: any of 4 player slots match the target user.
    const matchRows = await tx
      .select({
        id: matches.id,
        playedAt: matches.playedAt,
        teamAPlayer1: matches.teamAPlayer1,
        teamAPlayer2: matches.teamAPlayer2,
        teamBPlayer1: matches.teamBPlayer1,
        teamBPlayer2: matches.teamBPlayer2,
        teamASetsWon: matches.teamASetsWon,
        teamBSetsWon: matches.teamBSetsWon,
        ratingChanges: matches.ratingChanges,
      })
      .from(matches)
      .where(
        or(
          eq(matches.teamAPlayer1, targetUserId),
          eq(matches.teamAPlayer2, targetUserId),
          eq(matches.teamBPlayer1, targetUserId),
          eq(matches.teamBPlayer2, targetUserId),
        ),
      )
      .orderBy(desc(matches.playedAt))
      .limit(5);

    const playerIdSet = new Set<string>();
    for (const m of matchRows) {
      playerIdSet.add(m.teamAPlayer1);
      playerIdSet.add(m.teamAPlayer2);
      playerIdSet.add(m.teamBPlayer1);
      playerIdSet.add(m.teamBPlayer2);
    }
    const playerNameRows = playerIdSet.size
      ? await tx
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(
            or(
              ...Array.from(playerIdSet).map((id) => eq(users.id, id)),
            ),
          )
      : [];
    const playerNames = new Map(playerNameRows.map((r) => [r.id, r.displayName]));

    const recentMatches: RecentMatch[] = matchRows.map((m) => {
      let delta: number | null = null;
      const rc = m.ratingChanges as
        | Record<string, { ratingBefore?: number; ratingAfter?: number }>
        | null;
      if (rc && rc[targetUserId]) {
        const entry = rc[targetUserId];
        if (
          typeof entry.ratingBefore === 'number' &&
          typeof entry.ratingAfter === 'number'
        ) {
          delta = entry.ratingAfter - entry.ratingBefore;
        }
      }
      return {
        id: m.id,
        playedAt: m.playedAt,
        teamAPlayer1: m.teamAPlayer1,
        teamAPlayer2: m.teamAPlayer2,
        teamBPlayer1: m.teamBPlayer1,
        teamBPlayer2: m.teamBPlayer2,
        teamASetsWon: m.teamASetsWon,
        teamBSetsWon: m.teamBSetsWon,
        ratingDelta: delta,
        playerNames,
      };
    });

    const now = new Date();
    const openBookingRows = await tx
      .select({
        id: bookings.id,
        startAt: bookings.startAt,
        seatsBooked: bookings.seatsBooked,
        maxParticipants: bookings.maxParticipants,
        courtName: courts.name,
        clubName: clubs.name,
        city: clubs.city,
      })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(clubs, eq(clubs.id, courts.clubId))
      .where(
        and(
          eq(bookings.organizerUserId, targetUserId),
          eq(bookings.isOpenMatch, true),
          eq(bookings.status, 'confirmed'),
          gte(bookings.startAt, now),
        ),
      )
      .orderBy(bookings.startAt)
      .limit(5);

    const openBookings: OpenBooking[] = openBookingRows.map((b) => ({
      id: b.id,
      startAt: b.startAt,
      seatsBooked: b.seatsBooked,
      maxParticipants: b.maxParticipants,
      clubName: b.clubName ?? null,
      courtName: b.courtName ?? null,
      city: b.city ?? null,
    }));

    // Top 3 clubs by match count in the past 90 days, derived from bookings
    // attached to the matches the user played in.
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const topClubRows = await tx
      .select({
        clubId: clubs.id,
        clubName: clubs.name,
        matchCount: sql<number>`count(${matches.id})::int`,
      })
      .from(matches)
      .innerJoin(bookings, eq(bookings.id, matches.bookingId))
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(clubs, eq(clubs.id, courts.clubId))
      .where(
        and(
          gte(matches.playedAt, ninetyDaysAgo),
          or(
            eq(matches.teamAPlayer1, targetUserId),
            eq(matches.teamAPlayer2, targetUserId),
            eq(matches.teamBPlayer1, targetUserId),
            eq(matches.teamBPlayer2, targetUserId),
          ),
        ),
      )
      .groupBy(clubs.id, clubs.name)
      .orderBy(desc(sql`count(${matches.id})`))
      .limit(3);

    const topClubs: TopClub[] = topClubRows.map((r) => ({
      clubId: r.clubId,
      clubName: r.clubName,
      matchCount: Number(r.matchCount),
    }));

    let edgeStatus: ProfileData['edgeStatus'] = 'none';
    if (viewerUserId !== targetUserId) {
      const edge = await getEdgeBetween(tx, viewerUserId, targetUserId);
      if (edge) {
        if (edge.status === 'accepted') edgeStatus = 'accepted';
        else if (edge.status === 'blocked') edgeStatus = 'blocked';
        else if (edge.status === 'pending') {
          edgeStatus =
            edge.requesterUserId === viewerUserId ? 'pending_out' : 'pending_in';
        }
      }
    }

    void isNull; // reserved for future filters

    const viewerFriendIds = await loadFriendIds(tx, viewerUserId);
    const maskedUser = maskUserForViewer(
      {
        id: u.id,
        gender: u.gender ?? null,
        genderVisibility: u.genderVisibility,
        displayName: u.displayName,
        city: u.city,
        countryCode: u.countryCode,
        profilePhotoUrl: u.profilePhotoUrl,
        bio: u.bio,
        isVerifiedCoach: u.isVerifiedCoach,
        editionMemberStatus: u.editionMemberStatus,
      },
      { userId: viewerUserId, friendUserIds: viewerFriendIds },
    );

    return {
      user: maskedUser,
      rating: rating ?? null,
      social: social ?? null,
      recentMatches,
      openBookings,
      topClubs,
      edgeStatus,
    };
  });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    const { userId } = await params;
    redirect(`/sign-in?next=/play/players/${userId}`);
  }
  const { userId } = await params;
  if (!userId) notFound();

  const data = await loadProfile(userId, session.userId);
  if (!data) notFound();

  const t = await getT();
  const isSelf = session.userId === data.user.id;

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-6">
              {data.user.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.user.profilePhotoUrl}
                  alt=""
                  className="h-24 w-24 rounded-full border border-cream/20 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cream/20 font-serif text-3xl text-cream/70">
                  {(data.user.displayName ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cream/60">
                  {t('playerProfile.eyebrow')}
                </p>
                <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">
                  {data.user.displayName}
                </h1>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cream/70">
                  {data.user.city ? `${data.user.city} · ${data.user.countryCode}` : data.user.countryCode}
                  {data.user.isVerifiedCoach ? ` · ${t('playerProfile.verifiedCoach')}` : ''}
                  {data.user.editionMemberStatus === 'active'
                    ? ` · ${t('playerProfile.editionMember')}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              {data.rating ? (
                <p className="font-mono text-3xl text-cream">
                  {data.rating.ratingDisplay.toFixed(1)}
                </p>
              ) : (
                <p className="font-mono text-3xl text-cream/40">-.-</p>
              )}
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cream/60">
                {data.rating?.isProvisional ? (
                  <span className="border border-brass/60 px-2 py-1 text-[10px] text-brass">
                    {t('playerProfile.provisional')}
                  </span>
                ) : null}
                {data.rating ? (
                  <span>
                    {data.rating.reliabilityPct}% {t('playerProfile.reliability')}
                  </span>
                ) : null}
              </div>

              {!isSelf && data.edgeStatus !== 'blocked' ? (
                data.edgeStatus === 'none' ? (
                  <form action={sendByIdAction} className="mt-2">
                    <input type="hidden" name="addresseeUserId" value={data.user.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center border border-court bg-court px-5 text-xs uppercase tracking-[0.18em] text-cream hover:opacity-90"
                    >
                      {t('playerProfile.addFriend')}
                    </button>
                  </form>
                ) : (
                  <span className="mt-2 inline-flex h-10 items-center border border-cream/20 px-5 text-xs uppercase tracking-[0.18em] text-cream/60">
                    {data.edgeStatus === 'accepted'
                      ? t('playerProfile.friends')
                      : data.edgeStatus === 'pending_out'
                        ? t('playerProfile.requestSent')
                        : t('playerProfile.requestIncoming')}
                  </span>
                )
              ) : null}
            </div>
          </div>

          {data.user.bio ? (
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-cream/80">
              {data.user.bio}
            </p>
          ) : null}
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="font-serif text-2xl tracking-tight">
                {t('playerProfile.recentMatches')}
              </h2>
              {data.recentMatches.length === 0 ? (
                <p className="mt-4 border border-[var(--color-border)] px-6 py-8 text-sm text-[var(--color-fg-muted)]">
                  {t('playerProfile.emptyMatches')}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                  {data.recentMatches.map((m) => {
                    const teamA = `${m.playerNames.get(m.teamAPlayer1) ?? '?'} / ${m.playerNames.get(m.teamAPlayer2) ?? '?'}`;
                    const teamB = `${m.playerNames.get(m.teamBPlayer1) ?? '?'} / ${m.playerNames.get(m.teamBPlayer2) ?? '?'}`;
                    const onA =
                      m.teamAPlayer1 === data.user.id || m.teamAPlayer2 === data.user.id;
                    const won = onA
                      ? m.teamASetsWon > m.teamBSetsWon
                      : m.teamBSetsWon > m.teamASetsWon;
                    return (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="text-sm">
                          <p>
                            <span className={onA ? 'font-medium' : 'text-[var(--color-fg-muted)]'}>{teamA}</span>
                            <span className="mx-2 text-[var(--color-fg-muted)]">vs</span>
                            <span className={!onA ? 'font-medium' : 'text-[var(--color-fg-muted)]'}>{teamB}</span>
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
                            {fmtDate(m.playedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-base">
                            {m.teamASetsWon} - {m.teamBSetsWon}
                          </span>
                          <span
                            className={
                              'text-xs uppercase tracking-[0.18em] ' +
                              (won ? 'text-court' : 'text-[var(--color-fg-muted)]')
                            }
                          >
                            {won ? t('playerProfile.win') : t('playerProfile.loss')}
                          </span>
                          {m.ratingDelta !== null ? (
                            <span
                              className={
                                'font-mono text-xs ' +
                                (m.ratingDelta >= 0 ? 'text-court' : 'text-red-500')
                              }
                            >
                              {m.ratingDelta >= 0 ? '+' : ''}
                              {m.ratingDelta.toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <h2 className="mt-12 font-serif text-2xl tracking-tight">
                {t('playerProfile.openMatches')}
              </h2>
              {data.openBookings.length === 0 ? (
                <p className="mt-4 border border-[var(--color-border)] px-6 py-8 text-sm text-[var(--color-fg-muted)]">
                  {t('playerProfile.emptyOpen')}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                  {data.openBookings.map((b) => (
                    <li key={b.id} className="px-5 py-4">
                      <Link
                        href={`/play/open/${b.id}`}
                        className="flex flex-col gap-1 hover:text-court"
                      >
                        <span className="font-serif text-base">
                          {b.clubName ?? '—'} · {b.courtName ?? ''}
                        </span>
                        <span className="text-xs text-[var(--color-fg-muted)]">
                          {fmtTime(b.startAt)} · {b.city ?? ''} · {b.seatsBooked}/
                          {b.maxParticipants}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <aside>
              <h2 className="font-serif text-2xl tracking-tight">
                {t('playerProfile.topClubs')}
              </h2>
              {data.topClubs.length === 0 ? (
                <p className="mt-4 border border-[var(--color-border)] px-6 py-8 text-sm text-[var(--color-fg-muted)]">
                  {t('playerProfile.emptyClubs')}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                  {data.topClubs.map((c) => (
                    <li key={c.clubId} className="flex items-center justify-between px-5 py-4">
                      <span className="font-serif text-base">{c.clubName}</span>
                      <span className="font-mono text-xs text-[var(--color-fg-muted)]">
                        {c.matchCount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {data.social ? (
                <div className="mt-8 border border-[var(--color-border)] p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                    {t('playerProfile.onTime')}
                  </p>
                  <p className="mt-2 font-mono text-2xl">
                    {data.social.onTimeRate !== null
                      ? `${Math.round(data.social.onTimeRate * 100)}%`
                      : '—'}
                  </p>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
