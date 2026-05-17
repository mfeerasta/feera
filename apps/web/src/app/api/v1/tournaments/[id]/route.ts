import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { tournaments } from '@feera/db';
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
import { tournamentUpdateSchema } from '@/lib/api/tournament-schemas';
import { getNextMatches, getStandings } from '@/lib/tournaments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    const result = await withRequestContext(session, async (tx) => {
      const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
      if (!t) return null;
      const [standings, upcoming] = await Promise.all([
        getStandings(tx, id),
        getNextMatches(tx, id, 5),
      ]);
      return { tournament: t, standings, upcoming };
    });
    if (!result) return notFound(`Tournament "${id}" not found.`);
    return ok({ data: result });
  } catch (err) {
    return serverError('tournaments/[id]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = tournamentUpdateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
      if (!t) return { kind: 'not_found' as const };
      if (session.role !== 'platform_admin' && t.organizerUserId !== session.userId) {
        return { kind: 'forbidden' as const };
      }
      const patch = parsed.data;
      const [updated] = await tx
        .update(tournaments)
        .set({
          ...patch,
          startAt: patch.startAt ? new Date(patch.startAt) : undefined,
          endAt: patch.endAt ? new Date(patch.endAt) : undefined,
          registrationOpensAt: patch.registrationOpensAt
            ? new Date(patch.registrationOpensAt)
            : undefined,
          registrationClosesAt: patch.registrationClosesAt
            ? new Date(patch.registrationClosesAt)
            : undefined,
        })
        .where(eq(tournaments.id, id))
        .returning();
      return { kind: 'ok' as const, row: updated };
    });
    if (result.kind === 'not_found') return notFound(`Tournament "${id}" not found.`);
    if (result.kind === 'forbidden') return forbidden('Only the organizer or platform admin may edit.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('tournaments/[id]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, async (tx) => {
      const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
      if (!t) return { kind: 'not_found' as const };
      if (session.role !== 'platform_admin' && t.organizerUserId !== session.userId) {
        return { kind: 'forbidden' as const };
      }
      await tx.update(tournaments).set({ status: 'cancelled' }).where(eq(tournaments.id, id));
      return { kind: 'ok' as const };
    });
    if (result.kind === 'not_found') return notFound(`Tournament "${id}" not found.`);
    if (result.kind === 'forbidden') return forbidden('Only the organizer may cancel.');
    return ok({ data: { id, status: 'cancelled' } });
  } catch (err) {
    return serverError('tournaments/[id]:DELETE', err);
  }
}
