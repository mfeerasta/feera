import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import {
  coaches,
  coachingSessions,
  userRatings,
  users,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import type {
  CoachPatchInput,
  CoachUpsertInput,
  CoachingSessionCreateInput,
  CoachingSessionReviewInput,
} from '@/lib/api/coach-schemas';
import {
  computeAvailableSlots,
  type AvailableSlot,
  type WeeklyAvailability,
} from './availability';

export interface CoachListFilters {
  city?: string;
  country?: string;
  language?: string;
  specialty?: string;
  hourlyRateMax?: number;
  isVerified?: boolean;
  isEditionEndorsed?: boolean;
  sort: 'rating' | 'reliability' | 'priceAsc' | 'priceDesc';
  limit: number;
  offset: number;
}

export interface PublicCoach {
  userId: string;
  coachId: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  locale: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  certifications: Array<Record<string, unknown>>;
  yearsExperience: number | null;
  hourlyRate: number;
  hourlyRateMax: number | null;
  currency: string;
  introVideoUrl: string | null;
  responseTimeAvgHours: number;
  isVerifiedByFeera: boolean;
  isEditionEndorsed: boolean;
  isAcceptingBookings: boolean;
  acceptsWomenOnly: boolean;
  acceptsJuniors: boolean;
  averageRating: number | null;
  ratingCount: number;
  reliabilityPct: number | null;
  primaryClubId: string | null;
  weeklyAvailability: WeeklyAvailability;
  verificationDocuments?: Array<Record<string, unknown>>;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  return fallback;
}

function toWeekly(value: unknown): WeeklyAvailability {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as WeeklyAvailability;
  }
  return {};
}

export async function listCoaches(
  tx: typeof Db,
  f: CoachListFilters,
): Promise<PublicCoach[]> {
  const filters: SQL[] = [isNull(coaches.deletedAt)];
  if (f.isVerified !== undefined) {
    filters.push(eq(coaches.isVerifiedByFeera, f.isVerified));
  } else {
    // Default for marketplace listing: only verified coaches.
    filters.push(eq(coaches.isVerifiedByFeera, true));
  }
  if (f.isEditionEndorsed !== undefined) {
    filters.push(eq(coaches.isEditionEndorsed, f.isEditionEndorsed));
  }
  if (f.hourlyRateMax !== undefined) {
    filters.push(lte(coaches.hourlyRate, f.hourlyRateMax));
  }
  if (f.country) filters.push(eq(users.countryCode, f.country));
  if (f.city) filters.push(ilike(users.city, f.city));

  // Sort
  let orderBy: SQL;
  switch (f.sort) {
    case 'priceAsc':
      orderBy = asc(coaches.hourlyRate);
      break;
    case 'priceDesc':
      orderBy = desc(coaches.hourlyRate);
      break;
    case 'reliability':
      orderBy = desc(sql`coalesce(${userRatings.reliabilityPct}, 0)`);
      break;
    case 'rating':
    default:
      orderBy = desc(sql`coalesce(${coaches.averageRating}, 0)`);
      break;
  }

  const rows = await tx
    .select({
      coachId: coaches.id,
      userId: coaches.userId,
      bio: coaches.bio,
      languages: coaches.languages,
      specialties: coaches.specialties,
      certifications: coaches.certifications,
      yearsExperience: coaches.yearsExperience,
      hourlyRate: coaches.hourlyRate,
      hourlyRateMax: coaches.hourlyRateMax,
      currency: coaches.currency,
      introVideoUrl: coaches.introVideoUrl,
      responseTimeAvgHours: coaches.responseTimeAvgHours,
      isVerifiedByFeera: coaches.isVerifiedByFeera,
      isEditionEndorsed: coaches.isEditionEndorsed,
      isAcceptingBookings: coaches.isAcceptingBookings,
      acceptsWomenOnly: coaches.acceptsWomenOnly,
      acceptsJuniors: coaches.acceptsJuniors,
      averageRating: coaches.averageRating,
      ratingCount: coaches.ratingCount,
      primaryClubId: coaches.primaryClubId,
      weeklyAvailability: coaches.weeklyAvailability,
      displayName: users.displayName,
      city: users.city,
      countryCode: users.countryCode,
      locale: users.locale,
      reliabilityPct: userRatings.reliabilityPct,
    })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .leftJoin(userRatings, eq(userRatings.userId, coaches.userId))
    .where(and(...filters))
    .orderBy(orderBy)
    .limit(f.limit)
    .offset(f.offset);

  return rows
    .map((r) => ({
      coachId: r.coachId,
      userId: r.userId,
      displayName: r.displayName,
      city: r.city,
      countryCode: r.countryCode,
      locale: r.locale,
      bio: r.bio,
      languages: toJsonArray<string>(r.languages),
      specialties: toJsonArray<string>(r.specialties),
      certifications: toJsonArray<Record<string, unknown>>(r.certifications),
      yearsExperience: r.yearsExperience,
      hourlyRate: r.hourlyRate,
      hourlyRateMax: r.hourlyRateMax,
      currency: r.currency,
      introVideoUrl: r.introVideoUrl,
      responseTimeAvgHours: r.responseTimeAvgHours,
      isVerifiedByFeera: r.isVerifiedByFeera,
      isEditionEndorsed: r.isEditionEndorsed,
      isAcceptingBookings: r.isAcceptingBookings,
      acceptsWomenOnly: r.acceptsWomenOnly,
      acceptsJuniors: r.acceptsJuniors,
      averageRating: r.averageRating,
      ratingCount: r.ratingCount,
      reliabilityPct: r.reliabilityPct,
      primaryClubId: r.primaryClubId,
      weeklyAvailability: toWeekly(r.weeklyAvailability),
    }))
    .filter((row) => {
      if (f.language && !row.languages.some((l) => l.toLowerCase() === f.language!.toLowerCase())) return false;
      if (f.specialty && !row.specialties.some((s) => s.toLowerCase().includes(f.specialty!.toLowerCase()))) return false;
      return true;
    });
}

