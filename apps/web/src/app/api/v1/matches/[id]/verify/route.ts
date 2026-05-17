import type { NextRequest } from 'next/server';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { verifyMatch } from '@/lib/matches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, (tx) =>
      verifyMatch(tx, id, session.userId, session.role === 'platform_admin'),
    );
    if ('kind' in result) {
      if (result.kind === 'not_found') return notFound(`Match "${id}" not found.`);
      if (result.kind === 'forbidden')
        return forbidden('Only a player from the opposing team may verify.');
      return badRequest('Verifier must be on the team opposite the recorder.');
    }
    return ok({ data: result.match });
  } catch (err) {
    return serverError('matches/[id]/verify:POST', err);
  }
}
