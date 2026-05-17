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
import { coachPatchSchema } from '@/lib/api/coach-schemas';
import { getCoachByUserId, patchCoach } from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ userId: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const session = await getSession();
    const isAdmin = session?.role === 'platform_admin';
    const isSelf = session?.userId === userId;
    const row = await withRequestContext(session, (tx) =>
      getCoachByUserId(tx, userId, { includePrivate: isAdmin || isSelf }),
    );
    if (!row) return notFound(`Coach profile for user "${userId}" not found.`);
    return ok({ data: row });
  } catch (err) {
    return serverError('coaches/[userId]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.userId !== userId && session.role !== 'platform_admin') {
      return forbidden('Only the coach themselves or a platform admin may edit this profile.');
    }
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = coachPatchSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const updated = await withRequestContext(session, (tx) =>
      patchCoach(tx, userId, parsed.data),
    );
    if (!updated) return notFound(`Coach profile for user "${userId}" not found.`);
    return ok({ data: updated });
  } catch (err) {
    return serverError('coaches/[userId]:PATCH', err);
  }
}
