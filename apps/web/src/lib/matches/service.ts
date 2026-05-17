import { and, desc, eq, gte, lte, type SQL, inArray, or } from 'drizzle-orm';
import {
  bookingParticipants,
  bookings,
  courts,
  matches,
  userRatings,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import {
  applyDoublesMatch,
  reliabilityPct,
  type DoublesMatchResult,
  type Player,
} from '@feera/matching/glicko';

export type MatchCreateError =
  | { kind: 'booking_not_found' }
  | { kind: 'booking_not_completed' }
  | { kind: 'insufficient_participants' }
  | { kind: 'forbidden' };

export interface MatchCreateInput {
  bookingId: string;
  teamAPlayer1: string;
  teamAPlayer2: string;
  teamBPlayer1: string;
  teamBPlayer2: string;
  playedAt?: string;
  isRanked: boolean;
}

export async function createMatch(
  tx: typeof Db,
  recordedByUserId: string,
  input: MatchCreateInput,
): Promise<{ match: typeof matches.$inferSelect } | MatchCreateError> {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, input.bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };
  if (booking.status !== 'completed') return { kind: 'booking_not_completed' };

  const playerIds = [
    input.teamAPlayer1,
    input.teamAPlayer2,
    input.teamBPlayer1,
    input.teamBPlayer2,
  ];
  const parts = await tx
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, booking.id),
        inArray(bookingParticipants.userId, playerIds),
      ),
    );
  const acceptedIds = new Set(
    parts.filter((p) => p.status === 'accepted').map((p) => p.userId),
  );
  if (playerIds.some((id) => !acceptedIds.has(id))) {
    return { kind: 'insufficient_participants' };
  }

  const [row] = await tx
    .insert(matches)
    .values({
      bookingId: booking.id,
      teamAPlayer1: input.teamAPlayer1,
      teamAPlayer2: input.teamAPlayer2,
      teamBPlayer1: input.teamBPlayer1,
      teamBPlayer2: input.teamBPlayer2,
      teamASetsWon: 0,
      teamBSetsWon: 0,
      isRanked: input.isRanked,
      playedAt: input.playedAt ? new Date(input.playedAt) : new Date(),
      recordedByUserId,
    })
    .returning();
  if (!row) throw new Error('match insert returned no row');
  return { match: row };
}

export interface MatchListFilters {
  userId?: string;
  clubId?: string;
  from?: Date;
  to?: Date;
  verificationStatus?: 'unverified' | 'peer_verified' | 'club_verified';
  limit: number;
  offset: number;
}

export async function listMatches(tx: typeof Db, f: MatchListFilters) {
  const filters: SQL[] = [];
  if (f.from) filters.push(gte(matches.playedAt, f.from));
  if (f.to) filters.push(lte(matches.playedAt, f.to));
  if (f.verificationStatus)
    filters.push(eq(matches.verificationStatus, f.verificationStatus));
  if (f.userId) {
    const u = f.userId;
    filters.push(
      or(
        eq(matches.teamAPlayer1, u),
        eq(matches.teamAPlayer2, u),
        eq(matches.teamBPlayer1, u),
        eq(matches.teamBPlayer2, u),
      )!,
    );
  }

  // clubId filter requires join through booking -> court.
  if (f.clubId) {
    const subRows = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .where(eq(courts.clubId, f.clubId));
    const ids = subRows.map((r) => r.id);
    if (ids.length === 0) return [];
    filters.push(inArray(matches.bookingId, ids));
  }

  return tx
    .select()
    .from(matches)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(matches.playedAt))
    .limit(f.limit)
    .offset(f.offset);
}

export function computeSetWinners(sets: ReadonlyArray<readonly [number, number]>) {
  let teamASetsWon = 0;
  let teamBSetsWon = 0;
  for (const [a, b] of sets) {
    if (a > b) teamASetsWon += 1;
    else if (b > a) teamBSetsWon += 1;
  }
  return { teamASetsWon, teamBSetsWon };
}

export type MatchScoreError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'tie_not_allowed' };

export async function submitMatchScore(
  tx: typeof Db,
  matchId: string,
  actorUserId: string,
  isAdmin: boolean,
  sets: ReadonlyArray<readonly [number, number]>,
): Promise<
  | {
      match: typeof matches.$inferSelect;
      ratingChanges: Record<string, RatingDelta>;
    }
  | MatchScoreError
