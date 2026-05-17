import { and, asc, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import {
  tournamentMatches,
  tournamentRegistrations,
  tournamentRounds,
  tournaments,
  userRatings,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import { toDisplayRating } from '@feera/matching/glicko';
import { getEngine } from '@feera/matching/tournaments';
import type {
  EngineState,
  GeneratedMatch,
  Participant,
  PersistedMatch,
} from '@feera/matching/tournaments';

import { computeSetWinners } from '@/lib/matches/service';

type TournamentRow = typeof tournaments.$inferSelect;
type TournamentMatchRow = typeof tournamentMatches.$inferSelect;
type TournamentRegistrationRow = typeof tournamentRegistrations.$inferSelect;
/** Format strings stored in the `tournament_format` DB enum (no `ladder`). */
export type DbTournamentFormat = TournamentRow['format'];

export interface TournamentListFilters {
  clubId?: string;
  status?: TournamentRow['status'];
  format?: DbTournamentFormat;
  countryCode?: string;
  city?: string;
  genderPreference?: TournamentRow['genderPreference'];
  minLevel?: number;
  maxLevel?: number;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export async function listTournaments(tx: typeof Db, f: TournamentListFilters) {
  const filters: SQL[] = [];
  if (f.clubId) filters.push(eq(tournaments.clubId, f.clubId));
  if (f.status) filters.push(eq(tournaments.status, f.status));
  if (f.format) filters.push(eq(tournaments.format, f.format));
  if (f.countryCode) filters.push(eq(tournaments.countryCode, f.countryCode));
  if (f.city) filters.push(eq(tournaments.city, f.city));
  if (f.genderPreference) filters.push(eq(tournaments.genderPreference, f.genderPreference));
  if (typeof f.minLevel === 'number') filters.push(gte(tournaments.minLevel, f.minLevel));
  if (typeof f.maxLevel === 'number') filters.push(lte(tournaments.maxLevel, f.maxLevel));
  if (f.from) filters.push(gte(tournaments.startAt, f.from));
  if (f.to) filters.push(lte(tournaments.startAt, f.to));
  return tx
    .select()
    .from(tournaments)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(tournaments.startAt))
    .limit(f.limit)
    .offset(f.offset);
}

/**
 * Build engine `Participant` list from confirmed registrations + ratings.
 */
async function loadParticipants(
  tx: typeof Db,
  tournamentId: string,
): Promise<{ participants: Participant[]; regs: TournamentRegistrationRow[] }> {
  const regs = await tx
    .select()
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, 'confirmed'),
      ),
    );
  if (regs.length === 0) return { participants: [], regs };

  const userIds = Array.from(
    new Set(regs.flatMap((r) => [r.userId, r.partnerUserId].filter(Boolean) as string[])),
  );
  const ratings = await tx.select().from(userRatings).where(inArray(userRatings.userId, userIds));
  const byUser = new Map(ratings.map((r) => [r.userId, r]));

  const participants: Participant[] = regs.map((r) => {
    const rating = byUser.get(r.userId);
    const displayRating = rating ? toDisplayRating(rating.ratingInternal ?? 1500) : 3.5;
    return {
      userId: r.id, // engine works in registration-id space for team formats
      partnerUserId: r.partnerUserId ?? undefined,
      teamName: r.teamName ?? undefined,
      seed: r.seed ?? undefined,
      ratingDisplay: displayRating,
    };
  });
  return { participants, regs };
}

async function loadPersistedMatches(
  tx: typeof Db,
  tournamentId: string,
): Promise<PersistedMatch[]> {
  const rows = await tx
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournamentId, tournamentId))
    .orderBy(asc(tournamentMatches.createdAt));
  const rounds = await tx
    .select()
    .from(tournamentRounds)
    .where(eq(tournamentRounds.tournamentId, tournamentId));
  const roundOrdinal = new Map(rounds.map((r) => [r.id, r.ordinal]));
  return rows
    .filter((r) => r.teamARegistrationId && r.teamBRegistrationId)
    .map((r) => ({
      id: r.id,
      roundNumber: r.roundId ? roundOrdinal.get(r.roundId) ?? 1 : 1,
      bracketPosition: (() => {
        try {
          return r.bracketPosition ? JSON.parse(r.bracketPosition) : { segment: 'X', slot: 0 };
        } catch {
          return { segment: 'X', slot: 0 };
        }
      })(),
      // Engine works in registration-id space.
      teamA: [r.teamARegistrationId!, r.teamARegistrationId!] as const,
      teamB: [r.teamBRegistrationId!, r.teamBRegistrationId!] as const,
      result:
        r.teamASetsWon !== null && r.teamBSetsWon !== null
          ? {
              teamASetsWon: r.teamASetsWon,
              teamBSetsWon: r.teamBSetsWon,
              rawScore: (r.rawScore as ReadonlyArray<readonly [number, number]>) ?? [],
            }
          : undefined,
    }));
}

