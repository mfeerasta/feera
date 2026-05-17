/**
 * Tournament engine types. Each format implements `TournamentEngine` and is
 * driven by the API layer + service in apps/web/src/lib/tournaments/service.ts.
 *
 * The engine is intentionally state-pure. The persistence layer feeds it the
 * full match list + participants, mutates state by replaying advance calls,
 * and writes the resulting next rounds back to Postgres in a SERIALIZABLE
 * transaction. Keeps the engine deterministic and trivially testable.
 */

export type Uuid = string;

/**
 * Format strings align with `tournament_format` enum in packages/db. The
 * external public spec lists "knockout"; the schema persists this as
 * "single_elimination". We expose both via aliases at the API layer.
 */
export type TournamentFormat =
  | 'americano'
  | 'mexicano'
  | 'round_robin'
  | 'single_elimination'
  | 'king_of_the_court'
  | 'ladder'
  | 'pplp';

export interface Participant {
  /** Stable identifier. For solo formats (Americano), this is the userId. For team formats it's the registration id. */
  userId: Uuid;
  /** Doubles partner. Omitted for solo-rotation formats like Americano. */
  partnerUserId?: Uuid;
  teamName?: string;
  /** Higher seed = stronger; ranks the bracket. */
  seed?: number;
  /** Display rating 0.0-7.0 per Glicko-mapped Playtomic scale. */
  ratingDisplay: number;
}

export interface BracketPosition {
  /** "WB" winners' bracket, "LB" losers' bracket, "GR" group, "RR" round-robin, "AM" americano, etc. */
  segment: string;
  /** Slot index inside the segment (0-based). */
  slot: number;
  /** Optional human-readable label like "QF1" or "Group A R3". */
  label?: string;
}

export interface GeneratedMatch {
  roundNumber: number;
  bracketPosition: BracketPosition;
  teamA: readonly [Uuid, Uuid];
  teamB: readonly [Uuid, Uuid];
}

export interface MatchResult {
  teamASetsWon: number;
  teamBSetsWon: number;
  /** Raw set scores, e.g. [[6,3],[6,4]] or [[6,2],[3,6],[7,5]]. */
  rawScore: ReadonlyArray<readonly [number, number]>;
}

export interface PersistedMatch extends GeneratedMatch {
  id: string;
  result?: MatchResult;
}

export interface EngineState {
  matches: ReadonlyArray<PersistedMatch>;
  participants: ReadonlyArray<Participant>;
}

export interface Standing {
  participantId: Uuid;
  rank: number;
  points: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  /** Games-for minus games-against. Tiebreaker after points + wins. */
  gameDiff: number;
}

export interface TournamentEngine<TOptions = unknown> {
  readonly format: TournamentFormat;
  generateInitialMatches(
    participants: ReadonlyArray<Participant>,
    options?: TOptions,
  ): GeneratedMatch[];
  /**
   * Advance engine after a completed match. Returns the new state plus any
   * newly emitted matches that should be persisted. For bracket formats this
   * is the next round once the current round completes; for round-robin it
   * is empty (all matches generated up front).
   */
  advanceFromMatchResult(
    state: EngineState,
    completedMatchId: string,
    result: MatchResult,
  ): { state: EngineState; emitted: GeneratedMatch[] };
  isComplete(state: EngineState): boolean;
  getStandings(state: EngineState): Standing[];
  getNextMatches(state: EngineState, count: number): PersistedMatch[];
}
