/**
 * Round-robin (doubles): every team plays every other team. Pre-formed teams
 * (each participant carries `partnerUserId`). All matches are generated up
 * front using the circle method (Berger tables).
 */

import type {
  EngineState,
  GeneratedMatch,
  MatchResult,
  Participant,
  PersistedMatch,
  Standing,
  TournamentEngine,
} from './types';
import { blankStandings, standingsFromMatches } from './utils';

/**
 * Circle method: with N teams, fix team 0 and rotate the rest. N-1 rounds,
 * N/2 matches per round. Adds a phantom bye team if N is odd.
 */
function circleRounds<T>(teams: ReadonlyArray<T>): Array<Array<[T, T]>> {
  const arr: Array<T | null> = teams.slice();
  if (arr.length % 2 === 1) arr.push(null);
  const n = arr.length;
  const rounds: Array<Array<[T, T]>> = [];
  for (let r = 0; r < n - 1; r += 1) {
    const round: Array<[T, T]> = [];
    for (let i = 0; i < n / 2; i += 1) {
      const a = arr[i]!;
      const b = arr[n - 1 - i]!;
      if (a !== null && b !== null) round.push([a, b]);
    }
    rounds.push(round);
    // Rotate: keep first fixed, move last to position 1.
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }
  return rounds;
}

export class RoundRobinEngine implements TournamentEngine {
  readonly format = 'round_robin' as const;

  generateInitialMatches(participants: ReadonlyArray<Participant>): GeneratedMatch[] {
    if (participants.length < 2) return [];
    const rounds = circleRounds(participants);
    const out: GeneratedMatch[] = [];
    rounds.forEach((round, rIdx) => {
      round.forEach(([a, b], mIdx) => {
        out.push({
          roundNumber: rIdx + 1,
          bracketPosition: { segment: 'RR', slot: mIdx, label: `R${rIdx + 1} M${mIdx + 1}` },
          teamA: [a.userId, a.partnerUserId ?? a.userId],
          teamB: [b.userId, b.partnerUserId ?? b.userId],
        });
      });
    });
    return out;
  }

  advanceFromMatchResult(
    state: EngineState,
    completedMatchId: string,
    result: MatchResult,
  ): { state: EngineState; emitted: GeneratedMatch[] } {
    const matches: PersistedMatch[] = state.matches.map((m) =>
      m.id === completedMatchId ? { ...m, result } : m,
    );
    return { state: { ...state, matches }, emitted: [] };
  }

  isComplete(state: EngineState): boolean {
    return state.matches.length > 0 && state.matches.every((m) => m.result !== undefined);
  }

  getStandings(state: EngineState): Standing[] {
    if (state.matches.length === 0) {
      return blankStandings(state.participants.map((p) => p.userId));
    }
    return standingsFromMatches(
      state.participants.map((p) => p.userId),
      state.matches,
      3,
      0,
    );
  }

  getNextMatches(state: EngineState, count: number): PersistedMatch[] {
    return state.matches.filter((m) => !m.result).slice(0, count);
  }
}

export const roundRobinEngine = new RoundRobinEngine();