export async function getCoachByUserId(
  tx: typeof Db,
  userId: string,
  options: { includePrivate?: boolean } = {},
): Promise<PublicCoach | null> {
  const [row] = await tx
    .select({
      coachId: coaches.id,
      userId: coaches.userId,
      bio: coaches.bio,
      languages: coaches.languages,
      specialties: coaches.specialties,
      certifications: coaches.certifications,
      yearsExperience: coaches.yearsExperience,
      hourlyRate: coaches.hourlyRate,
      hourlyRateMax: coaches.hourlyRateMax,
      currency: coaches.currency,
      introVideoUrl: coaches.introVideoUrl,
      responseTimeAvgHours: coaches.responseTimeAvgHours,
      isVerifiedByFeera: coaches.isVerifiedByFeera,
      isEditionEndorsed: coaches.isEditionEndorsed,
      isAcceptingBookings: coaches.isAcceptingBookings,
      acceptsWomenOnly: coaches.acceptsWomenOnly,
      acceptsJuniors: coaches.acceptsJuniors,
      averageRating: coaches.averageRating,
      ratingCount: coaches.ratingCount,
      primaryClubId: coaches.primaryClubId,
      weeklyAvailability: coaches.weeklyAvailability,
      verificationDocuments: coaches.verificationDocuments,
      displayName: users.displayName,
      city: users.city,
      countryCode: users.countryCode,
      locale: users.locale,
      reliabilityPct: userRatings.reliabilityPct,
    })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .leftJoin(userRatings, eq(userRatings.userId, coaches.userId))
    .where(and(eq(coaches.userId, userId), isNull(coaches.deletedAt)))
    .limit(1);

  if (!row) return null;
  const out: PublicCoach = {
    coachId: row.coachId,
    userId: row.userId,
    displayName: row.displayName,
    city: row.city,
    countryCode: row.countryCode,
    locale: row.locale,
    bio: row.bio,
    languages: toJsonArray<string>(row.languages),
    specialties: toJsonArray<string>(row.specialties),
    certifications: toJsonArray<Record<string, unknown>>(row.certifications),
    yearsExperience: row.yearsExperience,
    hourlyRate: row.hourlyRate,
    hourlyRateMax: row.hourlyRateMax,
    currency: row.currency,
    introVideoUrl: row.introVideoUrl,
    responseTimeAvgHours: row.responseTimeAvgHours,
    isVerifiedByFeera: row.isVerifiedByFeera,
    isEditionEndorsed: row.isEditionEndorsed,
    isAcceptingBookings: row.isAcceptingBookings,
    acceptsWomenOnly: row.acceptsWomenOnly,
    acceptsJuniors: row.acceptsJuniors,
    averageRating: row.averageRating,
    ratingCount: row.ratingCount,
    reliabilityPct: row.reliabilityPct,
    primaryClubId: row.primaryClubId,
    weeklyAvailability: toWeekly(row.weeklyAvailability),
  };
  if (options.includePrivate) {
    out.verificationDocuments = toJsonArray<Record<string, unknown>>(row.verificationDocuments);
  }
  return out;
}

