/**
 * Mexicano: like Americano but partners are level-balanced after each round.
 * Round 1 pairs top vs bottom by rating (1+4 vs 2+3 on each court). Subsequent
 * rounds re-sort by points scored so far and re-pair.
 *
 * MVP scaffold: round 1 + standings work; full round-by-round rotation lives
 * in `advanceFromMatchResult` once a round completes (winners groups stay
 * together-ish on the next court).
 *
 * TODO(M3): nuanced rotation (winners promote up a court, losers drop) per
 * the canonical Padel Mexicano spec.
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
import { blankStandings } from './utils';

export interface MexicanoOptions {
  rounds?: number;
}

export class MexicanoEngine implements TournamentEngine<MexicanoOptions> {
  readonly format = 'mexicano' as const;

  generateInitialMatches(
    participants: ReadonlyArray<Participant>,
    options?: MexicanoOptions,
  ): GeneratedMatch[] {
    if (participants.length < 4) return [];
    // Sort high to low rating; pair top with bottom on each court.
    const sorted = participants
      .slice()
      .sort((a, b) => b.ratingDisplay - a.ratingDisplay);
    const courts = Math.floor(sorted.length / 4);
    const out: GeneratedMatch[] = [];
    for (let c = 0; c < courts; c += 1) {
      const slice = sorted.slice(c * 4, c * 4 + 4);
      const [s1, s2, s3, s4] = slice;
      if (!s1 || !s2 || !s3 || !s4) continue;
      out.push({
        roundNumber: 1,
        bracketPosition: { segment: 'MX', slot: c, label: `Court ${c + 1} R1` },
        teamA: [s1.userId, s4.userId],
        teamB: [s2.userId, s3.userId],
      });
    }
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
    // TODO(Mexicano spec): once round complete, re-sort by points and emit
    // next round with promotion/demotion logic. For now, no auto-emission.
    return { state: { ...state, matches }, emitted: [] };
  }

  isComplete(state: EngineState): boolean {
    return state.matches.length > 0 && state.matches.every((m) => m.result !== undefined);
  }

  getStandings(state: EngineState): Standing[] {
    const ids = state.participants.map((p) => p.userId);
    const rows = blankStandings(ids);
    // Points = games scored across all completed matches.
    const games = new Map<string, number>();
    for (const id of ids) games.set(id, 0);
    let wins = new Map<string, number>();
    for (const id of ids) wins.set(id, 0);
    let losses = new Map<string, number>();
    for (const id of ids) losses.set(id, 0);
    for (const m of state.matches) {
      if (!m.result) continue;
      const gA = m.result.rawScore.reduce((s, [a]) => s + a, 0);
      const gB = m.result.rawScore.reduce((s, [, b]) => s + b, 0);
      const aWon = m.result.teamASetsWon > m.result.teamBSetsWon;
      for (const id of m.teamA) {
        games.set(id, (games.get(id) ?? 0) + gA);
        if (aWon) wins.set(id, (wins.get(id) ?? 0) + 1);
        else losses.set(id, (losses.get(id) ?? 0) + 1);
      }
      for (const id of m.teamB) {
        games.set(id, (games.get(id) ?? 0) + gB);
        if (!aWon) wins.set(id, (wins.get(id) ?? 0) + 1);
        else losses.set(id, (losses.get(id) ?? 0) + 1);
      }
    }
    rows.forEach((r) => {
      r.points = games.get(r.participantId) ?? 0;
      r.wins = wins.get(r.participantId) ?? 0;
      r.losses = losses.get(r.participantId) ?? 0;
      r.matchesPlayed = r.wins + r.losses;
    });
    rows.sort((x, y) => y.points - x.points || x.participantId.localeCompare(y.participantId));
    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
    return rows;
  }

  getNextMatches(state: EngineState, count: number): PersistedMatch[] {
    return state.matches.filter((m) => !m.result).slice(0, count);
  }
}

export const mexicanoEngine = new MexicanoEngine();
