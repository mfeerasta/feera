import type { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
import {
  forbidden,
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

/**
 * POST /api/v1/clubs/{slug}/approve
 * Marks a pending club as approved and active. Platform-admin only.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin') {
      return forbidden('Only platform admins may approve clubs.');
    }

    const { slug } = await ctx.params;

    const updated = await withRequestContext(session, async (tx) => {
      const [row] = await tx
        .update(clubs)
        .set({ approvalStatus: 'approved', isActive: true })
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .returning();
      return row;
    });

    if (!updated) return notFound(`Club "${slug}" not found.`);

    // Structured event for ops log scrapers.
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        event: 'club.approved',
        slug,
        clubId: updated.id,
        actor: session.userId,
      }),
    );

    return ok({ data: updated });
  } catch (err) {
    return serverError('clubs/[slug]/approve:POST', err);
  }
}
