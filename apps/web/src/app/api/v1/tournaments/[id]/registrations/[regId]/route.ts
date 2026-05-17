import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { tournamentRegistrations, tournaments } from '@feera/db';
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
import { tournamentRegistrationUpdateSchema } from '@/lib/api/tournament-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string; regId: string }>;
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, regId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, async (tx) => {
      const [reg] = await tx
        .select()
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.id, regId),
            eq(tournamentRegistrations.tournamentId, id),
          ),
        )
        .limit(1);
      if (!reg) return { kind: 'not_found' as const };
      if (reg.userId !== session.userId && session.role !== 'platform_admin') {
        return { kind: 'forbidden' as const };
      }
      const [updated] = await tx
        .update(tournamentRegistrations)
        .set({ status: 'withdrawn' })
        .where(eq(tournamentRegistrations.id, regId))
        .returning();
      return { kind: 'ok' as const, row: updated };
    });
    if (result.kind === 'not_found') return notFound('Registration not found.');
    if (result.kind === 'forbidden') return forbidden('Only the registrant may cancel.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('tournaments/[id]/registrations/[regId]:DELETE', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id, regId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = tournamentRegistrationUpdateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
      if (!t) return { kind: 'not_found' as const };
      if (session.role !== 'platform_admin' && t.organizerUserId !== session.userId) {
        return { kind: 'forbidden' as const };
      }
      const [updated] = await tx
        .update(tournamentRegistrations)
        .set({ status: parsed.data.status })
        .where(
          and(
            eq(tournamentRegistrations.id, regId),
            eq(tournamentRegistrations.tournamentId, id),
          ),
        )
        .returning();
      if (!updated) return { kind: 'not_found' as const };
      return { kind: 'ok' as const, row: updated };
    });
    if (result.kind === 'not_found') return notFound('Registration not found.');
    if (result.kind === 'forbidden') return forbidden('Only the organizer may confirm or waitlist.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('tournaments/[id]/registrations/[regId]:PATCH', err);
  }
}
