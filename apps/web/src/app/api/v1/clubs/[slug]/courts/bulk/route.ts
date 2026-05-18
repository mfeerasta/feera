import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
import {
  badRequest,
  created,
  forbidden,
  fromZodError,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string }>;
}

const bulkSchema = z.object({
  courts: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        surface: z.string().min(1).max(40).default('artificial_grass'),
        isIndoor: z.boolean().default(false),
        isClimateControlled: z.boolean().default(false),
        isPanoramic: z.boolean().default(false),
        courtDimensions: z.string().min(1).max(40).default('standard'),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.role !== 'club_staff') {
      return forbidden('Only platform admins or club staff may bulk create courts.');
    }
    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return { notFound: true as const };
      const rows = await tx
        .insert(courts)
        .values(parsed.data.courts.map((c) => ({ ...c, clubId: club.id })))
        .returning();
      return { notFound: false as const, rows };
    });
    if (result.notFound) return notFound(`Club "${slug}" not found.`);
    return created({ data: { courts: result.rows, count: result.rows.length } });
  } catch (err) {
    return serverError('clubs/[slug]/courts/bulk:POST', err);
  }
}
