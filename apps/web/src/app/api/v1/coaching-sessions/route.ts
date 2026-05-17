import type { NextRequest } from 'next/server';
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
import {
  coachingSessionCreateSchema,
  coachingSessionListQuerySchema,
} from '@/lib/api/coach-schemas';
import {
  createCoachingSession,
  listCoachingSessions,
} from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = coachingSessionListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const session = await getSession();
    if (!session) return unauthorized();
    const isAdmin = session.role === 'platform_admin';
    const isClubStaff = session.role === 'club_staff';
    // Visibility: admin and club_staff can see all. Everyone else only their own.
    if (!isAdmin && !isClubStaff) {
      if (q.learnerUserId && q.learnerUserId !== session.userId) {
        return forbidden('You can only list your own sessions.');
      }
    }
    const rows = await withRequestContext(session, (tx) =>
      listCoachingSessions(tx, session.userId, isAdmin || isClubStaff, {
        coachUserId: q.coachUserId,
        learnerUserId: q.learnerUserId,
        status: q.status,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        limit: q.limit,
        offset: q.offset,
      }),
    );
    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('coaching-sessions:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = coachingSessionCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      createCoachingSession(tx, session.userId, parsed.data),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'coach_not_found':
          return notFound('Coach not found.');
        case 'coach_inactive':
          return badRequest('Coach is not accepting bookings right now.');
        case 'not_verified':
          return badRequest('Coach is not yet verified and cannot accept bookings.');
        case 'invalid_window':
          return badRequest('Session window is invalid.');
        case 'slot_unavailable':
          return conflict('This slot is no longer available.');
        case 'learner_not_found':
          return badRequest('Learner account not found.');
      }
    }
    return created({ data: result.session });
  } catch (err) {
    return serverError('coaching-sessions:POST', err);
  }
}
