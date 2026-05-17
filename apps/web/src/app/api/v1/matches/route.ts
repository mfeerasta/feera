import type { NextRequest } from 'next/server';
import {
  badRequest,
  created,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  matchCreateSchema,
  matchListQuerySchema,
} from '@/lib/api/booking-schemas';
import { createMatch, listMatches } from '@/lib/matches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = matchListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      listMatches(tx, {
        userId: q.userId,
        clubId: q.clubId,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        verificationStatus: q.verificationStatus,
        limit: q.limit,
        offset: q.offset,
      }),
    );
    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('matches:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = matchCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const ids = new Set([
      parsed.data.teamAPlayer1,
      parsed.data.teamAPlayer2,
      parsed.data.teamBPlayer1,
      parsed.data.teamBPlayer2,
    ]);
    if (ids.size !== 4) return badRequest('All four player ids must be distinct.');

    const result = await withRequestContext(session, (tx) =>
      createMatch(tx, session.userId, parsed.data),
    );
    if ('kind' in result) {
      switch (result.kind) {
        case 'booking_not_found':
          return notFound('Booking not found.');
        case 'booking_not_completed':
          return badRequest('Booking must be marked completed before recording a match.');
        case 'insufficient_participants':
          return badRequest(
            'All four players must be accepted participants on the booking.',
          );
        case 'forbidden':
          return badRequest('Forbidden.');
      }
    }
    return created({ data: result.match });
  } catch (err) {
    return serverError('matches:POST', err);
  }
}
