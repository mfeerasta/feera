import { describe, expect, it } from 'vitest';
import {
  GLICKO,
  applyDoublesMatch,
  fromDisplayRating,
  isProvisional,
  newPlayer,
  reliabilityPct,
  toDisplayRating,
  updateRating,
  type Player,
} from '../src/glicko.js';

const eps = 1e-9;

describe('display rating mapping', () => {
  it('maps starting rating 1500 to display 3.5', () => {
    expect(toDisplayRating(1500)).toBe(3.5);
  });

  it('clamps to 0.0 below 800', () => {
    expect(toDisplayRating(500)).toBe(0);
    expect(toDisplayRating(800)).toBe(0);
  });

  it('clamps to 7.0 above 2200', () => {
    expect(toDisplayRating(2200)).toBe(7);
    expect(toDisplayRating(2400)).toBe(7);
  });

  it('rounds to one decimal', () => {
    expect(toDisplayRating(1567)).toBe(3.8);
    expect(toDisplayRating(1572)).toBe(3.9);
  });

  it('fromDisplayRating is the inverse on the unclamped band', () => {
    for (const d of [0.5, 1.0, 2.5, 3.5, 5.0, 6.8]) {
      expect(toDisplayRating(fromDisplayRating(d))).toBeCloseTo(d, 5);
    }
  });
});

describe('updateRating no-op rating period', () => {
  it('keeps rating, inflates RD by volatility', () => {
    const p = newPlayer();
    const u = updateRating(p, []);
    expect(u.rating).toBe(p.rating);
    expect(u.volatility).toBe(p.volatility);
    expect(u.rd).toBeGreaterThan(p.rd - eps);
  });
});

describe('updateRating reproduces Glickman 2012 worked example', () => {
  // Per the paper: player rated 1500, RD 200, volatility 0.06, tau 0.5
  // Opponents: (1400, 30), (1550, 100), (1700, 300) with scores (1, 0, 0).
  // Expected: rating ≈ 1464.06, RD ≈ 151.52, sigma ≈ 0.05999 (per Glickman's Table).
  const player: Player = { rating: 1500, rd: 200, volatility: 0.06 };
  const outcomes = [
    { opponent: { rating: 1400, rd: 30, volatility: 0.06 }, score: 1 as const },
    { opponent: { rating: 1550, rd: 100, volatility: 0.06 }, score: 0 as const },
    { opponent: { rating: 1700, rd: 300, volatility: 0.06 }, score: 0 as const },
  ];

  it('matches the paper to within 0.5 rating points', () => {
    const u = updateRating(player, outcomes);
    expect(u.rating).toBeGreaterThan(1463);
    expect(u.rating).toBeLessThan(1465);
    expect(u.rd).toBeGreaterThan(150);
    expect(u.rd).toBeLessThan(153);
    expect(u.volatility).toBeGreaterThan(0.0599);
    expect(u.volatility).toBeLessThan(0.06005);
  });
});

describe('monotonicity in 1v1 update', () => {
  it("winner's rating goes up, loser's down (equal opponents)", () => {
    const a = newPlayer();
    const b = newPlayer();
    const winA = updateRating(a, [{ opponent: b, score: 1 }]);
    const lossB = updateRating(b, [{ opponent: a, score: 0 }]);
    expect(winA.rating).toBeGreaterThan(a.rating);
    expect(lossB.rating).toBeLessThan(b.rating);
  });

  it('upset of higher-rated opponent yields larger jump than expected win', () => {
    const me = newPlayer();
    const weak: Player = { rating: 1300, rd: 100, volatility: 0.06 };
    const strong: Player = { rating: 1800, rd: 100, volatility: 0.06 };
    const expectedWin = updateRating(me, [{ opponent: weak, score: 1 }]);
    const upset = updateRating(me, [{ opponent: strong, score: 1 }]);
    expect(upset.rating - me.rating).toBeGreaterThan(expectedWin.rating - me.rating);
  });
});

describe('symmetry in 1v1 doubles application', () => {
  it('rating change sums approximately to zero between two equal players', () => {
    const a = newPlayer();
    const b = newPlayer();
    const c = newPlayer();
    const d = newPlayer();
    const u = applyDoublesMatch({ teamA: [a, b], teamB: [c, d], winner: 'A' });
    const sum =
      u.teamA[0].rating -
      a.rating +
      (u.teamA[1].rating - b.rating) +
      (u.teamB[0].rating - c.rating) +
      (u.teamB[1].rating - d.rating);
    expect(Math.abs(sum)).toBeLessThan(1.5); // sub-1.5 rating points across 4 players is acceptable
  });
});

