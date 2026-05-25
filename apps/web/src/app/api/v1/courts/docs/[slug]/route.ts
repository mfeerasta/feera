import type { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { courtsDocumentsLibrary } from '@feera/db';
import {
  badRequest,
  notFound,
  ok,
  serverError,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { slug } = await ctx.params;
    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtsDocumentsLibrary)
        .where(eq(courtsDocumentsLibrary.slug, slug))
        .limit(1),
    );
    if (rows.length === 0) return notFound(`Document "${slug}" not found.`);
    return ok({ data: rows[0] });
  } catch (err) {
    return serverError('courts/docs/[slug]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { slug } = await ctx.params;
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const { contentMd, title, category } = body as Record<string, unknown>;

    const rows = await withRequestContext(session, async (tx) => {
      const existing = await tx
        .select({ id: courtsDocumentsLibrary.id })
        .from(courtsDocumentsLibrary)
        .where(eq(courtsDocumentsLibrary.slug, slug))
        .limit(1);
      if (existing.length === 0) return null;

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        version: sql`${courtsDocumentsLibrary.version} + 1`,
      };
      if (typeof contentMd === 'string') updates.contentMd = contentMd;
      if (typeof title === 'string') updates.title = title;
      if (typeof category === 'string') updates.category = category;

      const [updated] = await tx
        .update(courtsDocumentsLibrary)
        .set(updates)
        .where(eq(courtsDocumentsLibrary.slug, slug))
        .returning();
      return updated;
    });

    if (rows === null) return notFound(`Document "${slug}" not found.`);
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/docs/[slug]:PATCH', err);
  }
}
