/**
 * Partner finder. Implements the matchmaking algorithm from the Feera spec.
 *
 * Hard filters:
 *   - radius (km, default 15)
 *   - level overlap: candidate's [requiredLevelMin, requiredLevelMax] must overlap
 *     [user.display - 0.5, user.display + 0.5]
 *   - gender compatibility per candidate `genderPreference`
 *   - friendship-block (no candidate where any participant is in user.blockedUserIds)
 *   - sandbag exclusion (skip if user.isSandbagFlagged)
 *   - time-conflict-free against caller-provided existing bookings (optional)
 *
 * Score weights (sum to 1.0):
 *   - 0.30 level proximity
 *   - 0.20 intra-team variance penalty
 *   - 0.15 partner reliability
 *   - 0.15 social graph (friend / friend-of-friend stub)
 *   - 0.10 diversity (prior opponent penalty)
 *   - 0.10 edition boost
 *
 * Returns at most 20 ranked results with human-readable reasons.
 */

import { toDisplayRating } from './glicko';
import type { CountryCode, Locale, Uuid } from '@feera/types';

export type EditionStatus = 'none' | 'applicant' | 'active' | 'lapsed' | 'suspended';

export type FinderParticipant = Readonly<{
  userId: Uuid;
  rating: number;
  /** Glicko-2 internal rating in the women-only parallel pool. Null when the
   * player has never been in an all-female match (or is not female). */
  womenPoolRating?: number | null;
  /** Reported gender. Used only when the caller invokes the women-only pool
   * mode; partner-finder otherwise ignores per-participant gender. */
  gender?: 'm' | 'f' | null;
  isFriend: boolean;
  isPriorOpponent: boolean;
  reliability: number;
}>;

export type OpenMatch = Readonly<{
  bookingId: Uuid;
  courtId: Uuid;
  clubId: Uuid;
  clubName: string;
  lat: number;
  lng: number;
  startAt: Date;
  endAt: Date;
  requiredLevelMin: number;
  requiredLevelMax: number;
  genderPreference: 'open' | 'men_only' | 'women_only' | 'mixed';
  participants: ReadonlyArray<FinderParticipant>;
  isEditionPriority: boolean;
  countryCode: CountryCode;
}>;

export type ExistingBooking = Readonly<{
  startAt: Date;
  endAt: Date;
}>;

export type FinderUser = Readonly<{
  id: Uuid;
  rating: number;
  /** Glicko-2 internal rating in the women-only parallel pool. */
  womenPoolRating?: number | null;
  rd: number;
  lat: number;
  lng: number;
  gender?: 'm' | 'f';
  locale: Locale;
  countryCode: CountryCode;
  onTimeRate: number;
  noShowRate: number;
  editionStatus: EditionStatus;
  blockedUserIds: ReadonlySet<Uuid>;
  isSandbagFlagged: boolean;
  existingBookings?: ReadonlyArray<ExistingBooking>;
}>;

export type FinderFilters = Readonly<{
  radiusKm?: number;
  from?: Date;
  to?: Date;
  genderPreference?: OpenMatch['genderPreference'];
  /**
   * When true: only return candidate matches with `genderPreference = 'women_only'`
   * where every existing participant has gender === 'f'. Level-proximity scoring
   * switches to use `womenPoolRating` instead of the open rating.
   *
   * Caller MUST already gate this on the requesting user's gender === 'f' and
   * `womenOnlyPoolOptIn = true`. partner-finder does not enforce caller gender.
   */
  womenOnly?: boolean;
}>;

export type FinderInput = Readonly<{
  user: FinderUser;
  candidates: ReadonlyArray<OpenMatch>;
  filters?: FinderFilters;
}>;

export type FinderResultItem = Readonly<{
  match: OpenMatch;
  score: number;
  reasons: ReadonlyArray<string>;
}>;

export type FinderResult = ReadonlyArray<FinderResultItem>;

const DEFAULT_RADIUS_KM = 15;
const MAX_RESULTS = 20;

const WEIGHTS = {
  levelProximity: 0.3,
  intraTeamVariance: 0.2,
  partnerReliability: 0.15,
  socialGraph: 0.15,
  diversity: 0.1,
  edition: 0.1,
} as const;

