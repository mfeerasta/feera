import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, gt, gte, lte, sql, type SQL } from 'drizzle-orm';
import { bookings, clubs, courts, users } from '@feera/db';
import {
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isoDateTime = z
  .string()
  .min(10)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'ISO datetime expected');

const querySchema = z.object({
  city: z.string().min(1).max(80).optional(),
  countryCode: z.string().length(2).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  minLevel: z.coerce.number().min(0).max(7).optional(),
  maxLevel: z.coerce.number().min(0).max(7).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * GET /api/v1/bookings/open
 * Public-ish feed of open-match bookings with seats available. Auth required.
 * Separate from /api/v1/matches/discover (rating-based partner finder).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const now = q.from ? new Date(q.from) : new Date();
    const filters: SQL[] = [
      eq(bookings.isOpenMatch, true),
      gt(bookings.startAt, now),
      gt(
        sql<number>`(${bookings.maxParticipants} - ${bookings.seatsBooked})`,
        0,
      ),
    ];
    if (q.to) filters.push(lte(bookings.startAt, new Date(q.to)));
    if (q.city) filters.push(eq(clubs.city, q.city));
    if (q.countryCode) filters.push(eq(clubs.countryCode, q.countryCode));
    if (q.minLevel != null) {
      // organizer-allowed level range overlaps the requested floor.
      filters.push(gte(bookings.requiredLevelMax, q.minLevel));
    }
    if (q.maxLevel != null) {
      filters.push(lte(bookings.requiredLevelMin, q.maxLevel));
    }

    const rows = await withRequestContext(session, (tx) =>
      tx
        .select({
          bookingId: bookings.id,
          startAt: bookings.startAt,
          endAt: bookings.endAt,
          maxParticipants: bookings.maxParticipants,
          seatsBooked: bookings.seatsBooked,
          seatsOpen: sql<number>`(${bookings.maxParticipants} - ${bookings.seatsBooked})`,
          totalAmount: bookings.totalAmount,
          currency: bookings.currency,
          requiredLevelMin: bookings.requiredLevelMin,
          requiredLevelMax: bookings.requiredLevelMax,
          genderPreference: bookings.genderPreference,
          isEditionPriority: bookings.isEditionPriority,
          notes: bookings.notes,
          courtId: courts.id,
          courtName: courts.name,
          clubId: clubs.id,
          clubName: clubs.name,
          clubSlug: clubs.slug,
          clubCity: clubs.city,
          clubCountryCode: clubs.countryCode,
          organizerUserId: bookings.organizerUserId,
          organizerName: users.displayName,
        })
        .from(bookings)
        .innerJoin(courts, eq(courts.id, bookings.courtId))
        .innerJoin(clubs, eq(clubs.id, courts.clubId))
        .innerJoin(users, eq(users.id, bookings.organizerUserId))
        .where(and(...filters))
        .orderBy(desc(bookings.startAt))
        .limit(q.limit)
        .offset(q.offset),
    );

    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('bookings/open:GET', err);
  }
}
