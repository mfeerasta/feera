import { desc, eq } from 'drizzle-orm';
import {
  courtsPortfolioPositions,
  courtsPortfolioDistributions,
  courtsProjects,
} from '@feera/db';
import { ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    const positions = await withRequestContext(session, (tx) =>
      tx
        .select({
          id: courtsPortfolioPositions.id,
          projectId: courtsPortfolioPositions.projectId,
          projectName: courtsProjects.projectName,
          city: courtsProjects.city,
          acquiredDate: courtsPortfolioPositions.acquiredDate,
          stakePct: courtsPortfolioPositions.stakePct,
          capitalInvested: courtsPortfolioPositions.capitalInvested,
          latestEbitda: courtsPortfolioPositions.latestEbitda,
          ebitdaAsOf: courtsPortfolioPositions.ebitdaAsOf,
          lifetimeDistributions: courtsPortfolioPositions.lifetimeDistributions,
          ytdDistributions: courtsPortfolioPositions.ytdDistributions,
          exitMultiple: courtsPortfolioPositions.exitMultiple,
          notes: courtsPortfolioPositions.notes,
        })
        .from(courtsPortfolioPositions)
        .leftJoin(
          courtsProjects,
          eq(courtsPortfolioPositions.projectId, courtsProjects.id),
        ),
    );

    const distributions = await withRequestContext(session, (tx) =>
      tx
        .select({
          id: courtsPortfolioDistributions.id,
          positionId: courtsPortfolioDistributions.positionId,
          projectName: courtsProjects.projectName,
          distributionDate: courtsPortfolioDistributions.distributionDate,
          amount: courtsPortfolioDistributions.amount,
          notes: courtsPortfolioDistributions.notes,
        })
        .from(courtsPortfolioDistributions)
        .leftJoin(
          courtsPortfolioPositions,
          eq(
            courtsPortfolioDistributions.positionId,
            courtsPortfolioPositions.id,
          ),
        )
        .leftJoin(
          courtsProjects,
          eq(courtsPortfolioPositions.projectId, courtsProjects.id),
        )
        .orderBy(desc(courtsPortfolioDistributions.distributionDate)),
    );

    const totalInvested = positions.reduce(
      (sum, p) => sum + (p.capitalInvested ?? 0),
      0,
    );

    const totalDistributions = positions.reduce(
      (sum, p) => sum + (p.lifetimeDistributions ?? 0),
      0,
    );

    const totalPaperEquity = positions.reduce((sum, p) => {
      const ebitda = p.latestEbitda ?? 0;
      const multiple = p.exitMultiple ?? 8.0;
      const stake = p.stakePct ?? 0;
      return sum + (ebitda * multiple * stake) / 100;
    }, 0);

    return ok({
      data: positions,
      stats: {
        totalInvested,
        totalDistributions,
        totalPaperEquity,
      },
      distributions,
    });
  } catch (err) {
    return serverError('courts/portfolio:GET', err);
  }
}
