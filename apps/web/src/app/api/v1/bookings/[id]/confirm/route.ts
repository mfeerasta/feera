import type { NextRequest } from 'next/server';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { confirmBooking } from '@/lib/bookings/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, (tx) =>
      confirmBooking(tx, id, session.userId, session.role === 'platform_admin'),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the organizer may confirm.');
        case 'wrong_status':
          return badRequest('Booking is not in a confirmable state.');
        case 'not_ready':
          return badRequest(
            'All participants must have accepted and the organizer must have paid before confirming.',
          );
      }
    }
    return ok({ data: result.booking });
  } catch (err) {
    return serverError('bookings/[id]/confirm:POST', err);
  }
}
