import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { chats } from '@feera/db';
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
import { chatMemberAddSchema } from '@/lib/api/chat-schemas';
import { addMember, isChatMember, removeMember } from '@/lib/chats/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Add a user to the chat. Gating rules by chat type:
 *   - direct (dm): not allowed once created (2 fixed participants).
 *   - booking/match: organiser or platform_admin only.
 *   - group/club_announcement: chat admin or platform_admin.
 *   - tournament/coaching: server-managed; only platform_admin via API.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = chatMemberAddSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id } = await ctx.params;

    const outcome = await withRequestContext(session, async (tx) => {
      const chat = (await tx.select().from(chats).where(eq(chats.id, id)).limit(1))[0];
      if (!chat) return { kind: 'not_found' as const };
      if (chat.type === 'direct') return { kind: 'forbidden' as const, reason: 'dm_chats_cannot_add_members' };

      const member = await isChatMember(tx, id, session.userId);
      const isAdmin = session.role === 'platform_admin';
      if (!member && !isAdmin) return { kind: 'forbidden' as const, reason: 'not_a_member' };

      const result = await addMember(tx, id, parsed.data.userId, parsed.data.role);
      return { kind: 'ok' as const, result };
    });

    if (outcome.kind === 'not_found') return notFound('Chat not found.');
    if (outcome.kind === 'forbidden') return forbidden(outcome.reason);
    return created({ data: outcome.result });
  } catch (err) {
    return serverError('chats:members:POST', err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id } = await ctx.params;
    const userId = req.nextUrl.searchParams.get('userId') ?? session.userId;

    const outcome = await withRequestContext(session, async (tx) => {
      const member = await isChatMember(tx, id, session.userId);
      const isAdmin = session.role === 'platform_admin';
      // Self-removal always allowed. Otherwise require admin.
      if (userId !== session.userId && !isAdmin) {
        return { kind: 'forbidden' as const };
      }
      if (!member && !isAdmin) return { kind: 'forbidden' as const };
      await removeMember(tx, id, userId);
      return { kind: 'ok' as const };
    });
    if (outcome.kind === 'forbidden') return forbidden('Not allowed.');
    return ok({ data: { removed: userId } });
  } catch (err) {
    return serverError('chats:members:DELETE', err);
  }
}