> {
  const [match] = await tx
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return { kind: 'not_found' };

  const players = [
    match.teamAPlayer1,
    match.teamAPlayer2,
    match.teamBPlayer1,
    match.teamBPlayer2,
  ];
  if (!isAdmin && !players.includes(actorUserId)) return { kind: 'forbidden' };

  const { teamASetsWon, teamBSetsWon } = computeSetWinners(sets);
  if (teamASetsWon === teamBSetsWon) return { kind: 'tie_not_allowed' };
  const winner: 'A' | 'B' = teamASetsWon > teamBSetsWon ? 'A' : 'B';

  // Pull current ratings (default to starter rating if missing).
  const ratingRows = await tx
    .select()
    .from(userRatings)
    .where(inArray(userRatings.userId, players));
  const byId = new Map(ratingRows.map((r) => [r.userId, r]));
  const playerOf = (id: string): Player => {
    const r = byId.get(id);
    return {
      rating: r?.ratingInternal ?? 1500,
      rd: r?.ratingDeviation ?? 350,
      volatility: r?.volatility ?? 0.06,
    };
  };

  const before: Record<string, Player> = {
    [match.teamAPlayer1]: playerOf(match.teamAPlayer1),
    [match.teamAPlayer2]: playerOf(match.teamAPlayer2),
    [match.teamBPlayer1]: playerOf(match.teamBPlayer1),
    [match.teamBPlayer2]: playerOf(match.teamBPlayer2),
  };

  const matchResult: DoublesMatchResult = {
    teamA: [before[match.teamAPlayer1]!, before[match.teamAPlayer2]!],
    teamB: [before[match.teamBPlayer1]!, before[match.teamBPlayer2]!],
    winner,
  };
  const update = applyDoublesMatch(matchResult);

  const ratingChanges: Record<string, RatingDelta> = {};
  const after = {
    [match.teamAPlayer1]: update.teamA[0],
    [match.teamAPlayer2]: update.teamA[1],
    [match.teamBPlayer1]: update.teamB[0],
    [match.teamBPlayer2]: update.teamB[1],
  };
  for (const id of players) {
    const b = before[id]!;
    const a = after[id]!;
    ratingChanges[id] = {
      ratingBefore: b.rating,
      ratingAfter: a.rating,
      rdBefore: b.rd,
      rdAfter: a.rd,
      volatilityBefore: b.volatility,
      volatilityAfter: a.volatility,
      reliabilityAfter: reliabilityPct(a.rd),
    };
  }

  // TODO(M3): once the rating-recalculation worker flips to --apply, also write
  // user_ratings rows here (or let the worker fold from this row). Today we
  // record the deltas only and keep verification_status = 'unverified' so the
  // worker treats this as a candidate, not authoritative.

  const [updated] = await tx
    .update(matches)
    .set({
      teamASetsWon,
      teamBSetsWon,
      rawScore: sets as unknown as object,
      ratingChanges: ratingChanges as unknown as object,
      verificationStatus: 'unverified',
    })
    .where(eq(matches.id, matchId))
    .returning();

  // TODO(M3-C @feera/notifications): notify the opposing team via the router.
  // For now log + emit a typed PostHog event via @feera/analytics once it lands.
  console.info('[matches] score submitted', {
    matchId,
    actorUserId,
    teamASetsWon,
    teamBSetsWon,
  });

  if (!updated) return { kind: 'not_found' };
  return { match: updated, ratingChanges };
}

export interface RatingDelta {
  ratingBefore: number;
  ratingAfter: number;
  rdBefore: number;
  rdAfter: number;
  volatilityBefore: number;
  volatilityAfter: number;
  reliabilityAfter: number;
}

export async function verifyMatch(
  tx: typeof Db,
  matchId: string,
  actorUserId: string,
  isAdmin: boolean,
): Promise<{ match: typeof matches.$inferSelect } | { kind: 'not_found' | 'forbidden' | 'wrong_team' }> {
  const [match] = await tx
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return { kind: 'not_found' };

  // Verifier must be on the team opposite the recorder.
  const recorderOnA =
    match.recordedByUserId === match.teamAPlayer1 ||
    match.recordedByUserId === match.teamAPlayer2;
  const actorOnA =
    actorUserId === match.teamAPlayer1 || actorUserId === match.teamAPlayer2;
  const actorOnB =
    actorUserId === match.teamBPlayer1 || actorUserId === match.teamBPlayer2;

  if (!isAdmin) {
    if (!actorOnA && !actorOnB) return { kind: 'forbidden' };
    if (recorderOnA && actorOnA) return { kind: 'wrong_team' };
    if (!recorderOnA && actorOnB) return { kind: 'wrong_team' };
  }

  const [updated] = await tx
    .update(matches)
    .set({ verificationStatus: 'peer_verified' })
    .where(eq(matches.id, matchId))
    .returning();
  if (!updated) return { kind: 'not_found' };
  return { match: updated };
}

export async function disputeMatch(
  tx: typeof Db,
  matchId: string,
  actorUserId: string,
  isAdmin: boolean,
  reason: string,
): Promise<{ match: typeof matches.$inferSelect } | { kind: 'not_found' | 'forbidden' }> {
  const [match] = await tx
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return { kind: 'not_found' };
  const players = [
    match.teamAPlayer1,
    match.teamAPlayer2,
    match.teamBPlayer1,
    match.teamBPlayer2,
  ];
  if (!isAdmin && !players.includes(actorUserId)) return { kind: 'forbidden' };

  const existing = (match.ratingChanges ?? {}) as Record<string, unknown>;
  const disputes = Array.isArray(existing.disputes) ? (existing.disputes as unknown[]) : [];
  const nextChanges = {
    ...existing,
    disputes: [
      ...disputes,
      { byUserId: actorUserId, reason, at: new Date().toISOString() },
    ],
  };

  const [updated] = await tx
    .update(matches)
    .set({
      verificationStatus: 'unverified',
      ratingChanges: nextChanges as unknown as object,
    })
    .where(eq(matches.id, matchId))
    .returning();
  if (!updated) return { kind: 'not_found' };
  return { match: updated };
}
