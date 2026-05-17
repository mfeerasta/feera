import { describe, expect, it } from 'vitest';
import { GLICKO, toDisplayRating } from '@feera/matching';
import {
  recompute,
  type MatchRow,
  type RatingState,
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

    // Same-team players had identical inputs, so their post-state must match exactly.
    expect(alice.after.rating).toBeCloseTo(bob.after.rating, 9);
    expect(carl.after.rating).toBeCloseTo(dana.after.rating, 9);
    // Same-team symmetry around the starting rating (zero-sum across teams under
    // single-pass Glicko updates).
    const aDelta = alice.after.rating - GLICKO.startRating;
    const cDelta = carl.after.rating - GLICKO.startRating;
    expect(aDelta).toBeCloseTo(-cDelta, 6);
    // Ratings have moved meaningfully from the start.
    expect(Math.abs(aDelta)).toBeGreaterThan(0);
    // RD should shrink from the default after three matches.
    expect(alice.after.rd).toBeLessThan(GLICKO.startRD);
    expect(carl.after.rd).toBeLessThan(GLICKO.startRD);
    // Match counts accumulate.
    expect(alice.after.matchCount).toBe(3);
    expect(carl.after.matchCount).toBe(3);
    // Display ratings stay in band and align with the helper.
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
    // Rating moves but stays within a sane band around the pre-existing 1700.
    expect(alice.after.rating).not.toBe(1700);
    expect(Math.abs(alice.after.rating - 1700)).toBeLessThan(100);
  });
});
