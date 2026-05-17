import type { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getStandings } from '@/lib/tournaments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    const standings = await withRequestContext(session, (tx) => getStandings(tx, id));
    if (standings === null) return notFound(`Tournament "${id}" not found.`);
    return ok({ data: standings });
  } catch (err) {
    return serverError('tournaments/[id]/standings:GET', err);
  }
}
