import type { NextRequest } from 'next/server';
import { and, eq, isNull, type SQL } from 'drizzle-orm';
import { clubs } from '@feera/db';
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
import { clubCreateSchema, clubListQuerySchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = clubListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const session = await getSession();

    const filters: SQL[] = [isNull(clubs.deletedAt)];
    if (q.country_code) filters.push(eq(clubs.countryCode, q.country_code));
    if (q.city) filters.push(eq(clubs.city, q.city));
    if (q.has_women_only_hours !== undefined)
      filters.push(eq(clubs.hasWomenOnlyHours, q.has_women_only_hours));
    if (q.has_indoor !== undefined) filters.push(eq(clubs.hasIndoor, q.has_indoor));

    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(clubs)
        .where(and(...filters))
        .limit(q.limit)
        .offset(q.offset),
    );

    return ok({ data: rows, limit: q.limit, offset: q.offset });
  } catch (err) {
    return serverError('clubs:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.editionStatus !== 'active') {
      return forbidden('Only platform admins or active edition staff may create clubs.');
    }

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = clubCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const row = await withRequestContext(session, async (tx) => {
      const existing = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.slug, parsed.data.slug))
        .limit(1);
      if (existing.length > 0) return { conflict: true as const };
      const [inserted] = await tx.insert(clubs).values(parsed.data).returning();
      return { conflict: false as const, club: inserted };
    });

    if (row.conflict) return conflict(`Slug "${parsed.data.slug}" is already taken.`);
    return created({ data: row.club });
  } catch (err) {
    return serverError('clubs:POST', err);
  }
}
