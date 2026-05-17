import type { NextRequest } from 'next/server';
import {
  badRequest,
  created,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  chatCreateSchema,
  chatListQuerySchema,
} from '@/lib/api/chat-schemas';
import { createChat, listUserChats } from '@/lib/chats/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = chatListQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) return fromZodError(parsed.error);
    const data = await withRequestContext(session, (tx) =>
      listUserChats(tx, session.userId, parsed.data),
    );
    return ok({ data, limit: parsed.data.limit, offset: parsed.data.offset });
  } catch (err) {
    return serverError('chats:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = chatCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const result = await withRequestContext(session, (tx) =>
      createChat(tx, session.userId, parsed.data),
    );
    if (result.kind === 'invalid_members') {
      return badRequest('One or more member ids are invalid for this chat type.');
    }
    return created({ data: result.chat });
  } catch (err) {
    return serverError('chats:POST', err);
  }
}
