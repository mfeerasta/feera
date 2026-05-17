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
import { joinRequestActionSchema } from '@/lib/api/booking-schemas';
import {
  approveJoin,
  cancelJoinRequest,
  declineJoin,
} from '@/lib/bookings/join-requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string; requestId: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, requestId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    const parsed = joinRequestActionSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const actor = {
      userId: session.userId,
      isAdmin: session.role === 'platform_admin',
    };

    const result = await withRequestContext(session, (tx) =>
      parsed.data.action === 'approve'
        ? approveJoin(tx, id, requestId, actor)
        : declineJoin(tx, id, requestId, actor),
    );

    if ('kind' in result) {
      switch (result.kind) {
        case 'booking_not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'request_not_found':
          return notFound(`Join request "${requestId}" not found.`);
        case 'forbidden':
          return forbidden('Only the organizer or club staff may act.');
        case 'wrong_status':
          return conflict('Join request is not pending.');
        case 'no_seats_available':
          return conflict('No open seats available.');
        default:
          return badRequest('Unable to update join request.');
      }
    }
    return ok({ data: result });
  } catch (err) {
    return serverError('bookings/[id]/join/[requestId]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, requestId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();

    const result = await withRequestContext(session, (tx) =>
      cancelJoinRequest(tx, id, requestId, session.userId),
    );

    if ('kind' in result) {
      switch (result.kind) {
        case 'request_not_found':
          return notFound(`Join request "${requestId}" not found.`);
        case 'forbidden':
          return forbidden('Only the requester may cancel their request.');
        case 'wrong_status':
          return conflict('Join request is not pending.');
        default:
          return badRequest('Unable to cancel join request.');
      }
    }
    return ok({ data: result.request });
  } catch (err) {
    return serverError('bookings/[id]/join/[requestId]:DELETE', err);
  }
}
