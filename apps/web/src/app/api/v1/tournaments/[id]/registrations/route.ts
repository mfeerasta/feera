import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { tournamentRegistrations } from '@feera/db';
import {
  badRequest,
  conflict,
  created,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { tournamentRegistrationCreateSchema } from '@/lib/api/tournament-schemas';
import { registerForTournament } from '@/lib/tournaments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, id)),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('tournaments/[id]/registrations:GET', err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = tournamentRegistrationCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      registerForTournament(
        tx,
        id,
        session.userId,
        parsed.data.partnerUserId,
        parsed.data.teamName,
      ),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Tournament "${id}" not found.`);
        case 'closed':
          return forbidden('Registration is not open for this tournament.');
        case 'duplicate':
          return conflict('You are already registered.');
        case 'full':
          return conflict('Tournament is full.');
        case 'pplp_requires_team':
          return badRequest('A franchise team name is required for PPLP tournaments.');
      }
    }
    return created({ data: result.registration });
  } catch (err) {
    return serverError('tournaments/[id]/registrations:POST', err);
  }
}
