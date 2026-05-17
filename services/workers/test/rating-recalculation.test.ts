import { describe, expect, it } from 'vitest';
import { GLICKO, toDisplayRating } from '@feera/matching';
import {
  persistSnapshots,
  recompute,
  summariseSnapshotForDb,
  type DbHandle,
  type MatchRow,
  type RatingState,
  type RecalcSnapshot,
} from '../src/jobs/rating-recalculation.js';

const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';
const CARL = '00000000-0000-0000-0000-00000000000c';
const DANA = '00000000-0000-0000-0000-00000000000d';

function startState(): RatingState {
  return {
    rating: GLICKO.startRating,
    rd: GLICKO.startRD,
    volatility: GLICKO.startVolatility,
    matchCount: 0,
    lastMatchAt: null,
  };
}

function match(
  partial: Partial<MatchRow> & Pick<MatchRow, 'id' | 'playedAt' | 'teamASetsWon' | 'teamBSetsWon'>,
): MatchRow {
  return {
    teamAPlayer1: ALICE,
    teamAPlayer2: BOB,
    teamBPlayer1: CARL,
    teamBPlayer2: DANA,
    isRanked: true,
    ...partial,
  };
}

const noopLog = {
  child() {
    return noopLog;
  },
  debug() {},
  info() {},
  warn() {},
  error() {},
} as unknown as Parameters<typeof persistSnapshots>[2];

/**
 * Minimal in-memory fake of the Drizzle handle wide enough for `persistSnapshots`.
 * Tracks every inserted row and which user ids were flagged sandbag.
 */
function makeFakeDb(opts: { flagged?: ReadonlySet<string> } = {}): {
  db: DbHandle;
  inserted: Array<{ userId: string; ratingDisplay: number; matchCount: number }>;
  txCount: { n: number };
} {
  const flagged = opts.flagged ?? new Set<string>();
  const inserted: Array<{ userId: string; ratingDisplay: number; matchCount: number }> = [];
  const txCount = { n: 0 };

  // The query path `db.select(...).from(userRatings).where(inArray(userRatings.userId, ids))`
  // -> returns rows of { userId, isFlaggedSandbag }. We just need to inspect `ids` from the
  // inArray clause. Simpler: capture nothing about the WHERE; return all flagged users in
  // the requested set by inspecting Drizzle's internal `inArray` value via JSON walk.
  const db = {
    select() {
      return {
        from() {
          return {
            where(_whereClause: unknown) {
              // Return every flagged user; persistSnapshots intersects with its
              // current batch by userId set so over-returning is safe.
              return Promise.resolve(
                [...flagged].map((id) => ({ userId: id, isFlaggedSandbag: true })),
              );
            },
          };
        },
      };
    },
    async transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      txCount.n += 1;
      const tx = {
        execute(_q: unknown) {
          return Promise.resolve();
        },
        insert() {
          return {
            values(v: { userId: string; ratingDisplay: number; matchCount: number }) {
              return {
                onConflictDoUpdate() {
                  inserted.push({
                    userId: v.userId,
                    ratingDisplay: v.ratingDisplay,
                    matchCount: v.matchCount,
                  });
                  return Promise.resolve();
                },
              };
            },
          };
        },
      };
      return fn(tx);
    },
  } as unknown as DbHandle;

  return { db, inserted, txCount };
}

