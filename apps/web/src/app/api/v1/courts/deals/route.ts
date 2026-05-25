import type { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { courtsDeals } from '@feera/db';
import {
  badRequest,
  conflict,
  created,
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
        .from(courtsDeals)
        .where(eq(courtsDeals.archived, false))
        .orderBy(desc(courtsDeals.createdAt)),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/deals:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const { projectName, ...rest } = body as Record<string, unknown>;
    if (!projectName || typeof projectName !== 'string') {
      return badRequest('projectName is required.');
    }

    const slug = toSlug(projectName);

    const row = await withRequestContext(session, async (tx) => {
      const existing = await tx
        .select({ id: courtsDeals.id })
        .from(courtsDeals)
        .where(eq(courtsDeals.slug, slug))
        .limit(1);
      if (existing.length > 0) return { conflict: true as const };

      const [inserted] = await tx
        .insert(courtsDeals)
        .values({
          projectName,
          slug,
          stage: (rest.stage as string) ?? 'lead',
          city: (rest.city as string) ?? null,
          region: (rest.region as string) ?? null,
          country: (rest.country as string) ?? null,
          contactName: (rest.contactName as string) ?? null,
          contactEmail: (rest.contactEmail as string) ?? null,
          projectType: (rest.projectType as string) ?? null,
          plannedCourts: rest.plannedCourts != null ? Number(rest.plannedCourts) : null,
          projectedCapex: rest.projectedCapex != null ? Number(rest.projectedCapex) : null,
          expectedConsultingFee:
            rest.expectedConsultingFee != null ? Number(rest.expectedConsultingFee) : null,
          equityOption: Boolean(rest.equityOption),
          probability: rest.probability != null ? Number(rest.probability) : null,
          notesMd: (rest.notesMd as string) ?? null,
        })
        .returning();
      return { conflict: false as const, deal: inserted };
    });

    if (row.conflict) return conflict(`Slug "${slug}" already exists.`);
    return created({ data: row.deal });
  } catch (err) {
    return serverError('courts/deals:POST', err);
  }
}
