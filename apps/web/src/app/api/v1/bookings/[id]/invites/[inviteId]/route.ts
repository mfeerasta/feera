import type { NextRequest } from 'next/server';
import { z } from 'zod';
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
import { cancelInvite, respondToInvite } from '@/lib/bookings/invites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

interface Ctx {
  params: Promise<{ id: string; inviteId: string }>;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      respondToInvite(tx, inviteId, session.userId, parsed.data.action),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Invite "${inviteId}" not found.`);
        case 'forbidden':
          return forbidden('Only the invitee may respond.');
        case 'invalid':
          return badRequest('This invite is no longer pending.');
        case 'capacity_reached':
          return conflict('Booking is already full.');
      }
    }
    return ok({ data: (result as { invite: unknown }).invite });
  } catch (err) {
    return serverError('bookings/[id]/invites/[inviteId]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, (tx) =>
      cancelInvite(tx, inviteId, session.userId),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Invite "${inviteId}" not found.`);
        case 'forbidden':
          return forbidden('Only the inviter or invitee may cancel.');
        case 'invalid':
          return badRequest('This invite is no longer pending.');
      }
    }
    return ok({ data: (result as { invite: unknown }).invite });
  } catch (err) {
    return serverError('bookings/[id]/invites/[inviteId]:DELETE', err);
  }
}
