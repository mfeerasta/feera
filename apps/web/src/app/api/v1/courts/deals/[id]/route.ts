import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { courtsDeals } from '@feera/db';
import {
  badRequest,
  notFound,
  ok,
  serverError,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const allowedFields = [
      'projectName',
      'city',
      'region',
      'country',
      'stage',
      'contactName',
      'contactEmail',
      'projectType',
      'plannedCourts',
      'projectedCapex',
      'expectedConsultingFee',
      'equityOption',
      'probability',
      'notesMd',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid fields to update.');
    }

    const rows = await withRequestContext(session, async (tx) => {
      const result = await tx
        .update(courtsDeals)
        .set(updates)
        .where(eq(courtsDeals.id, id))
        .returning();
      return result;
    });

    if (rows.length === 0) return notFound('Deal not found.');
    return ok({ data: rows[0] });
  } catch (err) {
    return serverError('courts/deals/[id]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();

    const rows = await withRequestContext(session, async (tx) => {
      const result = await tx
        .update(courtsDeals)
        .set({ archived: true })
        .where(eq(courtsDeals.id, id))
        .returning({ id: courtsDeals.id });
      return result;
    });

    if (rows.length === 0) return notFound('Deal not found.');
    return ok({ ok: true });
  } catch (err) {
    return serverError('courts/deals/[id]:DELETE', err);
  }
}
