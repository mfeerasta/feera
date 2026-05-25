import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  courtsProjects,
  courtsDeals,
  courtsProjectMilestones,
  courtsProjectDocuments,
  courtsHardwareOrders,
  courtsProjectFinancials,
  courtsPortfolioPositions,
  courtsActivityLog,
} from '@feera/db';
import {
  badRequest,
  notFound as notFoundResponse,
  ok,
  serverError,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { slug } = await ctx.params;
    const session = await getSession();

    const result = await withRequestContext(session, async (tx) => {
      const [project] = await tx
        .select()
        .from(courtsProjects)
        .where(eq(courtsProjects.slug, slug))
        .limit(1);

      if (!project) return null;

      // Fetch related deal for contact info
      let deal = null;
      if (project.dealId) {
        const [d] = await tx
          .select()
          .from(courtsDeals)
          .where(eq(courtsDeals.id, project.dealId))
          .limit(1);
        deal = d ?? null;
      }

      const milestones = await tx
        .select()
        .from(courtsProjectMilestones)
        .where(eq(courtsProjectMilestones.projectId, project.id));

      const documents = await tx
        .select()
        .from(courtsProjectDocuments)
        .where(eq(courtsProjectDocuments.projectId, project.id));

      const hardwareOrders = await tx
        .select()
        .from(courtsHardwareOrders)
        .where(eq(courtsHardwareOrders.projectId, project.id));

      const financials = await tx
        .select()
        .from(courtsProjectFinancials)
        .where(eq(courtsProjectFinancials.projectId, project.id));

      const positions = await tx
        .select()
        .from(courtsPortfolioPositions)
        .where(eq(courtsPortfolioPositions.projectId, project.id));

      const activity = await tx
        .select()
        .from(courtsActivityLog)
        .where(eq(courtsActivityLog.projectId, project.id));

      return {
        ...project,
        deal,
        milestones,
        documents,
        hardwareOrders,
        financials,
        portfolioPositions: positions,
        activity,
      };
    });

    if (!result) return notFoundResponse('Project not found.');
    return ok({ data: result });
  } catch (err) {
    return serverError('courts/projects/[slug]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { slug } = await ctx.params;
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const allowedFields = [
      'projectName',
      'city',
      'region',
      'country',
      'totalCapex',
      'ourRole',
      'ourEquityPct',
      'ourPmFeePct',
      'openingDate',
      'status',
      'healthBudget',
      'healthSchedule',
      'healthScope',
      'healthDemand',
      'nextMilestone',
      'nextMilestoneDate',
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
        .update(courtsProjects)
        .set(updates)
        .where(eq(courtsProjects.slug, slug))
        .returning();
      return result;
    });

    if (rows.length === 0) return notFoundResponse('Project not found.');
    return ok({ data: rows[0] });
  } catch (err) {
    return serverError('courts/projects/[slug]:PATCH', err);
  }
}
