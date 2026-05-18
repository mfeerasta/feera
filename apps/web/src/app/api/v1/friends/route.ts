import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  badRequest,
  created,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { listFriendships, sendFriendRequest } from '@/lib/friends/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sendSchema = z.object({
  addresseeUserId: z.string().uuid(),
  note: z.string().max(400).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const data = await withRequestContext(session, (tx) => listFriendships(tx, session.userId));
    return ok({ data });
  } catch (err) {
    return serverError('friends:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const result = await withRequestContext(session, (tx) =>
      sendFriendRequest(tx, session.userId, parsed.data.addresseeUserId, parsed.data.note),
    );
    if (result.kind === 'self_request') return badRequest('Cannot friend yourself.');
    if (result.kind === 'addressee_missing') return badRequest('Addressee user does not exist.');
    if (result.kind === 'blocked') return badRequest('Cannot send a request to this user.');
    return created({
      data: result.row,
      already: result.kind === 'exists',
      autoAccepted: result.kind === 'auto_accepted',
    });
  } catch (err) {
    return serverError('friends:POST', err);
  }
}
