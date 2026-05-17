/**
 * Single-elimination knockout. Pre-formed doubles teams. Standard seeding
 * (1 vs N, 2 vs N-1, ...) with byes for top seeds when count is not a power
 * of two.
 *
 * The engine emits round 1 up front; later rounds are emitted as each prior
 * round completes via `advanceFromMatchResult`.
 */

import type {
  EngineState,
  GeneratedMatch,
  MatchResult,
  Participant,
  PersistedMatch,
  Standing,
  TournamentEngine,
  Uuid,
} from './types';
import { nextPowerOfTwo, seedPairings } from './utils';

export interface KnockoutOptions {
  /** When true, sort participants by `seed` ascending (1 = top seed). Default true. */
  useSeeding?: boolean;
}

export class KnockoutEngine implements TournamentEngine<KnockoutOptions> {
  readonly format = 'single_elimination' as const;

  generateInitialMatches(
    participants: ReadonlyArray<Participant>,
    options?: KnockoutOptions,
  ): GeneratedMatch[] {
    if (participants.length < 2) return [];
    const useSeeding = options?.useSeeding ?? true;
    const ordered = useSeeding
      ? participants.slice().sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
      : participants.slice();
    const pairs = seedPairings(ordered);
    const round1: GeneratedMatch[] = [];
    pairs.forEach(([a, b], idx) => {
      if (!a || !b) return; // bye, no match generated in round 1
      round1.push({
        roundNumber: 1,
        bracketPosition: { segment: 'WB', slot: idx, label: `R1 M${idx + 1}` },
        teamA: [a.userId, a.partnerUserId ?? a.userId],
        teamB: [b.userId, b.partnerUserId ?? b.userId],
      });
    });
    return round1;
  }

  advanceFromMatchResult(
    state: EngineState,
    completedMatchId: string,
    result: MatchResult,
  ): { state: EngineState; emitted: GeneratedMatch[] } {
    const matches: PersistedMatch[] = state.matches.map((m) =>
      m.id === completedMatchId ? { ...m, result } : m,
    );
    const newState: EngineState = { ...state, matches };

    // Find current round number from completed match.
    const completed = matches.find((m) => m.id === completedMatchId);
    if (!completed) return { state: newState, emitted: [] };
    const round = completed.roundNumber;
    const inRound = matches.filter((m) => m.roundNumber === round);
    const allDone = inRound.every((m) => m.result !== undefined);
    if (!allDone) return { state: newState, emitted: [] };

    // If there's already a next round persisted, do nothing.
    const hasNextRound = matches.some((m) => m.roundNumber === round + 1);
    if (hasNextRound) return { state: newState, emitted: [] };

    // Build next-round pairings from winners. We pair winner[0]&[1], [2]&[3], etc.,
    // preserving bracket order so the seed structure is honored.
    const winners: Array<readonly [Uuid, Uuid]> = inRound
      .slice()
      .sort((x, y) => x.bracketPosition.slot - y.bracketPosition.slot)
      .map((m) => {
        const aWon = (m.result?.teamASetsWon ?? 0) > (m.result?.teamBSetsWon ?? 0);
        return aWon ? m.teamA : m.teamB;
      });
    if (winners.length < 2) return { state: newState, emitted: [] };

    const emitted: GeneratedMatch[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      const teamA = winners[i];
      const teamB = winners[i + 1];
      if (!teamA || !teamB) break;
      emitted.push({
        roundNumber: round + 1,
        bracketPosition: { segment: 'WB', slot: i / 2, label: `R${round + 1} M${i / 2 + 1}` },
        teamA,
        teamB,
      });
    }
    return { state: newState, emitted };
  }

  isComplete(state: EngineState): boolean {
    if (state.matches.length === 0) return false;
    // Tournament complete when the highest-round match has exactly one team standing.
    const maxRound = Math.max(...state.matches.map((m) => m.roundNumber));
    const finalMatches = state.matches.filter((m) => m.roundNumber === maxRound);
    if (finalMatches.length !== 1) return false;
    return finalMatches[0]?.result !== undefined;
  }

  getStandings(state: EngineState): Standing[] {
    // Bracket placement: champion gets rank 1, finalist rank 2, semis 3-4, etc.
    // Simple ranking by furthest round reached + points = wins.
    const ids = state.participants.map((p) => p.userId);
    const reach = new Map<Uuid, number>();
    const wins = new Map<Uuid, number>();
    const losses = new Map<Uuid, number>();
    for (const id of ids) {
      reach.set(id, 0);
      wins.set(id, 0);
      losses.set(id, 0);
    }
    for (const m of state.matches) {
      const all = [...m.teamA, ...m.teamB];
      for (const id of all) {
        reach.set(id, Math.max(reach.get(id) ?? 0, m.roundNumber));
      }
      if (!m.result) continue;
      const aWon = m.result.teamASetsWon > m.result.teamBSetsWon;
      const winnerIds = aWon ? m.teamA : m.teamB;
      const loserIds = aWon ? m.teamB : m.teamA;
      for (const id of winnerIds) wins.set(id, (wins.get(id) ?? 0) + 1);
      for (const id of loserIds) losses.set(id, (losses.get(id) ?? 0) + 1);
    }
    const rows: Standing[] = ids.map((id) => ({
      participantId: id,
      rank: 0,
      points: (wins.get(id) ?? 0) * 3,
      matchesPlayed: (wins.get(id) ?? 0) + (losses.get(id) ?? 0),
      wins: wins.get(id) ?? 0,
      losses: losses.get(id) ?? 0,
      gameDiff: 0,
    }));
    rows.sort((x, y) => {
      const rx = reach.get(x.participantId) ?? 0;
      const ry = reach.get(y.participantId) ?? 0;
      if (ry !== rx) return ry - rx;
      if (y.wins !== x.wins) return y.wins - x.wins;
      return x.participantId.localeCompare(y.participantId);
    });
    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
    return rows;
  }

  getNextMatches(state: EngineState, count: number): PersistedMatch[] {
    return state.matches.filter((m) => !m.result).slice(0, count);
  }
}

export const knockoutEngine = new KnockoutEngine();
export { nextPowerOfTwo };
