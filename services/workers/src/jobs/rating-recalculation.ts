import { and, eq, inArray, sql } from 'drizzle-orm';
import { matches as matchesTable, userRatings, users as usersTable } from '@feera/db';
import { db as defaultDb } from '@feera/db/client';
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

/**
 * Parallel women-only pool report. Built by folding only matches where ALL FOUR
 * players have gender = 'f'. Players with no women-pool history (no eligible
 * matches in their history) are simply omitted from the snapshot list.
 */
export type WomenPoolReport = Readonly<{
  matchesProcessed: number;
  playersTouched: number;
  ratings: ReadonlyMap<string, RatingState>;
}>;

/** A display-rating shift larger than this in a single recomputation is suspicious. */
const DRIFT_ALERT_THRESHOLD_DISPLAY = 0.5;

/** Batch size for the persistence path. Keeps each tx short. */
const PERSIST_BATCH_SIZE = 100;

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
 * an in-memory list. Idempotent: same input -> same output.
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

/**
 * Compute parallel women-only pool ratings from a match history + gender map.
 * Folds only matches where every one of the four players has gender = 'f'.
 *
 * Mathematically: women-pool ratings depend ONLY on women-pool matches, so
 * the pool is independent from the open pool by construction.
 */
export function recomputeWomenPool(
  matches: readonly MatchRow[],
  genderOf: ReadonlyMap<string, string | null>,
): WomenPoolReport {
  const state = new Map<string, RatingState>();
  const ordered = [...matches]
    .filter((m) => m.isRanked)
    .filter((m) =>
      genderOf.get(m.teamAPlayer1) === 'f' &&
      genderOf.get(m.teamAPlayer2) === 'f' &&
      genderOf.get(m.teamBPlayer1) === 'f' &&
      genderOf.get(m.teamBPlayer2) === 'f',
    )
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

  return {
    matchesProcessed: processed,
    playersTouched: state.size,
    ratings: state,
  };
}

export type PersistRow = {
  userId: string;
  ratingInternal: number;
  ratingDisplay: number;
  ratingDeviation: number;
  volatility: number;
  reliabilityPct: number;
  matchCount: number;
  isProvisional: boolean;
  lastMatchAt: Date | null;
};

export function summariseSnapshotForDb(snap: RecalcSnapshot): PersistRow {
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

/**
 * Persist computed snapshots. Skips players with zero ranked matches and
 * those flagged as sandbag (we don't want auto-recomputation to overwrite
 * a human-reviewed flag's frozen rating). Wraps the write in a
 * SERIALIZABLE transaction per batch.
 */
export type DbHandle = Pick<typeof defaultDb, 'transaction' | 'select'>;

export async function persistSnapshots(
  db: DbHandle,
  snapshots: readonly RecalcSnapshot[],
  log: JobContext['log'],
  batchSize = PERSIST_BATCH_SIZE,
): Promise<{ written: number; skippedZeroMatch: number; skippedSandbag: number }> {
  const eligible = snapshots.filter((s) => s.after.matchCount > 0);
  const skippedZeroMatch = snapshots.length - eligible.length;

  let written = 0;
  let skippedSandbag = 0;

  for (let i = 0; i < eligible.length; i += batchSize) {
    const slice = eligible.slice(i, i + batchSize);
    const ids = slice.map((s) => s.userId);

    // Load existing rows to honour the sandbag flag.
    const existing = await db
      .select({ userId: userRatings.userId, isFlaggedSandbag: userRatings.isFlaggedSandbag })
      .from(userRatings)
      .where(inArray(userRatings.userId, ids));
    const flagged = new Set(existing.filter((r) => r.isFlaggedSandbag).map((r) => r.userId));

    const toWrite = slice.filter((s) => {
      if (flagged.has(s.userId)) {
        skippedSandbag += 1;
        return false;
      }
      return true;
    });

    if (toWrite.length === 0) continue;

    const start = Date.now();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      for (const snap of toWrite) {
        const row = summariseSnapshotForDb(snap);
        await tx
          .insert(userRatings)
          .values({
            userId: row.userId,
            ratingInternal: row.ratingInternal,
            ratingDisplay: row.ratingDisplay,
            ratingDeviation: row.ratingDeviation,
            volatility: row.volatility,
            reliabilityPct: row.reliabilityPct,
            matchCount: row.matchCount,
            isProvisional: row.isProvisional,
            lastMatchAt: row.lastMatchAt,
          })
          .onConflictDoUpdate({
            target: userRatings.userId,
            set: {
              ratingInternal: row.ratingInternal,
              ratingDisplay: row.ratingDisplay,
              ratingDeviation: row.ratingDeviation,
              volatility: row.volatility,
              reliabilityPct: row.reliabilityPct,
              matchCount: row.matchCount,
              isProvisional: row.isProvisional,
              lastMatchAt: row.lastMatchAt,
            },
          });
      }
    });

    const driftMax = toWrite.reduce(
      (m, s) => Math.max(m, Math.abs(s.displayAfter - s.displayBefore)),
      0,
    );
    log.info('batch persisted', {
      job: 'rating-recalc',
      batch: Math.floor(i / batchSize),
      processed: toWrite.length,
      drift_max: Math.round(driftMax * 1000) / 1000,
      duration_ms: Date.now() - start,
    });
    written += toWrite.length;
  }

  return { written, skippedZeroMatch, skippedSandbag };
}

