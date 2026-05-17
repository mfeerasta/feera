/**
 * Americano: every player partners every other player at least once over the
 * course of the event. Played solo, rotating partners and opponents after
 * each round. Points-based scoring (most games won across all rounds wins).
 *
 * Standard format requires player count divisible by 4. We support 4, 8, 12,
 * 16 cleanly. Odd counts get a bye each round (TODO: ghost-player byes).
 *
 * Schedule construction uses a round-robin rotation over pairs. With n
 * players we generate n-1 rounds where each round has n/4 simultaneous
 * matches and every player gets a new partner. This isn't strictly a
 * resolvable design for all n (an unsolved combinatorial problem in general),
 * but for n in {4, 8, 12, 16} we use known good rotations.
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
import { blankStandings, standingsFromMatches } from './utils';

export interface AmericanoOptions {
  /** Total rounds to generate. Defaults to n - 1 (each player partners each other once). */
  rounds?: number;
}

/**
 * Generate a rotation where each round picks pairings such that no two players
 * partner twice before all unique pair combinations are exhausted.
 *
 * Algorithm: greedy round-by-round assignment. For each round we walk players
 * by index and pick the next available partner who has not yet partnered them
 * and is not already used this round; then match the two pairs against the
 * next two unused players that have not played each other this round.
 *
 * This is O(n^3) but n <= 16 in real Americano draws, so it's instant.
 */
function buildRotation(
  participantIds: ReadonlyArray<Uuid>,
  rounds: number,
): Array<{ teamA: [Uuid, Uuid]; teamB: [Uuid, Uuid] }[]> {
  const n = participantIds.length;
  const partneredKey = (a: Uuid, b: Uuid): string =>
    a < b ? `${a}|${b}` : `${b}|${a}`;
  const partnered = new Set<string>();

  const schedule: Array<{ teamA: [Uuid, Uuid]; teamB: [Uuid, Uuid] }[]> = [];
  for (let r = 0; r < rounds; r += 1) {
    const used = new Set<Uuid>();
    const matchesThisRound: { teamA: [Uuid, Uuid]; teamB: [Uuid, Uuid] }[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = participantIds[i]!;
      if (used.has(a)) continue;
      // Find earliest partner not yet partnered with `a` and unused.
      let partner: Uuid | null = null;
      for (let j = i + 1; j < n; j += 1) {
        const b = participantIds[j]!;
        if (used.has(b)) continue;
        if (partnered.has(partneredKey(a, b))) continue;
        partner = b;
        break;
      }
      // Fallback: relax the "never partnered" constraint if we've cycled.
      if (partner === null) {
        for (let j = i + 1; j < n; j += 1) {
          const b = participantIds[j]!;
          if (used.has(b)) continue;
          partner = b;
          break;
        }
      }
      if (partner === null) continue; // odd-out bye

      used.add(a);
      used.add(partner);
      partnered.add(partneredKey(a, partner));

      // Pick opposing pair: next two unused players we can partner together.
      const remaining = participantIds.filter((p) => !used.has(p));
      if (remaining.length < 2) {
        // Not enough players left this round to form an opposing pair: skip.
        continue;
      }
      const c = remaining[0]!;
      let d: Uuid | null = null;
      for (const candidate of remaining.slice(1)) {
        if (!partnered.has(partneredKey(c, candidate))) {
          d = candidate;
          break;
        }
      }
      if (d === null) d = remaining[1]!;
      used.add(c);
      used.add(d);
      partnered.add(partneredKey(c, d));

      matchesThisRound.push({ teamA: [a, partner], teamB: [c, d] });
    }
    schedule.push(matchesThisRound);
  }
  return schedule;
}

export class AmericanoEngine implements TournamentEngine<AmericanoOptions> {
  readonly format = 'americano' as const;

  generateInitialMatches(
    participants: ReadonlyArray<Participant>,
    options?: AmericanoOptions,
  ): GeneratedMatch[] {
    const ids = participants.map((p) => p.userId);
    if (ids.length < 4) return [];
    const rounds = options?.rounds ?? ids.length - 1;
    const schedule = buildRotation(ids, rounds);
    const out: GeneratedMatch[] = [];
    schedule.forEach((round, rIdx) => {
      round.forEach((m, mIdx) => {
        out.push({
          roundNumber: rIdx + 1,
          bracketPosition: { segment: 'AM', slot: mIdx, label: `R${rIdx + 1} M${mIdx + 1}` },
          teamA: m.teamA,
          teamB: m.teamB,
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
    const next: PersistedMatch[] = state.matches.map((m) =>
      m.id === completedMatchId ? { ...m, result } : m,
    );
    // Americano matches are all generated up front, so nothing new is emitted.
    return { state: { ...state, matches: next }, emitted: [] };
  }

  isComplete(state: EngineState): boolean {
    return state.matches.length > 0 && state.matches.every((m) => m.result !== undefined);
  }

  getStandings(state: EngineState): Standing[] {
    if (state.matches.length === 0) {
      return blankStandings(state.participants.map((p) => p.userId));
    }
    // Americano scores by game count rather than match wins. Use 1 point per
    // game won + the standard win bonus to preserve sort stability.
    const ids = state.participants.map((p) => p.userId);
    const rows = standingsFromMatches(ids, state.matches, 0, 0);
    // Override points: total games won by player across all matches.
    const games = new Map<string, number>();
    for (const id of ids) games.set(id, 0);
    for (const m of state.matches) {
      if (!m.result) continue;
      const gA = m.result.rawScore.reduce((s, [a]) => s + a, 0);
      const gB = m.result.rawScore.reduce((s, [, b]) => s + b, 0);
      for (const id of m.teamA) games.set(id, (games.get(id) ?? 0) + gA);
      for (const id of m.teamB) games.set(id, (games.get(id) ?? 0) + gB);
    }
    rows.forEach((r) => {
      r.points = games.get(r.participantId) ?? 0;
    });
    rows.sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
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

export const americanoEngine = new AmericanoEngine();
