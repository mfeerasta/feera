import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { clubStaff, tournaments } from '@feera/db';
import {
  badRequest,
  conflict,
  created,
  forbidden,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  tournamentCreateSchema,
  tournamentListQuerySchema,
} from '@/lib/api/tournament-schemas';
import { listTournaments } from '@/lib/tournaments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = tournamentListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      listTournaments(tx, {
        clubId: q.club_id,
        status: q.status,
        format: q.format,
        countryCode: q.country_code,
        city: q.city,
        genderPreference: q.gender_preference,
        minLevel: q.min_level,
        maxLevel: q.max_level,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        limit: q.limit,
        offset: q.offset,
      }),
    );
    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('tournaments:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = tournamentCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    // Authorization: platform admin OR club staff for the named club.
    if (session.role !== 'platform_admin') {
      if (!parsed.data.clubId) {
        return forbidden('Only platform admins may create platform-hosted tournaments.');
      }
      const staff = await withRequestContext(session, (tx) =>
        tx
          .select({ id: clubStaff.id })
          .from(clubStaff)
          .where(eq(clubStaff.userId, session.userId))
          .limit(1),
      );
      if (staff.length === 0) {
        return forbidden('Only club staff may create tournaments for a club.');
      }
    }

    const inserted = await withRequestContext(session, async (tx) => {
      const dup = await tx
        .select({ id: tournaments.id })
        .from(tournaments)
        .where(eq(tournaments.slug, parsed.data.slug))
        .limit(1);
      if (dup.length > 0) return { conflict: true as const };
      const [row] = await tx
        .insert(tournaments)
        .values({
          ...parsed.data,
          startAt: new Date(parsed.data.startAt),
          endAt: new Date(parsed.data.endAt),
          registrationOpensAt: parsed.data.registrationOpensAt
            ? new Date(parsed.data.registrationOpensAt)
            : null,
          registrationClosesAt: parsed.data.registrationClosesAt
            ? new Date(parsed.data.registrationClosesAt)
            : null,
          organizerUserId: session.userId,
        })
        .returning();
      return { conflict: false as const, row };
    });
    if (inserted.conflict) return conflict(`Slug "${parsed.data.slug}" is already taken.`);
    return created({ data: inserted.row });
  } catch (err) {
    return serverError('tournaments:POST', err);
  }
}