async function ensureRound(
  tx: typeof Db,
  tournamentId: string,
  ordinal: number,
): Promise<string> {
  const [existing] = await tx
    .select()
    .from(tournamentRounds)
    .where(
      and(eq(tournamentRounds.tournamentId, tournamentId), eq(tournamentRounds.ordinal, ordinal)),
    )
    .limit(1);
  if (existing) return existing.id;
  const [created] = await tx
    .insert(tournamentRounds)
    .values({ tournamentId, ordinal, name: `Round ${ordinal}` })
    .returning();
  if (!created) throw new Error('round insert returned no row');
  return created.id;
}

async function persistGeneratedMatches(
  tx: typeof Db,
  tournamentId: string,
  generated: GeneratedMatch[],
): Promise<TournamentMatchRow[]> {
  if (generated.length === 0) return [];
  const out: TournamentMatchRow[] = [];
  for (const g of generated) {
    const roundId = await ensureRound(tx, tournamentId, g.roundNumber);
    const [row] = await tx
      .insert(tournamentMatches)
      .values({
        tournamentId,
        roundId,
        teamARegistrationId: g.teamA[0],
        teamBRegistrationId: g.teamB[0],
        bracketPosition: JSON.stringify(g.bracketPosition),
        status: 'scheduled',
      })
      .returning();
    if (row) out.push(row);
  }
  return out;
}

export type StartError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'bad_state' }
  | { kind: 'no_participants' };

/**
 * Start a tournament: generate initial round, persist it, flip status.
 * Wrapped in a SERIALIZABLE transaction by the caller.
 */
export async function startTournament(
  tx: typeof Db,
  tournamentId: string,
  actorUserId: string,
  isAdmin: boolean,
): Promise<{ tournament: TournamentRow; matches: TournamentMatchRow[] } | StartError> {
  const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!t) return { kind: 'not_found' };
  if (!isAdmin && t.organizerUserId !== actorUserId) return { kind: 'forbidden' };
  if (t.status === 'in_progress' || t.status === 'completed' || t.status === 'cancelled') {
    return { kind: 'bad_state' };
  }

  const { participants } = await loadParticipants(tx, tournamentId);
  if (participants.length < 2) return { kind: 'no_participants' };

  const engine = getEngine(t.format);
  const generated = engine.generateInitialMatches(participants);
  const matches = await persistGeneratedMatches(tx, tournamentId, generated);

  const [updated] = await tx
    .update(tournaments)
    .set({ status: 'in_progress' })
    .where(eq(tournaments.id, tournamentId))
    .returning();
  if (!updated) throw new Error('tournament update returned no row');
  return { tournament: updated, matches };
}

export type ScoreError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'tie_not_allowed' };

/**
 * Submit a score for a tournament match, advance the engine, persist any
 * newly emitted matches. Caller wraps in SERIALIZABLE tx.
 */
export async function submitTournamentMatchScore(
  tx: typeof Db,
  tournamentId: string,
  matchId: string,
  actorUserId: string,
  isAdmin: boolean,
  sets: ReadonlyArray<readonly [number, number]>,
): Promise<
  | { match: TournamentMatchRow; emitted: TournamentMatchRow[]; complete: boolean }
  | ScoreError