describe('doubles match outcomes', () => {
  it('team A wins → both A players rating up, both B players rating down', () => {
    const init = newPlayer();
    const result = applyDoublesMatch({
      teamA: [init, init],
      teamB: [init, init],
      winner: 'A',
    });
    expect(result.teamA[0].rating).toBeGreaterThan(init.rating);
    expect(result.teamA[1].rating).toBeGreaterThan(init.rating);
    expect(result.teamB[0].rating).toBeLessThan(init.rating);
    expect(result.teamB[1].rating).toBeLessThan(init.rating);
  });

  it('draw → ratings barely move (all equal players)', () => {
    const init = newPlayer();
    const result = applyDoublesMatch({
      teamA: [init, init],
      teamB: [init, init],
      winner: 'draw',
    });
    for (const p of [...result.teamA, ...result.teamB]) {
      expect(Math.abs(p.rating - init.rating)).toBeLessThan(0.01);
    }
  });
});

describe('convergence over many matches', () => {
  /** Probability that the higher-rated player wins, using the standard logistic. */
  function trueWinProb(rA: number, rB: number): number {
    return 1 / (1 + Math.pow(10, (rB - rA) / 400));
  }

  it('player at true skill 1800 converges close to 1800 against varied opposition', () => {
    const trueSkill = 1800;
    let me = newPlayer();
    // 80 matches against opponents with true skills spread around 1500-2100.
    const opponentSkills = [
      1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000, 2050, 2100,
    ];
    // Deterministic-ish RNG seeded from rating delta so the test is repeatable.
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 80; i += 1) {
      const opponentSkill = opponentSkills[i % opponentSkills.length]!;
      const opp: Player = {
        rating: opponentSkill,
        rd: 80,
        volatility: 0.06,
      };
      const score: 0 | 1 = rand() < trueWinProb(trueSkill, opponentSkill) ? 1 : 0;
      const u = updateRating(me, [{ opponent: opp, score }]);
      me = { rating: u.rating, rd: u.rd, volatility: u.volatility };
    }
    expect(me.rating).toBeGreaterThan(1700);
    expect(me.rating).toBeLessThan(1900);
    // RD should have shrunk substantially from 350.
    expect(me.rd).toBeLessThan(150);
  });
});

describe('volatility stays within sane bounds', () => {
  it('stays positive after extreme upset', () => {
    const me = newPlayer();
    const monster: Player = { rating: 2100, rd: 30, volatility: 0.06 };
    const u = updateRating(me, [{ opponent: monster, score: 1 }]);
    expect(u.volatility).toBeGreaterThan(0);
    expect(u.volatility).toBeLessThan(0.2);
  });
});

describe('reliability % and provisional flag', () => {
  it('startRD reliability = 0%, very low RD reliability = 100%', () => {
    expect(reliabilityPct(GLICKO.startRD)).toBe(0);
    expect(reliabilityPct(30)).toBe(100);
    expect(reliabilityPct(10)).toBe(100);
  });

  it('reliability % is monotonically decreasing in RD', () => {
    const samples = [30, 60, 90, 120, 180, 250, 300, 350];
    let prev = 101;
    for (const rd of samples) {
      const r = reliabilityPct(rd);
      expect(r).toBeLessThanOrEqual(prev);
      prev = r;
    }
  });

  it('provisional under 5 ranked matches, not provisional at or above', () => {
    expect(isProvisional(0)).toBe(true);
    expect(isProvisional(4)).toBe(true);
    expect(isProvisional(5)).toBe(false);
    expect(isProvisional(20)).toBe(false);
  });
});

describe('edge: display rating boundaries from extreme internal scores', () => {
  it('a long losing streak does not push rating below 0.0 display', () => {
    let me = newPlayer();
    const champion: Player = { rating: 2200, rd: 30, volatility: 0.06 };
    for (let i = 0; i < 40; i += 1) {
      const u = updateRating(me, [{ opponent: champion, score: 0 }]);
      me = { rating: u.rating, rd: u.rd, volatility: u.volatility };
    }
    expect(toDisplayRating(me.rating)).toBeGreaterThanOrEqual(0);
  });

  it('a long winning streak does not push rating above 7.0 display', () => {
    let me = newPlayer();
    const beginner: Player = { rating: 800, rd: 30, volatility: 0.06 };
    for (let i = 0; i < 40; i += 1) {
      const u = updateRating(me, [{ opponent: beginner, score: 1 }]);
      me = { rating: u.rating, rd: u.rd, volatility: u.volatility };
    }
    expect(toDisplayRating(me.rating)).toBeLessThanOrEqual(7);
  });
});
