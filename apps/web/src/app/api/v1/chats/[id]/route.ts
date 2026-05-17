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
import { chatMarkReadSchema } from '@/lib/api/chat-schemas';
import { fetchChatThread, isChatMember, markChatRead } from '@/lib/chats/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id } = await ctx.params;
    const data = await withRequestContext(session, async (tx) => {
      const member = await isChatMember(tx, id, session.userId);
      if (!member && session.role !== 'platform_admin') return { forbidden: true as const };
      const thread = await fetchChatThread(tx, id);
      return { forbidden: false as const, thread };
    });
    if (data.forbidden) return forbidden('Not a member of this chat.');
    if (!data.thread) return notFound('Chat not found.');
    return ok({ data: data.thread });
  } catch (err) {
    return serverError('chats:[id]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = chatMarkReadSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id } = await ctx.params;
    const at = parsed.data.lastReadAt ? new Date(parsed.data.lastReadAt) : new Date();
    const result = await withRequestContext(session, async (tx) => {
      const member = await isChatMember(tx, id, session.userId);
      if (!member) return { forbidden: true as const };
      await markChatRead(tx, id, session.userId, at);
      return { forbidden: false as const };
    });
    if (result.forbidden) return forbidden('Not a member of this chat.');
    return ok({ data: { lastReadAt: at.toISOString() } });
  } catch (err) {
    return serverError('chats:[id]:PATCH', err);
  }
}
