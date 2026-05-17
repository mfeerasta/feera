import type { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { startTournament } from '@/lib/tournaments/service';
import { channelFor, triggerEvent } from '@/lib/realtime/server';

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

    const result = await withRequestContext(session, async (tx) => {
      // Bracket generation needs serializable isolation: two concurrent
      // starts would otherwise produce duplicate round rows.
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      return startTournament(tx, id, session.userId, session.role === 'platform_admin');
    });

    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Tournament "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the organizer or platform admin may start.');
        case 'bad_state':
          return badRequest('Tournament is not in a startable state.');
        case 'no_participants':
          return badRequest('At least two confirmed registrations required.');
      }
    }
    void triggerEvent(channelFor.tournament(id), 'tournament.started', {
      tournamentId: id,
      matchesCreated: result.matches.length,
      startedAt: new Date().toISOString(),
    });
    return ok({
      data: {
        tournament: result.tournament,
        matchesCreated: result.matches.length,
        matches: result.matches,
      },
    });
  } catch (err) {
    return serverError('tournaments/[id]/start:POST', err);
  }
}