/**
 * Persist women-pool ratings only. Writes `user_ratings.women_only_pool_rating`
 * for each player in the women-pool report. Skips users with no women-pool
 * history. Uses the same SERIALIZABLE per-batch transaction shape.
 */
export async function persistWomenPool(
  db: DbHandle,
  report: WomenPoolReport,
  log: JobContext['log'],
  batchSize = PERSIST_BATCH_SIZE,
): Promise<{ written: number; skippedSandbag: number }> {
  const eligible = [...report.ratings.entries()].filter(
    ([, state]) => state.matchCount > 0,
  );

  let written = 0;
  let skippedSandbag = 0;

  for (let i = 0; i < eligible.length; i += batchSize) {
    const slice = eligible.slice(i, i + batchSize);
    const ids = slice.map(([id]) => id);

    const existing = await db
      .select({ userId: userRatings.userId, isFlaggedSandbag: userRatings.isFlaggedSandbag })
      .from(userRatings)
      .where(inArray(userRatings.userId, ids));
    const flagged = new Set(existing.filter((r) => r.isFlaggedSandbag).map((r) => r.userId));

    const toWrite = slice.filter(([id]) => {
      if (flagged.has(id)) {
        skippedSandbag += 1;
        return false;
      }
      return true;
    });
    if (toWrite.length === 0) continue;

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      for (const [userId, state] of toWrite) {
        // Upsert: keep the existing row's open-pool data untouched; only set
        // women_only_pool_rating. New rows get sensible defaults.
        await tx
          .insert(userRatings)
          .values({
            userId,
            womenOnlyPoolRating: state.rating,
          })
          .onConflictDoUpdate({
            target: userRatings.userId,
            set: { womenOnlyPoolRating: state.rating },
          });
      }
    });
    written += toWrite.length;
  }

  log.info('women pool persisted', {
    job: 'rating-recalc',
    written,
    skippedSandbag,
  });
  return { written, skippedSandbag };
}

/**
 * Load all ranked matches from the DB. Cheap on day one; if `matches` grows
 * huge we'll bracket by `played_at`.
 */