export interface UpsertResult {
  coach: typeof coaches.$inferSelect;
  created: boolean;
}

export async function upsertCoach(
  tx: typeof Db,
  userId: string,
  input: CoachUpsertInput,
): Promise<UpsertResult> {
  const [existing] = await tx
    .select()
    .from(coaches)
    .where(eq(coaches.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await tx
      .update(coaches)
      .set({
        bio: input.bio,
        languages: input.languages,
        specialties: input.specialties,
        certifications: input.certifications ?? existing.certifications,
        yearsExperience: input.yearsExperience ?? existing.yearsExperience,
        hourlyRate: input.hourlyRate,
        hourlyRateMax: input.hourlyRateMax ?? null,
        currency: input.currency,
        primaryClubId: input.primaryClubId ?? existing.primaryClubId,
        weeklyAvailability: input.weeklyAvailability ?? existing.weeklyAvailability,
        introVideoUrl: input.introVideoUrl ?? existing.introVideoUrl,
        responseTimeAvgHours:
          input.responseTimeAvgHours ?? existing.responseTimeAvgHours,
        acceptsWomenOnly: input.acceptsWomenOnly ?? existing.acceptsWomenOnly,
        acceptsJuniors: input.acceptsJuniors ?? existing.acceptsJuniors,
        isAcceptingBookings:
          input.isAcceptingBookings ?? existing.isAcceptingBookings,
      })
      .where(eq(coaches.id, existing.id))
      .returning();
    return { coach: updated!, created: false };
  }

  const [created] = await tx
    .insert(coaches)
    .values({
      userId,
      bio: input.bio,
      languages: input.languages,
      specialties: input.specialties,
      certifications: input.certifications ?? [],
      yearsExperience: input.yearsExperience,
      hourlyRate: input.hourlyRate,
      hourlyRateMax: input.hourlyRateMax ?? null,
      currency: input.currency,
      primaryClubId: input.primaryClubId,
      weeklyAvailability: input.weeklyAvailability ?? {},
      introVideoUrl: input.introVideoUrl,
      responseTimeAvgHours: input.responseTimeAvgHours ?? 24,
      acceptsWomenOnly: input.acceptsWomenOnly ?? true,
      acceptsJuniors: input.acceptsJuniors ?? true,
      isAcceptingBookings: input.isAcceptingBookings ?? true,
      isVerifiedByFeera: false,
    })
    .returning();
  return { coach: created!, created: true };
}

export async function patchCoach(
  tx: typeof Db,
  userId: string,
  input: CoachPatchInput,
): Promise<typeof coaches.$inferSelect | null> {
  const [existing] = await tx
    .select()
    .from(coaches)
    .where(eq(coaches.userId, userId))
    .limit(1);
  if (!existing) return null;
  const patch: Partial<typeof coaches.$inferInsert> = {};
  for (const key of Object.keys(input) as Array<keyof CoachPatchInput>) {
    const value = input[key];
    if (value === undefined) continue;
    (patch as Record<string, unknown>)[key] = value;
  }
  const [updated] = await tx
    .update(coaches)
    .set(patch)
    .where(eq(coaches.id, existing.id))
    .returning();
  return updated ?? null;
}

export async function appendVerificationDocuments(
  tx: typeof Db,
  userId: string,
  docs: Array<{ kind: string; url: string; uploadedAt?: string; label?: string }>,
): Promise<typeof coaches.$inferSelect | null> {
  const [existing] = await tx
    .select()
    .from(coaches)
    .where(eq(coaches.userId, userId))
    .limit(1);
  if (!existing) return null;
  const current = toJsonArray<Record<string, unknown>>(existing.verificationDocuments);
  const next = [
    ...current,
    ...docs.map((d) => ({ ...d, uploadedAt: d.uploadedAt ?? new Date().toISOString() })),
  ];
  const [updated] = await tx
    .update(coaches)
    .set({ verificationDocuments: next })
    .where(eq(coaches.id, existing.id))
    .returning();
  return updated ?? null;
}

export async function setVerificationFlag(
  tx: typeof Db,
  userId: string,
  isVerified: boolean,
): Promise<typeof coaches.$inferSelect | null> {
  const [updated] = await tx
    .update(coaches)
    .set({ isVerifiedByFeera: isVerified })
    .where(eq(coaches.userId, userId))
    .returning();
  if (updated) {
    await tx
      .update(users)
      .set({ isVerifiedCoach: isVerified })
      .where(eq(users.id, userId));
  }
  return updated ?? null;
}

export async function listSessionsInRange(
  tx: typeof Db,
  coachId: string,
  from: Date,
  to: Date,
) {
  return tx
    .select({
      id: coachingSessions.id,
      startAt: coachingSessions.startAt,
      endAt: coachingSessions.endAt,
      status: coachingSessions.status,
    })
    .from(coachingSessions)
    .where(
      and(
        eq(coachingSessions.coachId, coachId),
        gte(coachingSessions.startAt, from),
        lte(coachingSessions.startAt, to),
        or(
          eq(coachingSessions.status, 'pending'),
          eq(coachingSessions.status, 'confirmed'),
          eq(coachingSessions.status, 'completed'),
        ) as SQL,
      ),
    );
}

export async function computeAvailabilityForCoach(
  tx: typeof Db,
  coachUserId: string,
  windowDays = 14,
): Promise<AvailableSlot[] | null> {
  const coach = await getCoachByUserId(tx, coachUserId);
  if (!coach) return null;
  const from = new Date();
  const to = new Date(from.getTime() + windowDays * 24 * 60 * 60_000);
  const existing = await listSessionsInRange(tx, coach.coachId, from, to);
  return computeAvailableSlots(
    coach.weeklyAvailability,
    existing.map((s) => ({ startAt: new Date(s.startAt), endAt: new Date(s.endAt) })),
    windowDays,
    { from },
  );
}

export type CreateSessionError =
  | { kind: 'coach_not_found' }
  | { kind: 'coach_inactive' }
  | { kind: 'not_verified' }
  | { kind: 'invalid_window' }
  | { kind: 'slot_unavailable' }
  | { kind: 'learner_not_found' };

export interface CreateSessionResult {
  session: typeof coachingSessions.$inferSelect;
}

export async function createCoachingSession(
  tx: typeof Db,
  learnerUserId: string,
  input: CoachingSessionCreateInput,
): Promise<CreateSessionResult | CreateSessionError> {
  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) return { kind: 'invalid_window' };
  const endAt = new Date(startAt.getTime() + input.durationMinutes * 60_000);
  if (endAt <= startAt) return { kind: 'invalid_window' };

  const coach = await getCoachByUserId(tx, input.coachUserId);
  if (!coach) return { kind: 'coach_not_found' };
  if (!coach.isAcceptingBookings) return { kind: 'coach_inactive' };
  if (!coach.isVerifiedByFeera) return { kind: 'not_verified' };

  const [learner] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, learnerUserId))
    .limit(1);
  if (!learner) return { kind: 'learner_not_found' };

  // Conflict check: any pending or confirmed session that overlaps.
  const overlaps = await tx
    .select({ id: coachingSessions.id })
    .from(coachingSessions)
    .where(
      and(
        eq(coachingSessions.coachId, coach.coachId),
        or(
          eq(coachingSessions.status, 'pending'),
          eq(coachingSessions.status, 'confirmed'),
        ) as SQL,
        lte(coachingSessions.startAt, endAt),
        gte(coachingSessions.endAt, startAt),
      ),
    )
    .limit(1);
  if (overlaps.length > 0) return { kind: 'slot_unavailable' };

  const totalAmount = round2(coach.hourlyRate * (input.durationMinutes / 60));

  const [created] = await tx
    .insert(coachingSessions)
    .values({
      coachId: coach.coachId,
      learnerUserId,
      clubId: input.clubId ?? coach.primaryClubId ?? null,
      courtId: input.courtId ?? null,
      startAt,
      endAt,
      sessionType: input.sessionType,
      totalAmount,
      currency: coach.currency,
      status: 'pending',
      notes: input.notes ?? null,
    })
    .returning();

  return { session: created! };
}

