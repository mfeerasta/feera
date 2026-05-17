import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { bookingUpdateSchema } from '@/lib/api/booking-schemas';
import {
  cancelBooking,
  getBookingWithParticipants,
  updateBooking,
} from '@/lib/bookings/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    const row = await withRequestContext(session, (tx) =>
      getBookingWithParticipants(tx, id),
    );
    if (!row) return notFound(`Booking "${id}" not found.`);
    return ok({ data: row });
  } catch (err) {
    return serverError('bookings/[id]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = bookingUpdateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      updateBooking(
        tx,
        id,
        session.userId,
        session.role === 'platform_admin',
        parsed.data,
      ),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the organizer or a platform admin may update.');
        case 'conflict':
          return conflict('Court is already booked for the new time window.');
        case 'cannot_change_after_start':
          return badRequest('Cannot change a booking that has already started.');
      }
    }
    return ok({ data: result.booking });
  } catch (err) {
    return serverError('bookings/[id]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, (tx) =>
      cancelBooking(tx, id, session.userId, session.role === 'platform_admin'),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the organizer or a platform admin may cancel.');
        case 'already_cancelled':
          return ok({ data: { id, status: 'cancelled' } });
      }
    }
    return ok({ data: result.booking });
  } catch (err) {
    return serverError('bookings/[id]:DELETE', err);
  }
}
