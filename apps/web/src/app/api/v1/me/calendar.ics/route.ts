import type { NextRequest } from 'next/server';
import { and, eq, gt, inArray, or } from 'drizzle-orm';
import {
  bookingParticipants,
  bookings,
  clubs,
  courts,
  db,
  users,
} from '@feera/db';
import {
  buildIcs,
  isValidCalendarFeedToken,
  type IcsBooking,
} from '@/lib/calendar/ics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function calendarSecret(): string {
  return (
    process.env.CALENDAR_FEED_SECRET ??
    process.env.AUTH_SECRET ??
    'feera-calendar-dev-only-fallback'
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user');
    const token = url.searchParams.get('token');

    if (!userId || !token) {
      return new Response('Missing user or token.', { status: 400 });
    }
    if (!isValidCalendarFeedToken(token, userId, calendarSecret())) {
      return new Response('Invalid or expired token.', { status: 401 });
    }

    const now = new Date();

    // Step 1: find ids of bookings the user organizes or attends.
    const organized = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizerUserId, userId),
          gt(bookings.startAt, now),
          inArray(bookings.status, ['confirmed', 'in_progress']),
        ),
      );

    const participating = await db
      .select({ id: bookings.id })
      .from(bookings)
      .innerJoin(
        bookingParticipants,
        eq(bookingParticipants.bookingId, bookings.id),
      )
      .where(
        and(
          eq(bookingParticipants.userId, userId),
          gt(bookings.startAt, now),
          inArray(bookings.status, ['confirmed', 'in_progress']),
        ),
      );

    const bookingIds = Array.from(
      new Set([...organized.map((r) => r.id), ...participating.map((r) => r.id)]),
    );

    if (bookingIds.length === 0) {
      return new Response(buildIcs([]), {
        status: 200,
        headers: {
          'content-type': 'text/calendar; charset=utf-8',
          'cache-control': 'private, max-age=300',
        },
      });
    }

    // Step 2: pull booking details + club + court + organizer in one query.
    const rows = await db
      .select({
        id: bookings.id,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        clubName: clubs.name,
        address: clubs.address,
        city: clubs.city,
        courtName: courts.name,
        organizerName: users.displayName,
      })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(clubs, eq(clubs.id, courts.clubId))
      .innerJoin(users, eq(users.id, bookings.organizerUserId))
      .where(inArray(bookings.id, bookingIds));

    // Step 3: collect participant display names per booking.
    const participantRows = await db
      .select({
        bookingId: bookingParticipants.bookingId,
        displayName: users.displayName,
      })
      .from(bookingParticipants)
      .innerJoin(users, eq(users.id, bookingParticipants.userId))
      .where(inArray(bookingParticipants.bookingId, bookingIds));

    const byBooking = new Map<string, string[]>();
    for (const p of participantRows) {
      const arr = byBooking.get(p.bookingId) ?? [];
      arr.push(p.displayName);
      byBooking.set(p.bookingId, arr);
    }

    const icsBookings: IcsBooking[] = rows.map((r) => ({
      id: r.id,
      startAt: r.startAt,
      endAt: r.endAt,
      clubName: r.clubName,
      courtName: r.courtName,
      address: r.address ?? r.city ?? null,
      organizerName: r.organizerName,
      participantNames: byBooking.get(r.id) ?? [],
    }));

    return new Response(buildIcs(icsBookings), {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'cache-control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('[calendar.ics] failed', err);
    return new Response('Internal error.', { status: 500 });
  }
}

// drizzle-orm `or` import is currently unused (kept for future filter combos).
void or;