export async function listCoachingSessions(
  tx: typeof Db,
  viewerUserId: string,
  isAdmin: boolean,
  f: {
    coachUserId?: string;
    learnerUserId?: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    from?: Date;
    to?: Date;
    limit: number;
    offset: number;
  },
) {
  const filters: SQL[] = [];
  if (f.coachUserId) {
    const [c] = await tx
      .select({ id: coaches.id })
      .from(coaches)
      .where(eq(coaches.userId, f.coachUserId))
      .limit(1);
    if (!c) return [];
    filters.push(eq(coachingSessions.coachId, c.id));
  }
  if (f.learnerUserId) {
    filters.push(eq(coachingSessions.learnerUserId, f.learnerUserId));
  }
  if (f.status) filters.push(eq(coachingSessions.status, f.status));
  if (f.from) filters.push(gte(coachingSessions.startAt, f.from));
  if (f.to) filters.push(lte(coachingSessions.startAt, f.to));

  // Visibility: admin sees all; otherwise the viewer must be coach or learner.
  if (!isAdmin) {
    const [myCoach] = await tx
      .select({ id: coaches.id })
      .from(coaches)
      .where(eq(coaches.userId, viewerUserId))
      .limit(1);
    const ors: SQL[] = [eq(coachingSessions.learnerUserId, viewerUserId)];
    if (myCoach) ors.push(eq(coachingSessions.coachId, myCoach.id));
    filters.push(or(...ors) as SQL);
  }

  return tx
    .select()
    .from(coachingSessions)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(coachingSessions.startAt))
    .limit(f.limit)
    .offset(f.offset);
}

