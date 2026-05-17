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
import { matchScoreSchema } from '@/lib/api/booking-schemas';
import { submitMatchScore } from '@/lib/matches/service';

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
    const parsed = matchScoreSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      submitMatchScore(
        tx,
        id,
        session.userId,
        session.role === 'platform_admin',
        parsed.data.sets,
      ),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Match "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only players in the match may submit a score.');
        case 'tie_not_allowed':
          return badRequest('A padel match cannot end in a tie.');
      }
    }
    return ok({ data: { match: result.match, ratingChanges: result.ratingChanges } });
  } catch (err) {
    return serverError('matches/[id]/score:POST', err);
  }
}
