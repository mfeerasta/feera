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
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { coachingSessionReviewSchema } from '@/lib/api/coach-schemas';
import { reviewCoachingSession } from '@/lib/coaches/service';

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
    const parsed = coachingSessionReviewSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      reviewCoachingSession(tx, id, session.userId, parsed.data),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'not_found':
          return notFound(`Session "${id}" not found.`);
        case 'forbidden':
          return forbidden('Only the learner may review this session.');
        case 'too_early':
          return badRequest('Reviews can be submitted only after the session start time.');
        case 'already_reviewed':
          return conflict('A review has already been submitted for this session.');
      }
    }
    return ok({
      data: {
        session: result.session,
        coachAverageRating: result.newAverage,
        coachRatingCount: result.newCount,
      },
    });
  } catch (err) {
    return serverError('coaching-sessions/[id]/review:POST', err);
  }
}
