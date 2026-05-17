import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  created,
  forbidden,
  fromZodError,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { joinRequestCreateSchema } from '@/lib/api/booking-schemas';
import { requestJoin } from '@/lib/bookings/join-requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = joinRequestCreateSchema.safeParse(body ?? {});
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      requestJoin(tx, {
        bookingId: id,
        requesterUserId: session.userId,
        seatsRequested: parsed.data.seatsRequested,
        message: parsed.data.message,
      }),
    );

    if ('kind' in result) {
      switch (result.kind) {
        case 'booking_not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'not_open_match':
          return badRequest('Booking is not an open match.');
        case 'booking_started':
          return badRequest('Booking has already started.');
        case 'no_seats_available':
          return conflict('No open seats available.');
        case 'already_participant':
          return conflict('You are already a participant on this booking.');
        case 'duplicate_request':
          return conflict('You already have a pending join request.');
        case 'forbidden':
          return forbidden();
        default:
          return badRequest('Unable to create join request.');
      }
    }
    return created({ data: result.row });
  } catch (err) {
    return serverError('bookings/[id]/join:POST', err);
  }
}