export async function getCoachingSession(
  tx: typeof Db,
  id: string,
) {
  const [row] = await tx
    .select()
    .from(coachingSessions)
    .where(eq(coachingSessions.id, id))
    .limit(1);
  return row ?? null;
}

export type CancelSessionError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'too_late' }
  | { kind: 'already_cancelled' };

export interface CancelSessionResult {
  session: typeof coachingSessions.$inferSelect;
}

export async function cancelCoachingSession(
  tx: typeof Db,
  id: string,
  viewerUserId: string,
  isAdmin: boolean,
): Promise<CancelSessionResult | CancelSessionError> {
  const session = await getCoachingSession(tx, id);
  if (!session) return { kind: 'not_found' };
  if (session.status === 'cancelled') return { kind: 'already_cancelled' };

  const [coach] = await tx
    .select({ userId: coaches.userId })
    .from(coaches)
    .where(eq(coaches.id, session.coachId))
    .limit(1);
  const isOwner =
    session.learnerUserId === viewerUserId ||
    (coach?.userId === viewerUserId) ||
    isAdmin;
  if (!isOwner) return { kind: 'forbidden' };

  // 24h cancellation window. Refund-flow stub lands when payments-refund ships.
  const windowMs = 24 * 60 * 60_000;
  if (new Date(session.startAt).getTime() - Date.now() < windowMs && !isAdmin) {
    return { kind: 'too_late' };
  }

  const [updated] = await tx
    .update(coachingSessions)
    .set({ status: 'cancelled' })
    .where(eq(coachingSessions.id, id))
    .returning();
  return { session: updated! };
}

export type ReviewError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'too_early' }
  | { kind: 'already_reviewed' };

export interface ReviewResult {
  session: typeof coachingSessions.$inferSelect;
  newAverage: number;
  newCount: number;
}

export async function reviewCoachingSession(
  tx: typeof Db,
  id: string,
  viewerUserId: string,
  input: CoachingSessionReviewInput,
): Promise<ReviewResult | ReviewError> {
  const session = await getCoachingSession(tx, id);
  if (!session) return { kind: 'not_found' };
  if (session.learnerUserId !== viewerUserId) return { kind: 'forbidden' };
  if (new Date(session.startAt).getTime() > Date.now()) return { kind: 'too_early' };
  if (session.learnerRating != null) return { kind: 'already_reviewed' };

  const [updated] = await tx
    .update(coachingSessions)
    .set({
      learnerRating: input.rating,
      learnerReview: input.text ?? null,
      status: 'completed',
    })
    .where(eq(coachingSessions.id, id))
    .returning();
  if (!updated) return { kind: 'not_found' };

  // Recompute coach rating snapshot.
  const [coachRow] = await tx
    .select()
    .from(coaches)
    .where(eq(coaches.id, session.coachId))
    .limit(1);
  if (!coachRow) return { kind: 'not_found' };
  const oldAvg = coachRow.averageRating ?? 0;
  const oldCount = coachRow.ratingCount;
  const newCount = oldCount + 1;
  const newAverage = round2((oldAvg * oldCount + input.rating) / newCount);
  await tx
    .update(coaches)
    .set({ averageRating: newAverage, ratingCount: newCount })
    .where(eq(coaches.id, coachRow.id));

  return { session: updated, newAverage, newCount };
}
