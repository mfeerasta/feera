import type { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { computeAvailabilityForCoach } from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const daysParam = req.nextUrl.searchParams.get('days');
    const requested = daysParam ? Number(daysParam) : 14;
    const days = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), 30)
      : 14;

    const session = await getSession();
    const slots = await withRequestContext(session, (tx) =>
      computeAvailabilityForCoach(tx, userId, days),
    );
    if (slots === null) return notFound(`Coach profile for user "${userId}" not found.`);
    return ok({
      data: slots.map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
      })),
      windowDays: days,
    });
  } catch (err) {
    return serverError('coaches/[userId]/availability:GET', err);
  }
}
