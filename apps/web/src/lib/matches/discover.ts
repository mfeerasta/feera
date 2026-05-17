import { and, eq, gt, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  bookingParticipants,
  bookings,
  clubs,
  courts,
  userRatings,
  userSocialScores,
  users,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import {
  findPartners,
  type FinderResult,
  type FinderUser,
  type OpenMatch,
} from '@feera/matching';
import type { CountryCode, Locale, Uuid } from '@feera/types';

export interface DiscoverFilters {
  radiusKm: number;
  from: Date;
  to: Date;
  genderPreference?: 'open' | 'men_only' | 'women_only' | 'mixed';
  /** Restrict to the women-only matchmaking pool (parallel Glicko). */
  womenOnly?: boolean;
}

/**
 * Build the bounding-box lat/lng bounds for a radius in km.
 * Approximation good enough for the candidate-prefilter step.
 */
function bbox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

/**
 * Load + score open matches for the given user.
 *
 * Steps:
 *   1. load user + rating + social scores
 *   2. load candidate bookings via bounding-box, level overlap, time, isOpenMatch, status
 *   3. hydrate court + club + current participants (with rating, isFriend stubbed false)
 *   4. delegate to @feera/matching/findPartners
 */
export async function discoverOpenMatches(
  tx: typeof Db,
  userId: string,
  filters: DiscoverFilters,
): Promise<FinderResult> {
  const userRow = (
    await tx
      .select({
        id: users.id,
        countryCode: users.countryCode,
        locale: users.locale,
        gender: users.gender,
        editionMemberStatus: users.editionMemberStatus,
        ratingInternal: userRatings.ratingInternal,
        ratingDeviation: userRatings.ratingDeviation,
        womenOnlyPoolRating: userRatings.womenOnlyPoolRating,
        isFlaggedSandbag: userRatings.isFlaggedSandbag,
        onTimeRate: userSocialScores.onTimeRate,
        noShowRate: userSocialScores.noShowRate,
      })
      .from(users)
      .leftJoin(userRatings, eq(userRatings.userId, users.id))
      .leftJoin(userSocialScores, eq(userSocialScores.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1)
  )[0];

  if (!userRow) return [];

  // Default home lat/lng falls back to the first club in the user's country when
  // the user row has no geo. M5 will add a profile lat/lng.
  let homeLat = 31.5497;
  let homeLng = 74.3436;
  const homeClub = (
    await tx
      .select({ lat: clubs.lat, lng: clubs.lng })
      .from(clubs)
      .where(eq(clubs.countryCode, userRow.countryCode))
      .limit(1)
  )[0];
  if (homeClub?.lat != null && homeClub.lng != null) {
    homeLat = homeClub.lat;
    homeLng = homeClub.lng;
  }

  const box = bbox(homeLat, homeLng, filters.radiusKm);

  const candidateBookings = await tx
    .select({
      bookingId: bookings.id,
      courtId: bookings.courtId,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      requiredLevelMin: bookings.requiredLevelMin,
      requiredLevelMax: bookings.requiredLevelMax,
      genderPreference: bookings.genderPreference,
      maxParticipants: bookings.maxParticipants,
      isEditionPriority: bookings.isEditionPriority,
      clubId: clubs.id,
      clubName: clubs.name,
      clubLat: clubs.lat,
      clubLng: clubs.lng,
      countryCode: clubs.countryCode,
    })
    .from(bookings)
    .innerJoin(courts, eq(courts.id, bookings.courtId))
    .innerJoin(clubs, eq(clubs.id, courts.clubId))
    .where(
      and(
        eq(bookings.isOpenMatch, true),
        eq(bookings.status, 'confirmed'),
        gt(bookings.startAt, new Date()),
        gte(bookings.startAt, filters.from),
        lte(bookings.endAt, filters.to),
        gte(clubs.lat, box.minLat),
        lte(clubs.lat, box.maxLat),
        gte(clubs.lng, box.minLng),
        lte(clubs.lng, box.maxLng),
      ),
    )
    .limit(200);

  const bookingIds = candidateBookings.map((c) => c.bookingId);
  const participantRows = bookingIds.length
    ? await tx
        .select({
          bookingId: bookingParticipants.bookingId,
          userId: bookingParticipants.userId,
          status: bookingParticipants.status,
          ratingInternal: userRatings.ratingInternal,
          womenOnlyPoolRating: userRatings.womenOnlyPoolRating,
          gender: users.gender,
          onTimeRate: userSocialScores.onTimeRate,
          noShowRate: userSocialScores.noShowRate,
        })
        .from(bookingParticipants)
        .leftJoin(users, eq(users.id, bookingParticipants.userId))
        .leftJoin(userRatings, eq(userRatings.userId, bookingParticipants.userId))
        .leftJoin(userSocialScores, eq(userSocialScores.userId, bookingParticipants.userId))
        .where(inArray(bookingParticipants.bookingId, bookingIds))
    : [];

  const partsByBooking = new Map<
    string,
    Array<{
      userId: string;
      ratingInternal: number;
      womenOnlyPoolRating: number | null;
      gender: 'm' | 'f' | null;
      onTimeRate: number;
      noShowRate: number;
    }>
  >();
  for (const p of participantRows) {
    if (p.status === 'declined' || p.status === 'removed') continue;
    const arr = partsByBooking.get(p.bookingId) ?? [];
    const g = p.gender === 'm' || p.gender === 'f' ? p.gender : null;
    arr.push({
      userId: p.userId,
      ratingInternal: p.ratingInternal ?? 1500,
      womenOnlyPoolRating: p.womenOnlyPoolRating ?? null,
      gender: g,
      onTimeRate: p.onTimeRate ?? 1.0,
      noShowRate: p.noShowRate ?? 0.0,
    });
    partsByBooking.set(p.bookingId, arr);
  }

  const candidates: OpenMatch[] = candidateBookings
    .filter(
      (c) =>
        c.clubLat != null &&
        c.clubLng != null &&
        c.requiredLevelMin != null &&
        c.requiredLevelMax != null,
    )
    .filter((c) => {
      const parts = partsByBooking.get(c.bookingId) ?? [];
      return parts.length < c.maxParticipants;
    })
    .map((c) => {
      const parts = partsByBooking.get(c.bookingId) ?? [];
      return {
        bookingId: c.bookingId as Uuid,
        courtId: c.courtId as Uuid,
        clubId: c.clubId as Uuid,
        clubName: c.clubName,
        lat: c.clubLat!,
        lng: c.clubLng!,
        startAt: c.startAt,
        endAt: c.endAt,
        requiredLevelMin: c.requiredLevelMin!,
        requiredLevelMax: c.requiredLevelMax!,
        genderPreference: c.genderPreference,
        participants: parts.map((p) => ({
          userId: p.userId as Uuid,
          rating: p.ratingInternal,
          womenPoolRating: p.womenOnlyPoolRating,
          gender: p.gender,
          isFriend: false, // TODO(M4 follow-up): join friendships table once applied to prod
          isPriorOpponent: false, // TODO(M4 follow-up): derive from matches table history
          reliability: (p.onTimeRate + (1 - p.noShowRate)) / 2,
        })),
        isEditionPriority: c.isEditionPriority,
        countryCode: c.countryCode as CountryCode,
      } satisfies OpenMatch;
    });

  // Existing bookings for the user, to prevent time conflicts.
  const existing = await tx
    .select({ startAt: bookings.startAt, endAt: bookings.endAt })
    .from(bookings)
    .innerJoin(bookingParticipants, eq(bookingParticipants.bookingId, bookings.id))
    .where(
      and(
        eq(bookingParticipants.userId, userId),
        gt(bookings.startAt, new Date()),
        sql`${bookings.status} in ('pending','confirmed')`,
      ),
    );

  const finderUser: FinderUser = {
    id: userRow.id as Uuid,
    rating: userRow.ratingInternal ?? 1500,
    womenPoolRating: userRow.womenOnlyPoolRating ?? null,
    rd: userRow.ratingDeviation ?? 350,
    lat: homeLat,
    lng: homeLng,
    gender: userRow.gender === 'm' || userRow.gender === 'f' ? userRow.gender : undefined,
    locale: userRow.locale as Locale,
    countryCode: userRow.countryCode as CountryCode,
    onTimeRate: userRow.onTimeRate ?? 1.0,
    noShowRate: userRow.noShowRate ?? 0.0,
    editionStatus: userRow.editionMemberStatus,
    blockedUserIds: new Set<Uuid>(), // TODO(M4 follow-up): hydrate from friendships
    isSandbagFlagged: userRow.isFlaggedSandbag ?? false,
    existingBookings: existing.map((b) => ({ startAt: b.startAt, endAt: b.endAt })),
  };

  return findPartners({
    user: finderUser,
    candidates,
    filters: {
      radiusKm: filters.radiusKm,
      from: filters.from,
      to: filters.to,
      genderPreference: filters.genderPreference,
      womenOnly: filters.womenOnly,
    },
  });
}
