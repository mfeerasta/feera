import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { courtClosures } from '@feera/db';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string; closureId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.role !== 'club_staff') {
      return forbidden('Only platform admins or club staff may delete closures.');
    }
    const { id, closureId } = await ctx.params;
    if (!UUID_RE.test(id) || !UUID_RE.test(closureId)) {
      return badRequest('Ids must be UUIDs.');
    }

    const [deleted] = await withRequestContext(session, (tx) =>
      tx
        .delete(courtClosures)
        .where(and(eq(courtClosures.id, closureId), eq(courtClosures.courtId, id)))
        .returning({ id: courtClosures.id }),
    );
    if (!deleted) return notFound('Closure not found.');
    return ok({ data: { id: deleted.id, deleted: true } });
  } catch (err) {
    return serverError('courts/[id]/closures/[closureId]:DELETE', err);
  }
}
