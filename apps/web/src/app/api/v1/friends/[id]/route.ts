import type { NextRequest } from 'next/server';
import { z } from 'zod';
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
import { actOnFriendship } from '@/lib/friends/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  action: z.enum(['accept', 'decline', 'block', 'unblock']),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id } = await ctx.params;
    const result = await withRequestContext(session, (tx) =>
      actOnFriendship(tx, id, session.userId, parsed.data.action),
    );
    if (result.kind === 'not_found') return notFound('Friendship not found.');
    if (result.kind === 'forbidden') return forbidden('Not allowed.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('friends:[id]:PATCH', err);
  }
}
