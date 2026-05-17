import type { NextRequest } from 'next/server';
import {
  badRequest,
  created,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { coachListQuerySchema, coachUpsertSchema } from '@/lib/api/coach-schemas';
import { listCoaches, upsertCoach } from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = coachListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      listCoaches(tx, {
        city: q.city,
        country: q.country,
        language: q.language,
        specialty: q.specialty,
        hourlyRateMax: q.hourlyRateMax,
        isVerified: q.isVerified,
        isEditionEndorsed: q.isEditionEndorsed,
        sort: q.sort,
        limit: q.limit,
        offset: q.offset,
      }),
    );
    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('coaches:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = coachUpsertSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, (tx) =>
      upsertCoach(tx, session.userId, parsed.data),
    );
    return created({
      data: result.coach,
      created: result.created,
      message: result.created
        ? 'Coach profile submitted. An admin will review verification within 48 hours.'
        : 'Coach profile updated.',
    });
  } catch (err) {
    return serverError('coaches:POST', err);
  }
}