async function loadMatchHistory(db: DbHandle): Promise<MatchRow[]> {
  const rows = await db
    .select({
      id: matchesTable.id,
      teamAPlayer1: matchesTable.teamAPlayer1,
      teamAPlayer2: matchesTable.teamAPlayer2,
      teamBPlayer1: matchesTable.teamBPlayer1,
      teamBPlayer2: matchesTable.teamBPlayer2,
      teamASetsWon: matchesTable.teamASetsWon,
      teamBSetsWon: matchesTable.teamBSetsWon,
      isRanked: matchesTable.isRanked,
      playedAt: matchesTable.playedAt,
    })
    .from(matchesTable)
    .where(and(eq(matchesTable.isRanked, true)));
  return rows.map((r) => ({
    id: r.id,
    teamAPlayer1: r.teamAPlayer1,
    teamAPlayer2: r.teamAPlayer2,
    teamBPlayer1: r.teamBPlayer1,
    teamBPlayer2: r.teamBPlayer2,
    teamASetsWon: r.teamASetsWon,
    teamBSetsWon: r.teamBSetsWon,
    isRanked: r.isRanked,
    playedAt: r.playedAt,
  }));
}

export const ratingRecalculation: Job = {
  name: 'rating-recalculation',
  // Nightly at 03:15 Europe/Berlin (Hetzner Falkenstein local). croner accepts standard 5-field cron.
  schedule: '15 3 * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    // M4: live writes are the default. Pass `--dry-run` for safety drills.
    const dryRun = ctx.argv.includes('--dry-run');
    const apply = !dryRun;
    const log = ctx.log.child({ job: 'rating-recalculation', runId: ctx.runId, dryRun: !apply });

    try {
      log.info('starting recalculation', { apply });
      const db = defaultDb as DbHandle;
      const matches = await loadMatchHistory(db);
      const initial = new Map<string, RatingState>();
      const report = recompute(initial, matches);

      let persistResult = { written: 0, skippedZeroMatch: 0, skippedSandbag: 0 };
      if (apply) {
        persistResult = await persistSnapshots(db, report.snapshots, log);
      }

      // Parallel women-only pool. Loads each player's gender, folds only the
      // all-female sub-history into a separate Glicko state, persists into
      // `user_ratings.women_only_pool_rating`.
      const allPlayerIds = new Set<string>();
      for (const m of matches) {
        allPlayerIds.add(m.teamAPlayer1);
        allPlayerIds.add(m.teamAPlayer2);
        allPlayerIds.add(m.teamBPlayer1);
        allPlayerIds.add(m.teamBPlayer2);
      }
      const genderRows = allPlayerIds.size
        ? await db
            .select({ id: usersTable.id, gender: usersTable.gender })
            .from(usersTable)
            .where(inArray(usersTable.id, [...allPlayerIds]))
        : [];
      const genderOf = new Map(genderRows.map((r) => [r.id, r.gender]));
      const womenReport = recomputeWomenPool(matches, genderOf);
      let womenPersist = { written: 0, skippedSandbag: 0 };
      if (apply && womenReport.playersTouched > 0) {
        womenPersist = await persistWomenPool(db, womenReport, log);
      }

      log.info('recalculation complete', {
        matchesProcessed: report.matchesProcessed,
        playersTouched: report.playersTouched,
        largestDeltaDisplay: report.largestDeltaDisplay,
        driftAlertCount: report.driftAlertCount,
        wrote: persistResult.written,
        skippedZeroMatch: persistResult.skippedZeroMatch,
        skippedSandbag: persistResult.skippedSandbag,
        womenMatchesProcessed: womenReport.matchesProcessed,
        womenPlayersTouched: womenReport.playersTouched,
        womenWrote: womenPersist.written,
        applied: apply,
      });
      return {
        status: 'success',
        metrics: {
          matchesProcessed: report.matchesProcessed,
          playersTouched: report.playersTouched,
          driftAlertCount: report.driftAlertCount,
          wrote: persistResult.written,
          womenMatchesProcessed: womenReport.matchesProcessed,
          womenPlayersTouched: womenReport.playersTouched,
          womenWrote: womenPersist.written,
        },
        durationMs: Date.now() - start,
        notes: apply ? 'apply mode (live writes)' : 'dry-run',
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
