import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { courtClosures, courts } from '@feera/db';
import {
  badRequest,
  created,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const closureCreateSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().max(280).optional(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');
    const session = await getSession();

    const url = new URL(req.url);
    const fromStr = url.searchParams.get('from');
    const toStr = url.searchParams.get('to');
    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtClosures)
        .where(
          and(
            eq(courtClosures.courtId, id),
            or(
              and(gte(courtClosures.startAt, from), lte(courtClosures.startAt, to)),
              and(gte(courtClosures.endAt, from), lte(courtClosures.endAt, to)),
            ),
          ),
        )
        .orderBy(courtClosures.startAt),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/[id]/closures:GET', err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.role !== 'club_staff') {
      return forbidden('Only platform admins or club staff may create closures.');
    }

    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = closureCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [court] = await tx
        .select({ id: courts.id })
        .from(courts)
        .where(eq(courts.id, id))
        .limit(1);
      if (!court) return { notFound: true as const };
      const [row] = await tx
        .insert(courtClosures)
        .values({
          courtId: id,
          startAt: new Date(parsed.data.startAt),
          endAt: new Date(parsed.data.endAt),
          reason: parsed.data.reason,
          createdByUserId: session.userId,
        })
        .returning();
      return { notFound: false as const, row };
    });

    if (result.notFound) return notFound(`Court "${id}" not found.`);
    return created({ data: result.row });
  } catch (err) {
    return serverError('courts/[id]/closures:POST', err);
  }
}
