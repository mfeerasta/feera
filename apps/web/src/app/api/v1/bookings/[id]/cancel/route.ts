import type { NextRequest } from 'next/server';
import {
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { cancelBooking } from '@/lib/bookings/service';

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
      cancelBooking(tx, id, session.userId, session.role === 'platform_admin'),
    );
    if ('kind' in result) {
      if (result.kind === 'not_found') return notFound(`Booking "${id}" not found.`);
      if (result.kind === 'forbidden')
        return forbidden('Only the organizer may cancel.');
      // already_cancelled -> idempotent ok
      return ok({ data: { id, status: 'cancelled' } });
    }
    // TODO(M3-C @feera/payments): subagent C extends @feera/payments with a
    // refund() method on PaymentProvider. Wire booking cancellation -> refund
    // here once it lands; pass booking.id as idempotency key.
    return ok({ data: result.booking });
  } catch (err) {
    return serverError('bookings/[id]/cancel:POST', err);
  }
}
