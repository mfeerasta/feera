import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import {
  courtsProjects,
  courtsDeals,
} from '@feera/db';
import {
  badRequest,
  created,
  notFound as notFoundResponse,
  ok,
  serverError,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtsProjects)
        .orderBy(desc(courtsProjects.createdAt)),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/projects:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const { dealId } = body as { dealId?: string };
    if (!dealId || typeof dealId !== 'string') {
      return badRequest('dealId is required.');
    }

    const row = await withRequestContext(session, async (tx) => {
      // Fetch the deal to copy data from
      const [deal] = await tx
        .select()
        .from(courtsDeals)
        .where(eq(courtsDeals.id, dealId))
        .limit(1);

      if (!deal) return { notFound: true as const };

      const slug = toSlug(deal.projectName);

      const [project] = await tx
        .insert(courtsProjects)
        .values({
          dealId: deal.id,
          projectName: deal.projectName,
          slug,
          city: deal.city,
          region: deal.region,
          country: deal.country,
          totalCapex: deal.projectedCapex,
          ourRole: deal.projectType,
          ourEquityPct: deal.equityPct,
          status: 'active',
        })
        .returning();

      return { notFound: false as const, project };
    });

    if (row.notFound) return notFoundResponse('Deal not found.');
    return created({ data: row.project });
  } catch (err) {
    return serverError('courts/projects:POST', err);
  }
}
