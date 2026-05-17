import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  created,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  bookingCreateSchema,
  bookingListQuerySchema,
} from '@/lib/api/booking-schemas';
import { createBooking, listBookings } from '@/lib/bookings/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = bookingListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const session = await getSession();

    const rows = await withRequestContext(session, (tx) =>
      listBookings(tx, {
        organizerUserId: q.organizerUserId,
        courtId: q.courtId,
        status: q.status,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        limit: q.limit,
        offset: q.offset,
      }),
    );
    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('bookings:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = bookingCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const organizerUserId =
      parsed.data.organizerUserId && session.role === 'platform_admin'
        ? parsed.data.organizerUserId
        : session.userId;

    const result = await withRequestContext(session, (tx) =>
      createBooking(tx, organizerUserId, parsed.data),
    );

    if ('kind' in result) {
      switch (result.kind) {
        case 'court_not_found':
          return notFound('Court not found.');
        case 'court_inactive':
          return badRequest('Court is not active.');
        case 'organizer_not_found':
          return badRequest('Organizer user does not exist.');
        case 'conflict':
          return conflict('Court is already booked for this time window.');
        case 'invalid_window':
          return badRequest('endAt must be after startAt.');
      }
    }
    return created({
      data: result.booking,
      ...(result.priceWarning ? { priceWarning: result.priceWarning } : {}),
    });
  } catch (err) {
    return serverError('bookings:POST', err);
  }
}
