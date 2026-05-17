import { describe, expect, it } from 'vitest';
import { mexicanoEngine } from '../../src/tournaments/mexicano.js';
import { kingOfCourtEngine } from '../../src/tournaments/king-of-court.js';
import { ladderEngine } from '../../src/tournaments/ladder.js';
import { getEngine } from '../../src/tournaments/index.js';
import type { Participant } from '../../src/tournaments/types.js';

function players(n: number, ratingStart = 5): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    partnerUserId: `00000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`,
    ratingDisplay: ratingStart - i * 0.2,
  }));
}

describe('Mexicano scaffold', () => {
  it('generates round 1 with level-balanced pairings (top + bottom vs mid + mid)', () => {
    const ps = players(4);
    const ms = mexicanoEngine.generateInitialMatches(ps);
    expect(ms).toHaveLength(1);
    // Top rated (idx 0) partnered with lowest (idx 3).
    expect(ms[0]!.teamA).toContain(ps[0]!.userId);
    expect(ms[0]!.teamA).toContain(ps[3]!.userId);
  });

  it('handles 8 players with 2 courts', () => {
    const ms = mexicanoEngine.generateInitialMatches(players(8));
    expect(ms).toHaveLength(2);
  });

  it('returns empty for fewer than 4 players', () => {
    expect(mexicanoEngine.generateInitialMatches(players(3))).toHaveLength(0);
  });

  it('computes points-by-games standings', () => {
    const ps = players(4);
    const ms = mexicanoEngine.generateInitialMatches(ps).map((m, i) => ({
      ...m,
      id: `m-${i}`,
      result: { teamASetsWon: 1, teamBSetsWon: 0, rawScore: [[6, 4]] as ReadonlyArray<readonly [number, number]> },
    }));
    const standings = mexicanoEngine.getStandings({ matches: ms, participants: ps });
    expect(standings).toHaveLength(4);
    expect(standings[0]!.points).toBe(6);
  });
});

describe('King-of-court scaffold', () => {
  it('generates a single opening match between top two teams', () => {
    const ms = kingOfCourtEngine.generateInitialMatches(players(6));
    expect(ms).toHaveLength(1);
  });

  it('returns empty for fewer than 4 participants', () => {
    expect(kingOfCourtEngine.generateInitialMatches(players(3))).toHaveLength(0);
  });

  it('is never complete until admin closes', () => {
    const ps = players(6);
    const ms = kingOfCourtEngine.generateInitialMatches(ps).map((m, i) => ({ ...m, id: `m-${i}` }));
    expect(kingOfCourtEngine.isComplete({ matches: ms, participants: ps })).toBe(false);
  });
});

describe('Ladder scaffold', () => {
  it('generates no matches up front (challenges are ad-hoc)', () => {
    expect(ladderEngine.generateInitialMatches(players(8))).toHaveLength(0);
  });

  it('orders ladder by display rating descending', () => {
    const ps = players(4);
    const standings = ladderEngine.getStandings({ matches: [], participants: ps });
    expect(standings[0]!.participantId).toBe(ps[0]!.userId);
    expect(standings[3]!.participantId).toBe(ps[3]!.userId);
  });

  it('is never complete (time-bounded)', () => {
    expect(ladderEngine.isComplete({ matches: [], participants: players(4) })).toBe(false);
  });
});

describe('getEngine factory', () => {
  it('returns the right engine for each format', () => {
    expect(getEngine('americano').format).toBe('americano');
    expect(getEngine('mexicano').format).toBe('mexicano');
    expect(getEngine('round_robin').format).toBe('round_robin');
    expect(getEngine('single_elimination').format).toBe('single_elimination');
    expect(getEngine('knockout').format).toBe('single_elimination');
    expect(getEngine('king_of_the_court').format).toBe('king_of_the_court');
    expect(getEngine('king_of_court').format).toBe('king_of_the_court');
    expect(getEngine('ladder').format).toBe('ladder');
    expect(getEngine('pplp').format).toBe('round_robin');
  });
});
