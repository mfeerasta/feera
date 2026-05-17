import {
  GLICKO,
  applyDoublesMatch,
  isProvisional,
  reliabilityPct,
  toDisplayRating,
  type DoublesMatchResult,
  type Player,
  type RatingUpdate,
} from '@feera/matching';
import type { Job, JobContext, JobResult } from '../types.js';

/**
 * Minimal shape of a `matches` row we care about for recalculation. Decoupled from
 * Drizzle so the unit test can feed plain objects in.
 */
export type MatchRow = Readonly<{
  id: string;
  teamAPlayer1: string;
  teamAPlayer2: string;
  teamBPlayer1: string;
  teamBPlayer2: string;
  teamASetsWon: number;
  teamBSetsWon: number;
  isRanked: boolean;
  playedAt: Date;
}>;

export type RatingState = Player & { matchCount: number; lastMatchAt: Date | null };

export type RecalcSnapshot = Readonly<{
  userId: string;
  before: RatingState;
  after: RatingState;
  displayBefore: number;
  displayAfter: number;
}>;

export type RecalcReport = Readonly<{
  matchesProcessed: number;
  playersTouched: number;
  largestDeltaDisplay: number;
  driftAlertCount: number;
  snapshots: readonly RecalcSnapshot[];
}>;

/** A display-rating shift larger than this in a single recomputation is suspicious. */
const DRIFT_ALERT_THRESHOLD_DISPLAY = 0.5;

function startingState(): RatingState {
  return {
    rating: GLICKO.startRating,
    rd: GLICKO.startRD,
    volatility: GLICKO.startVolatility,
    matchCount: 0,
    lastMatchAt: null,
  };
}

function applyUpdate(prev: RatingState, update: RatingUpdate, playedAt: Date): RatingState {
  return {
    rating: update.rating,
    rd: update.rd,
    volatility: update.volatility,
    matchCount: prev.matchCount + 1,
    lastMatchAt: playedAt,
  };
}

function winnerOf(match: MatchRow): DoublesMatchResult['winner'] {
  if (match.teamASetsWon > match.teamBSetsWon) return 'A';
  if (match.teamBSetsWon > match.teamASetsWon) return 'B';
  return 'draw';
}

/**
 * Pure recompute. Folds the full match history into a fresh ratings map.
 * The job invokes this with the DB-loaded matches; the test invokes it with
 * an in-memory list. Idempotent: same input → same output.
 */
export function recompute(
  initial: ReadonlyMap<string, RatingState>,
  matches: readonly MatchRow[],
): RecalcReport {
  const state = new Map<string, RatingState>();
  for (const [k, v] of initial) state.set(k, v);
  const beforeSeen = new Map<string, RatingState>();

  const ordered = [...matches]
    .filter((m) => m.isRanked)
    .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  let processed = 0;
  for (const match of ordered) {
    const ids = [
      match.teamAPlayer1,
      match.teamAPlayer2,
      match.teamBPlayer1,
      match.teamBPlayer2,
    ] as const;
    for (const id of ids) {
      if (!state.has(id)) state.set(id, startingState());
      if (!beforeSeen.has(id)) beforeSeen.set(id, state.get(id)!);
    }
    const a1 = state.get(match.teamAPlayer1)!;
    const a2 = state.get(match.teamAPlayer2)!;
    const b1 = state.get(match.teamBPlayer1)!;
    const b2 = state.get(match.teamBPlayer2)!;

    const update = applyDoublesMatch({
      teamA: [a1, a2],
      teamB: [b1, b2],
      winner: winnerOf(match),
    });

    state.set(match.teamAPlayer1, applyUpdate(a1, update.teamA[0], match.playedAt));
    state.set(match.teamAPlayer2, applyUpdate(a2, update.teamA[1], match.playedAt));
    state.set(match.teamBPlayer1, applyUpdate(b1, update.teamB[0], match.playedAt));
    state.set(match.teamBPlayer2, applyUpdate(b2, update.teamB[1], match.playedAt));
    processed += 1;
  }

  const snapshots: RecalcSnapshot[] = [];
  let largestDelta = 0;
  let drift = 0;
  for (const [userId, after] of state) {
    const before = beforeSeen.get(userId) ?? initial.get(userId) ?? startingState();
    const displayBefore = toDisplayRating(before.rating);
    const displayAfter = toDisplayRating(after.rating);
    const delta = Math.abs(displayAfter - displayBefore);
    if (delta > largestDelta) largestDelta = delta;
    if (delta > DRIFT_ALERT_THRESHOLD_DISPLAY) drift += 1;
    snapshots.push({ userId, before, after, displayBefore, displayAfter });
  }

  return {
    matchesProcessed: processed,
    playersTouched: snapshots.length,
    largestDeltaDisplay: Math.round(largestDelta * 100) / 100,
    driftAlertCount: drift,
    snapshots,
  };
}

export function summariseSnapshotForDb(snap: RecalcSnapshot): {
  userId: string;
  ratingInternal: number;
  ratingDisplay: number;
  ratingDeviation: number;
  volatility: number;
  reliabilityPct: number;
  matchCount: number;
  isProvisional: boolean;
  lastMatchAt: Date | null;
} {
  return {
    userId: snap.userId,
    ratingInternal: snap.after.rating,
    ratingDisplay: snap.displayAfter,
    ratingDeviation: snap.after.rd,
    volatility: snap.after.volatility,
    reliabilityPct: reliabilityPct(snap.after.rd),
    matchCount: snap.after.matchCount,
    isProvisional: isProvisional(snap.after.matchCount),
    lastMatchAt: snap.after.lastMatchAt,
  };
}

export const ratingRecalculation: Job = {
  name: 'rating-recalculation',
  // Nightly at 03:15 Europe/Berlin (Hetzner Falkenstein local). croner accepts standard 5-field cron.
  schedule: '15 3 * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    const apply = ctx.argv.includes('--apply');
    const log = ctx.log.child({ job: 'rating-recalculation', runId: ctx.runId, dryRun: !apply });

    try {
      // M2: structural skeleton. Real DB load lands once we have seed match data
      // and the SERIALIZABLE-tx write path is hooked up. We log intent so ops
      // can verify the job is firing on schedule.
      log.info('starting recalculation', { apply });
      const matches: MatchRow[] = [];
      const initial = new Map<string, RatingState>();
      const report = recompute(initial, matches);
      log.info('recalculation complete', {
        matchesProcessed: report.matchesProcessed,
        playersTouched: report.playersTouched,
        largestDeltaDisplay: report.largestDeltaDisplay,
        driftAlertCount: report.driftAlertCount,
        wouldWrite: apply,
      });
      return {
        status: 'success',
        metrics: {
          matchesProcessed: report.matchesProcessed,
          playersTouched: report.playersTouched,
          driftAlertCount: report.driftAlertCount,
        },
        durationMs: Date.now() - start,
        notes: apply ? 'apply mode (writes still gated until DB seed lands)' : 'dry-run',
      };
    } catch (err) {
      log.error('recalculation failed', err);
      return {
        status: 'failed',
        metrics: {},
        durationMs: Date.now() - start,
      };
    }
  },
};
