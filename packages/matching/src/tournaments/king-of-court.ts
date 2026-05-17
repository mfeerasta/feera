/**
 * King (or Queen) of the Court: continuous play on a single court. Winners
 * stay together, losers swap out for the next pair in the queue. Points
 * accrue per win; first to N wins or session timer ends.
 *
 * MVP scaffold: round 1 (first match + queue ordering) + standings work.
 * Per-match "winners stay" advancement is a TODO until we wire it to a
 * realtime queue UI.
 *
 * TODO(M3): emit next match on completion using winners + next queue pair.
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

export interface KingOfCourtOptions {
  /** Length of the queue + initial match. Need >= 6 (2 teams playing + 1 waiting pair). */
  initialTeams?: number;
}

export class KingOfCourtEngine implements TournamentEngine<KingOfCourtOptions> {
  readonly format = 'king_of_the_court' as const;

  generateInitialMatches(participants: ReadonlyArray<Participant>): GeneratedMatch[] {
    if (participants.length < 4) return [];
    // First match: top two seeded teams by rating.
    const sorted = participants
      .slice()
      .sort((a, b) => b.ratingDisplay - a.ratingDisplay);
    const a = sorted[0];
    const b = sorted[1];
    if (!a || !b) return [];
    return [
      {
        roundNumber: 1,
        bracketPosition: { segment: 'KQ', slot: 0, label: 'Court 1 R1' },
        teamA: [a.userId, a.partnerUserId ?? a.userId],
        teamB: [b.userId, b.partnerUserId ?? b.userId],
      },
    ];
  }

  advanceFromMatchResult(
    state: EngineState,
    completedMatchId: string,
    result: MatchResult,
  ): { state: EngineState; emitted: GeneratedMatch[] } {
    const matches: PersistedMatch[] = state.matches.map((m) =>
      m.id === completedMatchId ? { ...m, result } : m,
    );
    // TODO(king-of-court rotation): winners stay, dequeue next pair.
    return { state: { ...state, matches }, emitted: [] };
  }

  isComplete(_state: EngineState): boolean {
    // Session-based, not result-based. Caller (admin UI) ends the tournament.
    return false;
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

export const kingOfCourtEngine = new KingOfCourtEngine();
