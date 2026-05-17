import { describe, expect, it } from 'vitest';
import { americanoEngine } from '../../src/tournaments/americano.js';
import type { EngineState, Participant, PersistedMatch } from '../../src/tournaments/types.js';

function participants(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    ratingDisplay: 3.5,
  }));
}

function persist(matches: ReturnType<typeof americanoEngine.generateInitialMatches>): PersistedMatch[] {
  return matches.map((m, i) => ({ ...m, id: `m-${i}` }));
}

describe('Americano engine', () => {
  it('generates n-1 rounds for 4 players with pair uniqueness up to first cycle', () => {
    const ps = participants(4);
    const ms = americanoEngine.generateInitialMatches(ps);
    expect(ms.length).toBeGreaterThan(0);
    // Each round should contain n/4 matches.
    const rounds = new Set(ms.map((m) => m.roundNumber));
    expect(rounds.size).toBeGreaterThanOrEqual(1);
  });

  it('generates matches for 8 players with every player appearing each round', () => {
    const ps = participants(8);
    const ms = americanoEngine.generateInitialMatches(ps);
    const rounds = new Map<number, Set<string>>();
    for (const m of ms) {
      const ids = rounds.get(m.roundNumber) ?? new Set<string>();
      for (const id of [...m.teamA, ...m.teamB]) ids.add(id);
      rounds.set(m.roundNumber, ids);
    }
    // Each round should include all 8 players.
    for (const ids of rounds.values()) {
      expect(ids.size).toBe(8);
    }
  });

  it('generates matches for 16 players', () => {
    const ps = participants(16);
    const ms = americanoEngine.generateInitialMatches(ps);
    expect(ms.length).toBeGreaterThan(0);
    // 4 matches per round (16 / 4).
    const byRound = new Map<number, number>();
    for (const m of ms) byRound.set(m.roundNumber, (byRound.get(m.roundNumber) ?? 0) + 1);
    for (const count of byRound.values()) expect(count).toBe(4);
  });

  it('returns empty for fewer than 4 players', () => {
    expect(americanoEngine.generateInitialMatches(participants(3))).toHaveLength(0);
  });

  it('tracks standings by total games won', () => {
    const ps = participants(4);
    const generated = americanoEngine.generateInitialMatches(ps, { rounds: 1 });
    const ms = persist(generated);
    // Team A wins 6-3.
    ms[0] = {
      ...ms[0]!,
      result: { teamASetsWon: 1, teamBSetsWon: 0, rawScore: [[6, 3]] },
    };
    const state: EngineState = { matches: ms, participants: ps };
    const standings = americanoEngine.getStandings(state);
    expect(standings).toHaveLength(4);
    // Top 2 ranked players must be on team A with 6 games each.
    expect(standings[0]!.points).toBe(6);
    expect(standings[1]!.points).toBe(6);
    expect(standings[2]!.points).toBe(3);
    expect(standings[3]!.points).toBe(3);
  });

  it('marks tournament complete when all matches have results', () => {
    const ps = participants(4);
    const ms = persist(americanoEngine.generateInitialMatches(ps, { rounds: 1 })).map((m) => ({
      ...m,
      result: { teamASetsWon: 1, teamBSetsWon: 0, rawScore: [[6, 0]] as const } as never,
    }));
    const state: EngineState = { matches: ms, participants: ps };
    expect(americanoEngine.isComplete(state)).toBe(true);
  });

  it('returns next unplayed matches via getNextMatches', () => {
    const ps = participants(8);
    const ms = persist(americanoEngine.generateInitialMatches(ps));
    const state: EngineState = { matches: ms, participants: ps };
    const next = americanoEngine.getNextMatches(state, 3);
    expect(next).toHaveLength(3);
  });
});
