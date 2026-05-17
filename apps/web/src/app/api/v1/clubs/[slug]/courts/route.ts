import type { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
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
import { courtCreateSchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const session = await getSession();

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return null;
      const rows = await tx.select().from(courts).where(eq(courts.clubId, club.id));
      return rows;
    });

    if (result === null) return notFound(`Club "${slug}" not found.`);
    return ok({ data: result });
  } catch (err) {
    return serverError('clubs/[slug]/courts:GET', err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.editionStatus !== 'active') {
      return forbidden('Only platform admins or club staff may create courts.');
    }

    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = courtCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return { notFound: true as const };
      const [court] = await tx
        .insert(courts)
        .values({ ...parsed.data, clubId: club.id })
        .returning();
      return { notFound: false as const, court };
    });

    if (result.notFound) return notFound(`Club "${slug}" not found.`);
    return created({ data: result.court });
  } catch (err) {
    return serverError('clubs/[slug]/courts:POST', err);
  }
}
