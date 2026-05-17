/**
 * Ladder: challenge-based, time-bounded league. Players are ranked by
 * position; lower-ranked players issue challenges to those above. A win
 * causes positions to swap.
 *
 * MVP scaffold: initial ladder ordering by rating; standings reflect current
 * positions. Per-challenge match generation happens on demand via the API
 * layer (a player calls `POST /tournaments/[id]/challenge`).
 *
 * TODO(ladder spec): formal challenge windows, decay rules, max-rank-jump.
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

export class LadderEngine implements TournamentEngine {
  readonly format = 'ladder' as const;

  generateInitialMatches(_participants: ReadonlyArray<Participant>): GeneratedMatch[] {
    // Ladder seeds positions but generates no matches up front; challenges
    // are issued ad-hoc by players over the ladder window.
    return [];
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

  isComplete(_state: EngineState): boolean {
    // Time-bounded; closed by admin.
    return false;
  }

  getStandings(state: EngineState): Standing[] {
    const sorted = state.participants
      .slice()
      .sort((a, b) => b.ratingDisplay - a.ratingDisplay);
    const wins = new Map<string, number>();
    const losses = new Map<string, number>();
    for (const p of state.participants) {
      wins.set(p.userId, 0);
      losses.set(p.userId, 0);
    }
    for (const m of state.matches) {
      if (!m.result) continue;
      const aWon = m.result.teamASetsWon > m.result.teamBSetsWon;
      for (const id of m.teamA) {
        if (aWon) wins.set(id, (wins.get(id) ?? 0) + 1);
        else losses.set(id, (losses.get(id) ?? 0) + 1);
      }
      for (const id of m.teamB) {
        if (!aWon) wins.set(id, (wins.get(id) ?? 0) + 1);
        else losses.set(id, (losses.get(id) ?? 0) + 1);
      }
    }
    return sorted.map((p, i) => ({
      participantId: p.userId,
      rank: i + 1,
      points: Math.round(p.ratingDisplay * 100),
      matchesPlayed: (wins.get(p.userId) ?? 0) + (losses.get(p.userId) ?? 0),
      wins: wins.get(p.userId) ?? 0,
      losses: losses.get(p.userId) ?? 0,
      gameDiff: 0,
    }));
  }

  getNextMatches(state: EngineState, count: number): PersistedMatch[] {
    return state.matches.filter((m) => !m.result).slice(0, count);
  }
}

export const ladderEngine = new LadderEngine();
