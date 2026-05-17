import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { bookings, clubStaff, courts } from '@feera/db';
import {
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { listJoinRequestsForBooking } from '@/lib/bookings/join-requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();

    const statusParam = req.nextUrl.searchParams.get('status');
    const allowedStatuses = [
      'pending',
      'approved',
      'declined',
      'cancelled',
      'expired',
    ] as const;
    const status =
      statusParam && (allowedStatuses as readonly string[]).includes(statusParam)
        ? (statusParam as (typeof allowedStatuses)[number])
        : undefined;

    const result = await withRequestContext(session, async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);
      if (!booking) return { kind: 'not_found' as const };

      const isAdmin = session.role === 'platform_admin';
      const isOrganizer = booking.organizerUserId === session.userId;

      let isStaff = false;
      if (!isAdmin && !isOrganizer) {
        const rows = await tx
          .select({ id: clubStaff.id })
          .from(clubStaff)
          .innerJoin(courts, eq(courts.clubId, clubStaff.clubId))
          .where(
            and(
              eq(courts.id, booking.courtId),
              eq(clubStaff.userId, session.userId),
              eq(clubStaff.isActive, true),
            ),
          )
          .limit(1);
        isStaff = rows.length > 0;
      }

      if (!isAdmin && !isOrganizer && !isStaff) {
        return { kind: 'forbidden' as const };
      }

      const data = await listJoinRequestsForBooking(tx, {
        bookingId: id,
        status,
      });
      return { data };
    });

    if ('kind' in result) {
      if (result.kind === 'not_found') return notFound(`Booking "${id}" not found.`);
      return forbidden('Only organizer or club staff may view join requests.');
    }
    return ok({ data: result.data });
  } catch (err) {
    return serverError('bookings/[id]/joins:GET', err);
  }
}
