import type { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
import {
  badRequest,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { clubUpdateSchema } from '@/lib/api/schemas';

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
        .select()
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return null;
      const courtRows = await tx.select().from(courts).where(eq(courts.clubId, club.id));
      return { ...club, courts: courtRows };
    });

    if (!result) return notFound(`Club "${slug}" not found.`);
    return ok({ data: result });
  } catch (err) {
    return serverError('clubs/[slug]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = clubUpdateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    // TODO(auth): once club_staff table exists, check owner/manager role for
    // session.userId on this club. For now: platform_admin or active edition.
    if (session.role !== 'platform_admin' && session.editionStatus !== 'active') {
      return forbidden('Only platform admins or club owners may update clubs.');
    }

    const updated = await withRequestContext(session, async (tx) => {
      const [row] = await tx
        .update(clubs)
        .set(parsed.data)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .returning();
      return row;
    });

    if (!updated) return notFound(`Club "${slug}" not found.`);
    return ok({ data: updated });
  } catch (err) {
    return serverError('clubs/[slug]:PATCH', err);
  }
}
