import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  badRequest,
  created,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { sendInvites } from '@/lib/bookings/invites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inviteSchema = z.object({
  inviteeUserIds: z.array(z.string().uuid()).min(1).max(20),
  message: z.string().max(500).optional(),
});

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
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      sendInvites(
        tx,
        id,
        session.userId,
        parsed.data.inviteeUserIds,
        parsed.data.message ?? null,
      ),
    );

    if ('kind' in result) {
      switch (result.kind) {
        case 'booking_not_found':
          return notFound(`Booking "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the booking organizer may invite players.');
        case 'no_invitees':
        case 'invalid_invitee':
          return badRequest('At least one valid invitee required.');
      }
    }
    return created({ data: result });
  } catch (err) {
    return serverError('bookings/[id]/invites:POST', err);
  }
}