/**
 * Haversine distance in kilometres between two coordinates.
 */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function genderCompatible(
  pref: OpenMatch['genderPreference'],
  gender: 'm' | 'f' | undefined,
): boolean {
  if (pref === 'open' || pref === 'mixed') return true;
  if (pref === 'men_only') return gender === 'm';
  if (pref === 'women_only') return gender === 'f';
  return false;
}

function levelRangeOverlap(
  userDisplay: number,
  reqMin: number,
  reqMax: number,
): boolean {
  const lo = userDisplay - 0.5;
  const hi = userDisplay + 0.5;
  return reqMin <= hi && reqMax >= lo;
}

/**
 * Map internal Glicko delta to display-scale delta. 200 internal points = 1.0 display.
 */
function internalDeltaToDisplay(internalDelta: number): number {
  return internalDelta / 200;
}

function scoreLevelProximity(
  userInternal: number,
  candidate: OpenMatch,
  useWomenPool = false,
): number {
  const ratingOf = (p: FinderParticipant): number =>
    useWomenPool && p.womenPoolRating != null ? p.womenPoolRating : p.rating;

  if (candidate.participants.length === 0) {
    const mid = (candidate.requiredLevelMin + candidate.requiredLevelMax) / 2;
    const userDisplay = toDisplayRating(userInternal);
    const diff = Math.abs(mid - userDisplay);
    return Math.max(0, 1 - diff / 1.5);
  }
  const avgInternal =
    candidate.participants.reduce((acc, p) => acc + ratingOf(p), 0) /
    candidate.participants.length;
  const displayDelta = Math.abs(internalDeltaToDisplay(avgInternal - userInternal));
  // 0 delta = 1.0; 1.5 display points away = 0
  return Math.max(0, 1 - displayDelta / 1.5);
}

function scoreIntraTeamVariance(
  userInternal: number,
  candidate: OpenMatch,
  useWomenPool = false,
): number {
  // Predict the worst-case intra-team spread once the user joins.
  // Doubles = 4 players; team split that yields smallest gap is best.
  // We approximate by including the user with the existing participants and
  // looking at the spread.
  const ratingOf = (p: FinderParticipant): number =>
    useWomenPool && p.womenPoolRating != null ? p.womenPoolRating : p.rating;
  const ratingsDisplay = [
    toDisplayRating(userInternal),
    ...candidate.participants.map((p) => toDisplayRating(ratingOf(p))),
  ];
  if (ratingsDisplay.length < 2) return 1;
  const max = Math.max(...ratingsDisplay);
  const min = Math.min(...ratingsDisplay);
  const spread = max - min;
  if (spread <= 0.8) return 1;
  // Penalty grows linearly from 1.0 at spread 0.8 down to 0 at spread 2.0
  return Math.max(0, 1 - (spread - 0.8) / 1.2);
}

function scorePartnerReliability(candidate: OpenMatch): number {
  if (candidate.participants.length === 0) return 0.75;
  const sum = candidate.participants.reduce((acc, p) => acc + p.reliability, 0);
  return sum / candidate.participants.length;
}

function scoreSocialGraph(candidate: OpenMatch): number {
  if (candidate.participants.length === 0) return 0.0;
  // 1.0 if any friend is playing, else 0.5 if any friend-of-friend (TODO M4),
  // else 0.0.
  const anyFriend = candidate.participants.some((p) => p.isFriend);
  if (anyFriend) return 1.0;
  // FoF stub: until friendships table lands fully, return 0.
  return 0.0;
}

function scoreDiversity(candidate: OpenMatch): number {
  if (candidate.participants.length === 0) return 1.0;
  const priorCount = candidate.participants.filter((p) => p.isPriorOpponent).length;
  return Math.max(0, 1 - priorCount / candidate.participants.length);
}

function scoreEdition(user: FinderUser, candidate: OpenMatch): number {
  if (!candidate.isEditionPriority) return 0;
  return user.editionStatus === 'active' ? 1.0 : 0.0;
}

