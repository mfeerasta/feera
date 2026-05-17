import type { NextRequest } from 'next/server';
import {
  badRequest,
  created,
  forbidden,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  chatMessageCreateSchema,
  chatMessageListQuerySchema,
} from '@/lib/api/chat-schemas';
import { isChatMember, listMessages, sendMessage } from '@/lib/chats/service';
import { channelFor, triggerEvent } from '@/lib/realtime/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const parsed = chatMessageListQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) return fromZodError(parsed.error);
    const { id } = await ctx.params;
    const result = await withRequestContext(session, async (tx) => {
      const member = await isChatMember(tx, id, session.userId);
      if (!member && session.role !== 'platform_admin') return { forbidden: true as const };
      const data = await listMessages(tx, id, {
        limit: parsed.data.limit,
        before: parsed.data.before ? new Date(parsed.data.before) : undefined,
      });
      return { forbidden: false as const, data };
    });
    if (result.forbidden) return forbidden('Not a member of this chat.');
    return ok({ data: result.data, limit: parsed.data.limit });
  } catch (err) {
    return serverError('chats:messages:GET', err);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = chatMessageCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    if (!parsed.data.body && parsed.data.attachments.length === 0) {
      return badRequest('A message needs body text or at least one attachment.');
    }
    const { id } = await ctx.params;
    const result = await withRequestContext(session, async (tx) => {
      const member = await isChatMember(tx, id, session.userId);
      if (!member) return { forbidden: true as const };
      const msg = await sendMessage(tx, id, session.userId, parsed.data);
      return { forbidden: false as const, msg };
    });
    if (result.forbidden) return forbidden('Not a member of this chat.');
    void triggerEvent(channelFor.chat(id), 'message.new', {
      id: result.msg.id,
      chatId: id,
      senderUserId: session.userId,
      body: result.msg.body ?? null,
      attachments: result.msg.attachments ?? [],
      createdAt: result.msg.createdAt,
    });
    return created({ data: result.msg });
  } catch (err) {
    return serverError('chats:messages:POST', err);
  }
}
