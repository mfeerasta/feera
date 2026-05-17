import type { NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { courtPricingRules, courts } from '@feera/db';
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
import { pricingRuleCreateSchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');
    const session = await getSession();

    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtPricingRules)
        .where(eq(courtPricingRules.courtId, id))
        .orderBy(asc(courtPricingRules.dayOfWeek), asc(courtPricingRules.startTime)),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/[id]/pricing:GET', err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.editionStatus !== 'active') {
      return forbidden('Only platform admins or club staff may set pricing.');
    }

    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = pricingRuleCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [court] = await tx.select({ id: courts.id }).from(courts).where(eq(courts.id, id)).limit(1);
      if (!court) return { notFound: true as const };
      const [rule] = await tx
        .insert(courtPricingRules)
        .values({ ...parsed.data, courtId: id })
        .returning();
      return { notFound: false as const, rule };
    });

    if (result.notFound) return notFound(`Court "${id}" not found.`);
    return created({ data: result.rule });
  } catch (err) {
    return serverError('courts/[id]/pricing:POST', err);
  }
}