describe('rating-recalculation/recompute', () => {
  it('produces expected per-player deltas from an in-memory match history', () => {
    const matches: MatchRow[] = [
      match({ id: 'm1', playedAt: new Date('2026-01-01T10:00:00Z'), teamASetsWon: 2, teamBSetsWon: 0 }),
      match({ id: 'm2', playedAt: new Date('2026-01-08T10:00:00Z'), teamASetsWon: 2, teamBSetsWon: 1 }),
      match({ id: 'm3', playedAt: new Date('2026-01-15T10:00:00Z'), teamASetsWon: 0, teamBSetsWon: 2 }),
    ];

    const report = recompute(new Map<string, RatingState>(), matches);

    expect(report.matchesProcessed).toBe(3);
    expect(report.playersTouched).toBe(4);

    const snapById = new Map(report.snapshots.map((s) => [s.userId, s]));
    const alice = snapById.get(ALICE)!;
    const bob = snapById.get(BOB)!;
    const carl = snapById.get(CARL)!;
    const dana = snapById.get(DANA)!;
    expect(alice).toBeDefined();
    expect(carl).toBeDefined();
    expect(alice.after.rating).toBeCloseTo(bob.after.rating, 9);
    expect(carl.after.rating).toBeCloseTo(dana.after.rating, 9);
    const aDelta = alice.after.rating - GLICKO.startRating;
    const cDelta = carl.after.rating - GLICKO.startRating;
    expect(aDelta).toBeCloseTo(-cDelta, 6);
    expect(Math.abs(aDelta)).toBeGreaterThan(0);
    expect(alice.after.rd).toBeLessThan(GLICKO.startRD);
    expect(carl.after.rd).toBeLessThan(GLICKO.startRD);
    expect(alice.after.matchCount).toBe(3);
    expect(carl.after.matchCount).toBe(3);
    expect(alice.displayAfter).toBeGreaterThanOrEqual(0);
    expect(alice.displayAfter).toBeLessThanOrEqual(7);
    expect(alice.displayAfter).toBeCloseTo(toDisplayRating(alice.after.rating), 5);
  });

  it('is idempotent: running twice on the same input yields identical state', () => {
    const matches: MatchRow[] = [
      match({ id: 'm1', playedAt: new Date('2026-02-01T10:00:00Z'), teamASetsWon: 2, teamBSetsWon: 1 }),
      match({ id: 'm2', playedAt: new Date('2026-02-08T10:00:00Z'), teamASetsWon: 1, teamBSetsWon: 2 }),
    ];
    const first = recompute(new Map(), matches);
    const second = recompute(new Map(), matches);
    expect(second.snapshots).toEqual(first.snapshots);
    expect(second.matchesProcessed).toBe(first.matchesProcessed);
  });

  it('skips unranked matches', () => {
    const matches: MatchRow[] = [
      match({ id: 'm1', playedAt: new Date('2026-03-01T10:00:00Z'), teamASetsWon: 2, teamBSetsWon: 0, isRanked: false }),
    ];
    const report = recompute(new Map(), matches);
    expect(report.matchesProcessed).toBe(0);
    expect(report.playersTouched).toBe(0);
  });

  it('respects pre-existing rating state passed in', () => {
    const initial = new Map<string, RatingState>();
    const elevated: RatingState = { ...startState(), rating: 1700, rd: 100 };
    initial.set(ALICE, elevated);
    const matches: MatchRow[] = [
      match({ id: 'm1', playedAt: new Date('2026-04-01T10:00:00Z'), teamASetsWon: 2, teamBSetsWon: 0 }),
    ];
    const report = recompute(initial, matches);
    const alice = report.snapshots.find((s) => s.userId === ALICE)!;
    expect(alice.before.rating).toBe(1700);
    expect(alice.after.rating).not.toBe(1700);
    expect(Math.abs(alice.after.rating - 1700)).toBeLessThan(100);
  });
});

describe('rating-recalculation/persistSnapshots', () => {
  function snapshotFor(userId: string, matchCount = 3): RecalcSnapshot {
    const after: RatingState = { ...startState(), rating: 1620, rd: 180, matchCount };
    return {
      userId,
      before: startState(),
      after,
      displayBefore: toDisplayRating(GLICKO.startRating),
      displayAfter: toDisplayRating(1620),
    };
  }

  it('summariseSnapshotForDb derives display rating, reliability, and provisional flag', () => {
    const row = summariseSnapshotForDb(snapshotFor(ALICE, 25));
    expect(row.userId).toBe(ALICE);
    expect(row.ratingDisplay).toBeCloseTo(toDisplayRating(1620), 5);
    expect(row.matchCount).toBe(25);
    expect(row.isProvisional).toBe(false);
    expect(row.reliabilityPct).toBeGreaterThan(0);
  });

  it('writes one row per eligible player and skips zero-match players', async () => {
    const { db, inserted, txCount } = makeFakeDb();
    const snapshots: RecalcSnapshot[] = [
      snapshotFor(ALICE, 5),
      snapshotFor(BOB, 5),
      // Zero-match player should be skipped before any DB call.
      {
        userId: CARL,
        before: startState(),
        after: { ...startState(), matchCount: 0 },
        displayBefore: 3.5,
        displayAfter: 3.5,
      },
    ];
    const res = await persistSnapshots(db, snapshots, noopLog, 100);
    expect(res.written).toBe(2);
    expect(res.skippedZeroMatch).toBe(1);
    expect(res.skippedSandbag).toBe(0);
    expect(inserted.map((r) => r.userId).sort()).toEqual([ALICE, BOB].sort());
    expect(txCount.n).toBe(1);
  });

  it('honours the is_flagged_sandbag flag and skips those users', async () => {
    const { db, inserted } = makeFakeDb({ flagged: new Set([BOB]) });
    const snapshots = [snapshotFor(ALICE, 4), snapshotFor(BOB, 4)];
    const res = await persistSnapshots(db, snapshots, noopLog, 100);
    expect(res.written).toBe(1);
    expect(res.skippedSandbag).toBe(1);
    expect(inserted.map((r) => r.userId)).toEqual([ALICE]);
  });

  it('processes multiple batches when snapshots exceed the batch size', async () => {
    const { db, inserted, txCount } = makeFakeDb();
    const ids = Array.from({ length: 5 }, (_, i) =>
      `00000000-0000-0000-0000-0000000000${i.toString().padStart(2, '0')}`,
    );
    const snapshots = ids.map((id) => snapshotFor(id, 3));
    const res = await persistSnapshots(db, snapshots, noopLog, 2);
    expect(res.written).toBe(5);
    expect(inserted).toHaveLength(5);
    expect(txCount.n).toBe(3); // 5 / 2 = 3 batches
  });
});
