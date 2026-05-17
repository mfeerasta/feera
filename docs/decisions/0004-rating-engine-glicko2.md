# 0004. Rating engine: Glicko-2 (not vanilla ELO, not TrueSkill)

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: matching

## Context

The rating engine drives matchmaking, tournament seeding, anti-sandbag detection, and most onboarding friction. We need a system that:

- Converges quickly for new players (provisional ratings).
- Is comparable to Playtomic's 0.0-7.0 display scale (reduces switching friction in markets where Playtomic has a foothold, e.g., UAE, Saudi).
- Handles 2v2 doubles where each match yields four pairwise updates.
- Surfaces a confidence indicator (rating deviation).

## Options considered

### Option A: Vanilla ELO
Simple, well-understood. No deviation. Slow convergence for new players. Hard to detect sandbagging without ad-hoc heuristics. Rejected: no confidence signal.

### Option B: Glicko-2 (Glickman 2012)
Adds rating deviation and volatility on top of ELO. Confidence is first-class. Volatility flags hot or cold streaks. Used by Lichess and Padel Lock. Conversion to 0.0-7.0 is a linear map.

### Option C: TrueSkill (Microsoft)
Bayesian skill model, factor graphs, designed for team games. More accurate in theory.

Cons: heavier compute, harder to explain, no community Postgres-friendly impl, opaque to users.

## Decision

**Glicko-2** with starting rating 1500, RD 350, volatility 0.06, tau 0.5. Display rating `clamp((internal - 800) / 200, 0, 7)` rounded to one decimal.

## Treatment specifics

- Doubles match = 4 pairwise updates. Each player's expected score uses the average of opponents, weighted by partner rating proximity.
- Provisional flag: true until 5+ ranked matches. Faded badge in UI.
- Women-only pool rating: parallel `women_only_pool_rating` field, updated only when both teams are all-female.
- Anti-sandbag: flag if actual-vs-expected win rate over last 20 matches is > 2 stddev outside expected. Flagged players excluded from open match discovery until reviewed.

## Consequences

- Positive: confidence (RD) drives both UX (provisional badge) and matchmaking (penalty when RD is high on either side).
- Positive: Playtomic-comparable scale lowers onboarding friction.
- Negative: more complex than ELO. Mitigation: extensive unit tests in `packages/matching` (monotonicity, symmetry, convergence over 100 simulated matches, edge cases at 0.0 and 7.0).
- Follow-up: ADR-0005 will cover the anti-sandbag review workflow.
