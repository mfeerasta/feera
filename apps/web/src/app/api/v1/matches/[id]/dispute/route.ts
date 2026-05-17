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
import { matchDisputeSchema } from '@/lib/api/booking-schemas';
import { disputeMatch } from '@/lib/matches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = matchDisputeSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      disputeMatch(
        tx,
        id,
        session.userId,
        session.role === 'platform_admin',
        parsed.data.reason,
      ),
    );
    if ('kind' in result) {
      if (result.kind === 'not_found') return notFound(`Match "${id}" not found.`);
      return forbidden('Only a player in the match may dispute.');
    }
    return ok({ data: result.match });
  } catch (err) {
    return serverError('matches/[id]/dispute:POST', err);
  }
}
