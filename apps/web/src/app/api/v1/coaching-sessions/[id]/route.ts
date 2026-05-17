import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { eq } from 'drizzle-orm';
import { coaches, coachingSessions } from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { coachingSessionPatchSchema } from '@/lib/api/coach-schemas';
import {
  cancelCoachingSession,
  getCoachingSession,
} from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const row = await withRequestContext(session, (tx) => getCoachingSession(tx, id));
    if (!row) return notFound(`Session "${id}" not found.`);

    const isAdmin = session.role === 'platform_admin' || session.role === 'club_staff';
    if (!isAdmin) {
      // Confirm the viewer is either the learner or the coach.
      const isLearner = row.learnerUserId === session.userId;
      if (!isLearner) {
        const coach = await withRequestContext(session, (tx) =>
          tx.select({ userId: coaches.userId }).from(coaches).where(eq(coaches.id, row.coachId)).limit(1),
        );
        if (coach[0]?.userId !== session.userId) {
          return forbidden('You may only view your own sessions.');
        }
      }
    }
    return ok({ data: row });
  } catch (err) {
    return serverError('coaching-sessions/[id]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = coachingSessionPatchSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const row = await getCoachingSession(tx, id);
      if (!row) return { kind: 'not_found' as const };
      const [coach] = await tx
        .select({ userId: coaches.userId })
        .from(coaches)
        .where(eq(coaches.id, row.coachId))
        .limit(1);
      const isAdmin = session.role === 'platform_admin';
      const isOwner =
        row.learnerUserId === session.userId ||
        coach?.userId === session.userId ||
        isAdmin;
      if (!isOwner) return { kind: 'forbidden' as const };
      if (row.status === 'cancelled' || row.status === 'completed') {
        return { kind: 'too_late' as const };
      }

      const next: Record<string, unknown> = {};
      if (parsed.data.notes !== undefined) next.notes = parsed.data.notes;
      if (parsed.data.startAt) {
        const newStart = new Date(parsed.data.startAt);
        const newDuration =
          parsed.data.durationMinutes ??
          Math.round(
            (new Date(row.endAt).getTime() - new Date(row.startAt).getTime()) / 60_000,
          );
        const newEnd = new Date(newStart.getTime() + newDuration * 60_000);
        // 24h reschedule window.
        const windowMs = 24 * 60 * 60_000;
        if (new Date(row.startAt).getTime() - Date.now() < windowMs && !isAdmin) {
          return { kind: 'too_late' as const };
        }
        next.startAt = newStart;
        next.endAt = newEnd;
      } else if (parsed.data.durationMinutes) {
        const newEnd = new Date(
          new Date(row.startAt).getTime() + parsed.data.durationMinutes * 60_000,
        );
        next.endAt = newEnd;
      }
      const [updated] = await tx
        .update(coachingSessions)
        .set(next)
        .where(eq(coachingSessions.id, id))
        .returning();
      return { kind: 'ok' as const, session: updated! };
    });

    if (result.kind === 'not_found') return notFound(`Session "${id}" not found.`);
    if (result.kind === 'forbidden') {
      return forbidden('Only the coach, the learner, or a platform admin may update this session.');
    }
    if (result.kind === 'too_late') {
      return conflict('Cannot change a session within 24 hours of the start time.');
    }
    return ok({ data: result.session });
  } catch (err) {
    return serverError('coaching-sessions/[id]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const result = await withRequestContext(session, (tx) =>
      cancelCoachingSession(tx, id, session.userId, session.role === 'platform_admin'),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Session "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the coach, the learner, or a platform admin may cancel this session.');
        case 'too_late':
          return conflict('Cannot cancel within 24 hours of the session start. Contact support for an exception.');
        case 'already_cancelled':
          return ok({ data: { id, status: 'cancelled' } });
      }
    }
    return ok({ data: result.session });
  } catch (err) {
    return serverError('coaching-sessions/[id]:DELETE', err);
  }
}
