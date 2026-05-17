import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string }>;
}

const rejectSchema = z.object({
  reason: z.string().min(3).max(500),
});

/**
 * POST /api/v1/clubs/{slug}/reject
 * Marks a pending club as rejected. Platform-admin only. Body: { reason }.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin') {
      return forbidden('Only platform admins may reject clubs.');
    }

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const { slug } = await ctx.params;

    const updated = await withRequestContext(session, async (tx) => {
      const [row] = await tx
        .update(clubs)
        .set({ approvalStatus: 'rejected', isActive: false })
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .returning();
      return row;
    });

    if (!updated) return notFound(`Club "${slug}" not found.`);

    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        event: 'club.rejected',
        slug,
        clubId: updated.id,
        actor: session.userId,
        reason: parsed.data.reason,
      }),
    );

    return ok({ data: updated });
  } catch (err) {
    return serverError('clubs/[slug]/reject:POST', err);
  }
}
