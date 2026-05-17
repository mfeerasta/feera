import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  created,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { participantInviteSchema } from '@/lib/api/booking-schemas';
import { inviteParticipant } from '@/lib/bookings/participants';

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
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = participantInviteSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      inviteParticipant(
        tx,
        id,
        session.userId,
        session.role === 'platform_admin',
        parsed.data.userId,
      ),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'booking_not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the organizer may invite participants.');
        case 'already_invited':
          return conflict('User is already a participant.');
        case 'capacity_reached':
          return conflict('Booking is at capacity.');
        case 'participant_not_found':
          return notFound('Participant not found.');
      }
    }
    return created({ data: result.row });
  } catch (err) {
    return serverError('bookings/[id]/participants:POST', err);
  }
}

// Booting a participant by userId is delegated to the participantId DELETE path.
// We keep this DELETE here for organizer convenience: pass ?userId=... to find
// + remove without needing the participant row id first.
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return badRequest('Query param `userId` is required.');

    const { and, eq } = await import('drizzle-orm');
    const { bookingParticipants, bookings } = await import('@feera/db');

    const result = await withRequestContext(session, async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);
      if (!booking) return { kind: 'not_found' as const };
      if (
        session.role !== 'platform_admin' &&
        booking.organizerUserId !== session.userId
      ) {
        return { kind: 'forbidden' as const };
      }
      const [row] = await tx
        .update(bookingParticipants)
        .set({ status: 'removed' })
        .where(
          and(
            eq(bookingParticipants.bookingId, id),
            eq(bookingParticipants.userId, userId),
          ),
        )
        .returning();
      if (!row) return { kind: 'participant_not_found' as const };
      return { row };
    });

    if ('kind' in result) {
      if (result.kind === 'not_found') return notFound('Booking not found.');
      if (result.kind === 'forbidden')
        return forbidden('Only the organizer may remove participants.');
      return notFound('Participant not found.');
    }
    return ok({ data: result.row });
  } catch (err) {
    return serverError('bookings/[id]/participants:DELETE', err);
  }
}
