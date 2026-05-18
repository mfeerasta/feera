/**
 * Bracket data builder. Joins tournament_matches + rounds + registrations +
 * users + courts into a serialisable, render-friendly shape consumed by
 * `components/tournaments/bracket-svg.tsx`. Pure data shaping, no React.
 *
 * Only meaningful for bracket formats (single/double elimination, knockout).
 * For other formats the caller should not invoke this and should fall back to
 * the standings table instead.
 */

import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  courts,
  tournamentMatches,
  tournamentRegistrations,
  tournamentRounds,
  users,
} from '@feera/db';
import type { db as Db } from '@feera/db';

export interface BracketTeam {
  registrationId: string | null;
  p1Name: string;
  p2Name: string;
  teamName: string | null;
}

export interface BracketMatch {
  id: string;
  bracketPosition: { segment: string; slot: number; label?: string };
  teamA: BracketTeam;
  teamB: BracketTeam;
  teamASetsWon: number | null;
  teamBSetsWon: number | null;
  status: 'pending' | 'in_progress' | 'completed';
  courtName: string | null;
  winner: 'A' | 'B' | null;
}

export interface BracketRound {
  round: number;
  name: string;
  matches: BracketMatch[];
}

export interface BracketData {
  rounds: BracketRound[];
  totalRounds: number;
}

const EMPTY_TEAM: BracketTeam = {
  registrationId: null,
  p1Name: 'TBD',
  p2Name: 'TBD',
  teamName: null,
};

/**
 * Maps DB match status to the UI-friendly tri-state used by the SVG renderer.
 * `scheduled` without scores -> pending. `in_progress` literal -> in_progress.
 * `completed` / `walkover` -> completed.
 */
function uiStatus(
  dbStatus: string,
  teamASetsWon: number | null,
  teamBSetsWon: number | null,
): 'pending' | 'in_progress' | 'completed' {
  if (dbStatus === 'completed' || dbStatus === 'walkover') return 'completed';
  if (dbStatus === 'in_progress') return 'in_progress';
  if (teamASetsWon !== null && teamBSetsWon !== null) return 'completed';
  return 'pending';
}

export async function buildBracketData(
  tx: typeof Db,
  tournamentId: string,
): Promise<BracketData> {
  const [rounds, matches] = await Promise.all([
    tx
      .select()
      .from(tournamentRounds)
      .where(eq(tournamentRounds.tournamentId, tournamentId))
      .orderBy(asc(tournamentRounds.ordinal)),
    tx
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId)),
  ]);

  const regIds = Array.from(
    new Set(
      matches
        .flatMap((m) => [m.teamARegistrationId, m.teamBRegistrationId])
        .filter((v): v is string => v !== null),
    ),
  );
  const regs =
    regIds.length > 0
      ? await tx
          .select()
          .from(tournamentRegistrations)
          .where(inArray(tournamentRegistrations.id, regIds))
      : [];
  const userIds = Array.from(
    new Set(
      regs.flatMap((r) =>
        [r.userId, r.partnerUserId].filter((v): v is string => v !== null),
      ),
    ),
  );
  const userRows =
    userIds.length > 0
      ? await tx
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const userById = new Map(userRows.map((u) => [u.id, u.displayName]));

  const courtIds = Array.from(
    new Set(matches.map((m) => m.courtId).filter((v): v is string => v !== null)),
  );
  const courtRows =
    courtIds.length > 0
      ? await tx
          .select({ id: courts.id, name: courts.name })
          .from(courts)
          .where(inArray(courts.id, courtIds))
      : [];
  const courtById = new Map(courtRows.map((c) => [c.id, c.name]));

  const regById = new Map(regs.map((r) => [r.id, r]));

  function teamFromRegId(regId: string | null): BracketTeam {
    if (!regId) return EMPTY_TEAM;
    const reg = regById.get(regId);
    if (!reg) return EMPTY_TEAM;
    const p1 = userById.get(reg.userId) ?? 'Player';
    const p2 = reg.partnerUserId
      ? userById.get(reg.partnerUserId) ?? 'Partner'
      : '';
    return {
      registrationId: reg.id,
      p1Name: p1,
      p2Name: p2,
      teamName: reg.teamName ?? null,
    };
  }

  const roundOrdinalById = new Map(rounds.map((r) => [r.id, r.ordinal]));
  const roundNameById = new Map(rounds.map((r) => [r.id, r.name]));

  // Group matches by round ordinal.
  const byRound = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    const ordinal = m.roundId ? roundOrdinalById.get(m.roundId) ?? 1 : 1;
    let pos: BracketMatch['bracketPosition'] = { segment: 'WB', slot: 0 };
    if (m.bracketPosition) {
      try {
        const parsed = JSON.parse(m.bracketPosition);
        if (parsed && typeof parsed === 'object') pos = parsed;
      } catch {
        // ignore malformed JSON
      }
    }
    const status = uiStatus(m.status, m.teamASetsWon, m.teamBSetsWon);
    const aSets = m.teamASetsWon ?? null;
    const bSets = m.teamBSetsWon ?? null;
    const winner: 'A' | 'B' | null =
      status === 'completed' && aSets !== null && bSets !== null
        ? aSets > bSets
          ? 'A'
          : 'B'
        : null;
    const list = byRound.get(ordinal) ?? [];
    list.push({
      id: m.id,
      bracketPosition: pos,
      teamA: teamFromRegId(m.teamARegistrationId),
      teamB: teamFromRegId(m.teamBRegistrationId),
      teamASetsWon: aSets,
      teamBSetsWon: bSets,
      status,
      courtName: m.courtId ? courtById.get(m.courtId) ?? null : null,
      winner,
    });
    byRound.set(ordinal, list);
  }

  const ordinals = [...byRound.keys()].sort((a, b) => a - b);
  const roundList: BracketRound[] = ordinals.map((ord) => {
    const ms = byRound.get(ord) ?? [];
    ms.sort((x, y) => x.bracketPosition.slot - y.bracketPosition.slot);
    return {
      round: ord,
      name: roundNameById.get(
        rounds.find((r) => r.ordinal === ord)?.id ?? '',
      ) ?? `Round ${ord}`,
      matches: ms,
    };
  });

  return { rounds: roundList, totalRounds: roundList.length };
}
