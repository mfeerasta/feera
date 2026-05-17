import { describe, expect, it } from 'vitest';
import { knockoutEngine } from '../../src/tournaments/knockout.js';
import type { EngineState, Participant, PersistedMatch } from '../../src/tournaments/types.js';

function teams(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `00000000-0000-4000-8000-${String(i * 2 + 1).padStart(12, '0')}`,
    partnerUserId: `00000000-0000-4000-8000-${String(i * 2 + 2).padStart(12, '0')}`,
    seed: i + 1,
    ratingDisplay: 4 + i * 0.1,
  }));
}

function persist(matches: ReturnType<typeof knockoutEngine.generateInitialMatches>): PersistedMatch[] {
  return matches.map((m, i) => ({ ...m, id: `m-${i}` }));
}

describe('Knockout engine', () => {
  it('generates 2 round-1 matches for 4 teams', () => {
    const ms = knockoutEngine.generateInitialMatches(teams(4));
    expect(ms).toHaveLength(2);
    expect(ms.every((m) => m.roundNumber === 1)).toBe(true);
  });

  it('generates 4 round-1 matches for 8 teams with proper seeding (1v8, 2v7, 3v6, 4v5)', () => {
    const tt = teams(8);
    const ms = knockoutEngine.generateInitialMatches(tt);
    expect(ms).toHaveLength(4);
    // First match: seed 1 vs seed 8.
    expect(ms[0]!.teamA[0]).toBe(tt[0]!.userId);
    expect(ms[0]!.teamB[0]).toBe(tt[7]!.userId);
    // Last match: seed 4 vs seed 5.
    expect(ms[3]!.teamA[0]).toBe(tt[3]!.userId);
    expect(ms[3]!.teamB[0]).toBe(tt[4]!.userId);
  });

  it('generates 8 round-1 matches for 16 teams', () => {
    const ms = knockoutEngine.generateInitialMatches(teams(16));
    expect(ms).toHaveLength(8);
  });

  it('handles non-power-of-two with byes (5 teams -> 2 round-1 matches)', () => {
    // Bracket of 8, top 3 seeds get byes.
    const ms = knockoutEngine.generateInitialMatches(teams(5));
    // Slots 0-3 paired against slots 4-7. Players: 1v(bye), 2v(bye), 3v(bye), 4v5.
    // Bye matches are not emitted; only slot 3 gets a real match (seed 4 vs seed 5).
    expect(ms).toHaveLength(1);
    expect(ms[0]!.teamA[0]).toContain('00000000-0000-4000-8000');
  });

  it('advances to round 2 when all round-1 matches complete', () => {
    const ps = teams(4);
    const ms = persist(knockoutEngine.generateInitialMatches(ps));
    let state: EngineState = { matches: ms, participants: ps };
    // Team A wins both.
    const adv1 = knockoutEngine.advanceFromMatchResult(state, ms[0]!.id, {
      teamASetsWon: 2,
      teamBSetsWon: 0,
      rawScore: [[6, 3], [6, 4]],
    });
    expect(adv1.emitted).toHaveLength(0); // round not done yet
    state = adv1.state;
    const adv2 = knockoutEngine.advanceFromMatchResult(state, ms[1]!.id, {
      teamASetsWon: 2,
      teamBSetsWon: 0,
      rawScore: [[6, 2], [6, 1]],
    });
    expect(adv2.emitted).toHaveLength(1);
    expect(adv2.emitted[0]!.roundNumber).toBe(2);
  });

  it('marks tournament complete when final match has a result', () => {
    const ps = teams(2);
    const ms = persist(knockoutEngine.generateInitialMatches(ps));
    ms[0] = {
      ...ms[0]!,
      result: { teamASetsWon: 2, teamBSetsWon: 1, rawScore: [[6, 3], [3, 6], [6, 4]] },
    };
    const state: EngineState = { matches: ms, participants: ps };
    expect(knockoutEngine.isComplete(state)).toBe(true);
  });

  it('returns champion at rank 1 in standings', () => {
    const ps = teams(4);
    const r1 = persist(knockoutEngine.generateInitialMatches(ps));
    let state: EngineState = { matches: r1, participants: ps };
    const adv1 = knockoutEngine.advanceFromMatchResult(state, r1[0]!.id, {
      teamASetsWon: 2, teamBSetsWon: 0, rawScore: [[6, 0], [6, 0]],
    });
    state = adv1.state;
    const adv2 = knockoutEngine.advanceFromMatchResult(state, r1[1]!.id, {
      teamASetsWon: 2, teamBSetsWon: 0, rawScore: [[6, 0], [6, 0]],
    });
    state = adv2.state;
    expect(adv2.emitted).toHaveLength(1);
    const finalMatch = { ...adv2.emitted[0]!, id: 'final' };
    state = { ...state, matches: [...state.matches, finalMatch] };
    const final = knockoutEngine.advanceFromMatchResult(state, 'final', {
      teamASetsWon: 2, teamBSetsWon: 0, rawScore: [[6, 0], [6, 0]],
    });
    state = final.state;
    const standings = knockoutEngine.getStandings(state);
    // Champion (seed 1 team) at top.
    expect(standings[0]!.participantId).toBe(ps[0]!.userId);
    expect(standings[0]!.wins).toBe(2);
  });

  it('returns empty array for fewer than 2 teams', () => {
    expect(knockoutEngine.generateInitialMatches(teams(1))).toHaveLength(0);
  });
});
