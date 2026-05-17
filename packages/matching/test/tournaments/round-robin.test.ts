import { describe, expect, it } from 'vitest';
import { roundRobinEngine } from '../../src/tournaments/round-robin.js';
import type { EngineState, Participant, PersistedMatch } from '../../src/tournaments/types.js';

function teams(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `00000000-0000-4000-8000-${String(i * 2 + 1).padStart(12, '0')}`,
    partnerUserId: `00000000-0000-4000-8000-${String(i * 2 + 2).padStart(12, '0')}`,
    ratingDisplay: 4,
  }));
}

function persist(matches: ReturnType<typeof roundRobinEngine.generateInitialMatches>): PersistedMatch[] {
  return matches.map((m, i) => ({ ...m, id: `m-${i}` }));
}

describe('Round-robin engine', () => {
  it('generates 6 matches for 4 teams (every team plays every other once)', () => {
    const ps = teams(4);
    const ms = roundRobinEngine.generateInitialMatches(ps);
    // n*(n-1)/2 = 6 matches.
    expect(ms).toHaveLength(6);
  });

  it('every pair of teams plays exactly once (8 teams = 28 matches)', () => {
    const ps = teams(8);
    const ms = roundRobinEngine.generateInitialMatches(ps);
    expect(ms).toHaveLength((8 * 7) / 2);
    const pairs = new Set<string>();
    for (const m of ms) {
      const a = m.teamA[0];
      const b = m.teamB[0];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      expect(pairs.has(key)).toBe(false);
      pairs.add(key);
    }
    expect(pairs.size).toBe((8 * 7) / 2);
  });

  it('handles 16 teams (120 matches)', () => {
    const ms = roundRobinEngine.generateInitialMatches(teams(16));
    expect(ms).toHaveLength((16 * 15) / 2);
  });

  it('handles odd team count with a bye round', () => {
    const ps = teams(5);
    const ms = roundRobinEngine.generateInitialMatches(ps);
    expect(ms).toHaveLength((5 * 4) / 2);
  });

  it('returns empty for fewer than 2 teams', () => {
    expect(roundRobinEngine.generateInitialMatches(teams(1))).toHaveLength(0);
  });

  it('computes standings with points 3 per win', () => {
    const ps = teams(3);
    const ms = persist(roundRobinEngine.generateInitialMatches(ps));
    // Team 0 beats team 1 (6-0, 6-0). Team 0 beats team 2. Team 1 beats team 2.
    ms.forEach((m) => {
      if (m.teamA[0] === ps[0]!.userId) {
        m.result = { teamASetsWon: 2, teamBSetsWon: 0, rawScore: [[6, 0], [6, 0]] };
      } else if (m.teamB[0] === ps[0]!.userId) {
        m.result = { teamASetsWon: 0, teamBSetsWon: 2, rawScore: [[0, 6], [0, 6]] };
      } else {
        // team 1 vs team 2 -> team 1 wins.
        const t1First = m.teamA[0] === ps[1]!.userId;
        m.result = t1First
          ? { teamASetsWon: 2, teamBSetsWon: 0, rawScore: [[6, 0], [6, 0]] }
          : { teamASetsWon: 0, teamBSetsWon: 2, rawScore: [[0, 6], [0, 6]] };
      }
    });
    const state: EngineState = { matches: ms, participants: ps };
    const standings = roundRobinEngine.getStandings(state);
    expect(standings[0]!.participantId).toBe(ps[0]!.userId);
    expect(standings[0]!.points).toBe(6); // 2 wins * 3
    expect(standings[1]!.participantId).toBe(ps[1]!.userId);
    expect(standings[1]!.points).toBe(3); // 1 win
    expect(standings[2]!.points).toBe(0);
  });

  it('marks complete when all matches have results', () => {
    const ps = teams(3);
    const ms = persist(roundRobinEngine.generateInitialMatches(ps)).map((m) => ({
      ...m,
      result: { teamASetsWon: 2, teamBSetsWon: 0, rawScore: [[6, 0], [6, 0]] as const } as never,
    }));
    expect(roundRobinEngine.isComplete({ matches: ms, participants: ps })).toBe(true);
  });
});
