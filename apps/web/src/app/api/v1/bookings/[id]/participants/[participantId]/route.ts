import type { NextRequest } from 'next/server';
import {
  badRequest,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { participantRsvpSchema } from '@/lib/api/booking-schemas';
import {
  removeParticipant,
  rsvpParticipant,
} from '@/lib/bookings/participants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string; participantId: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, participantId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = participantRsvpSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      rsvpParticipant(
        tx,
        id,
        participantId,
        session.userId,
        session.role === 'platform_admin',
        parsed.data.status,
      ),
    );
    if ('kind' in result) {
      if (result.kind === 'participant_not_found')
        return notFound('Participant not found.');
      if (result.kind === 'forbidden')
        return forbidden('Only the participant or an admin may RSVP.');
      return notFound('Booking not found.');
    }
    return ok({ data: result.row });
  } catch (err) {
    return serverError('bookings/[id]/participants/[participantId]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, participantId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, (tx) =>
      removeParticipant(
        tx,
        id,
        participantId,
        session.userId,
        session.role === 'platform_admin',
      ),
    );
    if ('kind' in result) {
      if (result.kind === 'participant_not_found')
        return notFound('Participant not found.');
      if (result.kind === 'forbidden')
        return forbidden('Only the organizer may remove participants.');
      return notFound('Booking not found.');
    }
    return ok({ data: result.row });
  } catch (err) {
    return serverError('bookings/[id]/participants/[participantId]:DELETE', err);
  }
}