function buildReasons(user: FinderUser, candidate: OpenMatch, distanceKm: number): string[] {
  const reasons: string[] = [];
  const userDisplay = toDisplayRating(user.rating);

  const friendCount = candidate.participants.filter((p) => p.isFriend).length;
  if (friendCount === 1) {
    reasons.push('1 of your regular partners is playing');
  } else if (friendCount > 1) {
    reasons.push(`${friendCount} of your regular partners are playing`);
  }

  if (candidate.participants.length > 0) {
    const avgInternal =
      candidate.participants.reduce((acc, p) => acc + p.rating, 0) /
      candidate.participants.length;
    const avgDisplay = toDisplayRating(avgInternal);
    const delta = avgDisplay - userDisplay;
    if (Math.abs(delta) < 0.05) {
      reasons.push('Same level as you');
    } else {
      const direction = delta > 0 ? 'above' : 'below';
      reasons.push(`${Math.abs(delta).toFixed(1)} levels ${direction} you`);
    }
  } else {
    reasons.push('Open spot, no players yet');
  }

  const reliability = scorePartnerReliability(candidate);
  if (candidate.participants.length > 0) {
    reasons.push(`${Math.round(reliability * 100)}% reliable`);
  }

  if (distanceKm < 1) {
    reasons.push(`Less than 1 km from you`);
  } else {
    reasons.push(`${distanceKm.toFixed(1)} km away`);
  }

  reasons.push(`At ${candidate.clubName}`);

  if (candidate.isEditionPriority && user.editionStatus === 'active') {
    reasons.push('Edition priority match');
  }

  return reasons;
}

/**
 * Find ranked partner / open-match suggestions for a user.
 */
export function findPartners(input: FinderInput): FinderResult {
  const { user, candidates, filters } = input;

  if (user.isSandbagFlagged) {
    return [];
  }

  const radiusKm = filters?.radiusKm ?? DEFAULT_RADIUS_KM;
  const from = filters?.from;
  const to = filters?.to;
  const womenOnly = filters?.womenOnly === true;
  // In women-only mode, use the woman-pool rating for the user's effective
  // level. Falls back to the open rating when the user has no women-pool
  // history yet (first match in the pool).
  const effectiveUserInternal =
    womenOnly && user.womenPoolRating != null ? user.womenPoolRating : user.rating;
  const userDisplay = toDisplayRating(effectiveUserInternal);

  const filtered: Array<{ match: OpenMatch; distanceKm: number }> = [];
  for (const c of candidates) {
    // Time window
    if (from && c.startAt < from) continue;
    if (to && c.endAt > to) continue;

    // Radius
    const distanceKm = haversineKm(user.lat, user.lng, c.lat, c.lng);
    if (distanceKm > radiusKm) continue;

    // Level overlap (±0.5 display)
    if (!levelRangeOverlap(userDisplay, c.requiredLevelMin, c.requiredLevelMax)) continue;

    // Gender compatibility
    if (filters?.genderPreference && filters.genderPreference !== c.genderPreference) continue;
    if (!genderCompatible(c.genderPreference, user.gender)) continue;

    // Women-only pool: hard filter, women_only bookings only and every
    // existing participant must be female.
    if (womenOnly) {
      if (c.genderPreference !== 'women_only') continue;
      const allFemale = c.participants.every((p) => p.gender === 'f');
      if (!allFemale) continue;
    }

    // Block list
    const blocked = c.participants.some((p) => user.blockedUserIds.has(p.userId));
    if (blocked) continue;

    // Skip if user is already a participant
    if (c.participants.some((p) => p.userId === user.id)) continue;

    // Skip flagged sandbag participants
    // (caller is responsible for omitting them; we double-check via reliability heuristics
    // not needed here.)

    // Time conflict against user's existing bookings
    if (user.existingBookings && user.existingBookings.length > 0) {
      const conflict = user.existingBookings.some((b) =>
        overlaps(b.startAt, b.endAt, c.startAt, c.endAt),
      );
      if (conflict) continue;
    }

    filtered.push({ match: c, distanceKm });
  }

  const scored: FinderResultItem[] = filtered.map(({ match, distanceKm }) => {
    const sLevel = scoreLevelProximity(effectiveUserInternal, match, womenOnly);
    const sVariance = scoreIntraTeamVariance(effectiveUserInternal, match, womenOnly);
    const sReliability = scorePartnerReliability(match);
    const sSocial = scoreSocialGraph(match);
    const sDiversity = scoreDiversity(match);
    const sEdition = scoreEdition(user, match);

    const score =
      sLevel * WEIGHTS.levelProximity +
      sVariance * WEIGHTS.intraTeamVariance +
      sReliability * WEIGHTS.partnerReliability +
      sSocial * WEIGHTS.socialGraph +
      sDiversity * WEIGHTS.diversity +
      sEdition * WEIGHTS.edition;

    return {
      match,
      score: Math.min(1, Math.max(0, score)),
      reasons: buildReasons(user, match, distanceKm),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RESULTS);
}