> {
  const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!t) return { kind: 'not_found' };

  const [m] = await tx
    .select()
    .from(tournamentMatches)
    .where(
      and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournamentId, tournamentId)),
    )
    .limit(1);
  if (!m) return { kind: 'not_found' };

  // Authorization: any of the 4 players on the two teams, or admin.
  if (!isAdmin) {
    const regIds = [m.teamARegistrationId, m.teamBRegistrationId].filter(Boolean) as string[];
    const regs = await tx
      .select()
      .from(tournamentRegistrations)
      .where(inArray(tournamentRegistrations.id, regIds));
    const playerIds = new Set(
      regs.flatMap((r) => [r.userId, r.partnerUserId].filter(Boolean) as string[]),
    );
    if (!playerIds.has(actorUserId)) return { kind: 'forbidden' };
  }

  const { teamASetsWon, teamBSetsWon } = computeSetWinners(sets);
  if (teamASetsWon === teamBSetsWon) return { kind: 'tie_not_allowed' };

  const [updated] = await tx
    .update(tournamentMatches)
    .set({
      teamASetsWon,
      teamBSetsWon,
      rawScore: sets as unknown as object,
      status: 'completed',
    })
    .where(eq(tournamentMatches.id, matchId))
    .returning();
  if (!updated) return { kind: 'not_found' };

  // Advance engine: rebuild state, advance, persist new emitted matches.
  const { participants } = await loadParticipants(tx, tournamentId);
  const persisted = await loadPersistedMatches(tx, tournamentId);
  const engine = getEngine(t.format);
  const state: EngineState = { matches: persisted, participants };
  const { state: nextState, emitted } = engine.advanceFromMatchResult(state, matchId, {
    teamASetsWon,
    teamBSetsWon,
    rawScore: sets,
  });
  const emittedRows = await persistGeneratedMatches(tx, tournamentId, emitted);
  const complete = engine.isComplete(nextState);
  if (complete) {
    await tx
      .update(tournaments)
      .set({ status: 'completed' })
      .where(eq(tournaments.id, tournamentId));
  }

  return { match: updated, emitted: emittedRows, complete };
}

export async function getStandings(tx: typeof Db, tournamentId: string) {
  const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!t) return null;
  const { participants, regs } = await loadParticipants(tx, tournamentId);
  const persisted = await loadPersistedMatches(tx, tournamentId);
  const engine = getEngine(t.format);
  const standings = engine.getStandings({ matches: persisted, participants });
  const regsById = new Map(regs.map((r) => [r.id, r]));
  return standings.map((s) => {
    const reg = regsById.get(s.participantId);
    return {
      ...s,
      teamName: reg?.teamName ?? null,
      userId: reg?.userId ?? null,
      partnerUserId: reg?.partnerUserId ?? null,
    };
  });
}

export async function getNextMatches(tx: typeof Db, tournamentId: string, count = 5) {
  const persisted = await loadPersistedMatches(tx, tournamentId);
  const upcoming = persisted.filter((m) => !m.result).slice(0, count);
  return upcoming;
}

export type RegistrationError =
  | { kind: 'not_found' }
  | { kind: 'closed' }
  | { kind: 'duplicate' }
  | { kind: 'full' }
  | { kind: 'pplp_requires_team' };

export async function registerForTournament(
  tx: typeof Db,
  tournamentId: string,
  userId: string,
  partnerUserId: string | undefined,
  teamName: string | undefined,
): Promise<{ registration: TournamentRegistrationRow } | RegistrationError> {
  const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!t) return { kind: 'not_found' };
  if (t.status !== 'open') return { kind: 'closed' };
  if (t.pplpEnabled && !teamName) return { kind: 'pplp_requires_team' };

  const [existing] = await tx
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.userId, userId),
      ),
    )
    .limit(1);
  if (existing) return { kind: 'duplicate' };

  if (typeof t.maxTeams === 'number') {
    const all = await tx
      .select({ id: tournamentRegistrations.id })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, 'confirmed'),
        ),
      );
    if (all.length >= t.maxTeams) return { kind: 'full' };
  }

  const [row] = await tx
    .insert(tournamentRegistrations)
    .values({
      tournamentId,
      userId,
      partnerUserId: partnerUserId ?? null,
      teamName: teamName ?? null,
      status: 'pending',
    })
    .returning();
  if (!row) throw new Error('registration insert returned no row');
  return { registration: row };
}

/**
 * Six hardcoded PPLP franchise teams. Used as the allow-list for
 * `tournament_registrations.team_name` when `tournament.pplpEnabled = true`.
 * TODO(PPLP rules doc): formal scoring, draft mechanics, captain rules.
 */
export const PPLP_TEAMS = [
  'Lions',
  'Hawks',
  'Sharks',
  'Stallions',
  'Bulls',
  'Markhor',
] as const;

export function isPplpTeam(name: string): boolean {
  return (PPLP_TEAMS as readonly string[]).includes(name);
}

export function tournamentsListExportForOrder() {
  // Re-export the descending order helper for ad-hoc admin sorts.
  return desc(tournaments.startAt);
}
