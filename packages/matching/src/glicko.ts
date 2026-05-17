/**
 * Glicko-2 rating system. Reference: Glickman, M.E. "Example of the Glicko-2 system" (2012).
 * Display rating maps internal Glicko to a Playtomic-compatible 0.0-7.0 scale.
 */

export const GLICKO = {
  startRating: 1500,
  startRD: 350,
  startVolatility: 0.06,
  /** System constant. Controls volatility change. Glickman recommends 0.3-1.2; 0.5 is a good default. */
  tau: 0.5,
  /** Scale conversion constant between original Glicko and Glicko-2 internal scale. */
  scale: 173.7178,
  /** Iteration tolerance for volatility update. */
  epsilon: 0.000001,
} as const;

export type Player = Readonly<{
  rating: number;
  rd: number;
  volatility: number;
}>;

export type MatchOutcome = Readonly<{
  opponent: Player;
  /** 1 = win, 0.5 = draw, 0 = loss. */
  score: 0 | 0.5 | 1;
}>;

export type RatingUpdate = Readonly<{
  rating: number;
  rd: number;
  volatility: number;
}>;

/**
 * Convert internal Glicko rating to the player-facing 0.0-7.0 display scale.
 * Matches Playtomic ladder positioning to lower onboarding friction.
 */
export function toDisplayRating(internalRating: number): number {
  const raw = (internalRating - 800) / 200;
  const clamped = Math.min(7, Math.max(0, raw));
  return Math.round(clamped * 10) / 10;
}

/** Inverse of toDisplayRating. Useful for imports from Playtomic. */
export function fromDisplayRating(display: number): number {
  const clamped = Math.min(7, Math.max(0, display));
  return clamped * 200 + 800;
}

/** g(φ) per Glickman 2012, equation in step 3 of the algorithm. */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/** E(μ, μ_j, φ_j) per Glickman 2012, expected score against opponent j. */
function expectedScore(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Update a player's rating after a rating period containing the supplied outcomes.
 * Handles the no-match case per Glickman's "step 6" by only inflating RD.
 */
export function updateRating(player: Player, outcomes: readonly MatchOutcome[]): RatingUpdate {
  const mu = (player.rating - GLICKO.startRating) / GLICKO.scale;
  const phi = player.rd / GLICKO.scale;
  const sigma = player.volatility;

  if (outcomes.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return {
      rating: player.rating,
      rd: phiStar * GLICKO.scale,
      volatility: sigma,
    };
  }

  let vInverse = 0;
  let deltaSum = 0;
  for (const { opponent, score } of outcomes) {
    const muJ = (opponent.rating - GLICKO.startRating) / GLICKO.scale;
    const phiJ = opponent.rd / GLICKO.scale;
    const gJ = g(phiJ);
    const eJ = expectedScore(mu, muJ, phiJ);
    vInverse += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (score - eJ);
  }
  const v = 1 / vInverse;
  const delta = v * deltaSum;

  const sigmaPrime = updateVolatility(phi, v, delta, sigma);

  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;

  return {
    rating: muPrime * GLICKO.scale + GLICKO.startRating,
    rd: phiPrime * GLICKO.scale,
    volatility: sigmaPrime,
  };
}

/**
 * Solve f(x) = 0 for new volatility per Glickman 2012 step 5, using the Illinois variant of regula falsi.
 */
function updateVolatility(phi: number, v: number, delta: number, sigma: number): number {
  const a = Math.log(sigma * sigma);
  const tauSquared = GLICKO.tau * GLICKO.tau;

  const f = (x: number): number => {
    const ex = Math.exp(x);
    const phiSquaredPlusVPlusEx = phi * phi + v + ex;
    const numerator = ex * (delta * delta - phiSquaredPlusVPlusEx);
    const denominator = 2 * phiSquaredPlusVPlusEx * phiSquaredPlusVPlusEx;
    return numerator / denominator - (x - a) / tauSquared;
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * GLICKO.tau) < 0) {
      k += 1;
    }
    B = a - k * GLICKO.tau;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > GLICKO.epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

/**
 * Apply a single doubles match (2v2) and return four rating updates.
 *
 * Each player is treated as having two opponents (the opposing pair). The match result
 * yields s=1 for the winning side, s=0 for the losing side; each player's update accumulates
 * both opponent contributions. This is the simplest mathematically-honest treatment of doubles
 * under Glicko-2 and gives a winner-up / loser-down monotonicity guarantee.
 *
 * Per ADR-0004, the spec calls for partner-weighted variants; explore those in a follow-up
 * once we have real match data to validate against.
 */
export type DoublesTeam = readonly [Player, Player];

export type DoublesMatchResult = Readonly<{
  teamA: DoublesTeam;
  teamB: DoublesTeam;
  /** 'A' or 'B' or 'draw'. */
  winner: 'A' | 'B' | 'draw';
}>;

export type DoublesUpdate = Readonly<{
  teamA: readonly [RatingUpdate, RatingUpdate];
  teamB: readonly [RatingUpdate, RatingUpdate];
}>;

export function applyDoublesMatch(result: DoublesMatchResult): DoublesUpdate {
  const [a1, a2] = result.teamA;
  const [b1, b2] = result.teamB;
  const sA: 0 | 0.5 | 1 = result.winner === 'A' ? 1 : result.winner === 'B' ? 0 : 0.5;
  const sB: 0 | 0.5 | 1 = result.winner === 'B' ? 1 : result.winner === 'A' ? 0 : 0.5;

  return {
    teamA: [
      updateRating(a1, [
        { opponent: b1, score: sA },
        { opponent: b2, score: sA },
      ]),
      updateRating(a2, [
        { opponent: b1, score: sA },
        { opponent: b2, score: sA },
      ]),
    ],
    teamB: [
      updateRating(b1, [
        { opponent: a1, score: sB },
        { opponent: a2, score: sB },
      ]),
      updateRating(b2, [
        { opponent: a1, score: sB },
        { opponent: a2, score: sB },
      ]),
    ],
  };
}

/**
 * Reliability percentage shown in the UI: higher = lower RD = more trusted rating.
 * 100% at RD = 30 (Glickman's "low RD" threshold), 0% at startRD.
 */
export function reliabilityPct(rd: number): number {
  const minRd = 30;
  const maxRd = GLICKO.startRD;
  if (rd <= minRd) return 100;
  if (rd >= maxRd) return 0;
  return Math.round(((maxRd - rd) / (maxRd - minRd)) * 100);
}

/** Players with fewer than 5 ranked matches are flagged provisional. */
export const PROVISIONAL_MATCH_THRESHOLD = 5 as const;

export function isProvisional(matchCount: number): boolean {
  return matchCount < PROVISIONAL_MATCH_THRESHOLD;
}

export function newPlayer(): Player {
  return {
    rating: GLICKO.startRating,
    rd: GLICKO.startRD,
    volatility: GLICKO.startVolatility,
  };
}
