/**
 * Engine helpers shared across formats.
 */

import type { EngineState, PersistedMatch, Standing, Uuid } from './types';

/**
 * Stable Fisher-Yates with a seeded LCG. Lets tests pin a deterministic order
 * while production callers can rely on `Date.now()` or any uint seed.
 */
export function shuffle<T>(arr: ReadonlyArray<T>, seed = 1): T[] {
  const out = arr.slice();
  let s = (seed | 0) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [out[i]!, out[j]!] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Standard bracket seeding (1 vs N, 2 vs N-1, ...). Pads to next power of two
 * by handing top seeds a bye represented as `null`.
 */
export function seedPairings<T>(seeds: ReadonlyArray<T>): Array<[T | null, T | null]> {
  const n = seeds.length;
  const size = nextPowerOfTwo(n);
  const padded: Array<T | null> = seeds.slice();
  while (padded.length < size) padded.push(null);
  const pairs: Array<[T | null, T | null]> = [];
  for (let i = 0; i < size / 2; i += 1) {
    pairs.push([padded[i] ?? null, padded[size - 1 - i] ?? null]);
  }
  return pairs;
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Initial standings row, used by formats before any match completes.
 */
export function blankStandings(participantIds: ReadonlyArray<Uuid>): Standing[] {
  return participantIds.map((id, idx) => ({
    participantId: id,
    rank: idx + 1,
    points: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    gameDiff: 0,
  }));
}

/**
 * Compute standings from completed matches. Used by round-robin, Americano,
 * king-of-court. Points = 3 per win, 1 per loss-with-set-won, 0 otherwise.
 * Tiebreakers: wins desc, gameDiff desc, then participantId for stability.
 */
export function standingsFromMatches(
  participantIds: ReadonlyArray<Uuid>,
  matches: ReadonlyArray<PersistedMatch>,
  pointsForWin = 3,
  pointsForLoss = 0,
): Standing[] {
  const table = new Map<Uuid, Standing>();
  for (const id of participantIds) {
    table.set(id, {
      participantId: id,
      rank: 0,
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      gameDiff: 0,
    });
  }
  for (const m of matches) {
    if (!m.result) continue;
    const aWon = m.result.teamASetsWon > m.result.teamBSetsWon;
    const gamesA = m.result.rawScore.reduce((s, [a]) => s + a, 0);
    const gamesB = m.result.rawScore.reduce((s, [, b]) => s + b, 0);
    for (const id of m.teamA) {
      const row = table.get(id);
      if (!row) continue;
      row.matchesPlayed += 1;
      row.gameDiff += gamesA - gamesB;
      if (aWon) {
        row.wins += 1;
        row.points += pointsForWin;
      } else {
        row.losses += 1;
        row.points += pointsForLoss;
      }
    }
    for (const id of m.teamB) {
      const row = table.get(id);
      if (!row) continue;
      row.matchesPlayed += 1;
      row.gameDiff += gamesB - gamesA;
      if (!aWon) {
        row.wins += 1;
        row.points += pointsForWin;
      } else {
        row.losses += 1;
        row.points += pointsForLoss;
      }
    }
  }
  const rows = [...table.values()].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (y.gameDiff !== x.gameDiff) return y.gameDiff - x.gameDiff;
    return x.participantId.localeCompare(y.participantId);
  });
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

export function allRoundComplete(
  state: EngineState,
  roundNumber: number,
): boolean {
  const inRound = state.matches.filter((m) => m.roundNumber === roundNumber);
  if (inRound.length === 0) return false;
  return inRound.every((m) => m.result !== undefined);
}
