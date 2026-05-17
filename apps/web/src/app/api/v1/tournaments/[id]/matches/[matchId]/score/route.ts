import type { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
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
import { tournamentMatchScoreSchema } from '@/lib/api/tournament-schemas';
import { submitTournamentMatchScore } from '@/lib/tournaments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string; matchId: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id, matchId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = tournamentMatchScoreSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      return submitTournamentMatchScore(
        tx,
        id,
        matchId,
        session.userId,
        session.role === 'platform_admin',
        parsed.data.sets,
      );
    });
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound('Tournament or match not found.');
        case 'forbidden':
          return forbidden('Only players in the match may submit a score.');
        case 'tie_not_allowed':
          return badRequest('A padel match cannot end in a tie.');
      }
    }
    return ok({
      data: {
        match: result.match,
        emittedMatches: result.emitted,
        tournamentComplete: result.complete,
      },
    });
  } catch (err) {
    return serverError('tournaments/[id]/matches/[matchId]/score:POST', err);
  }
}
