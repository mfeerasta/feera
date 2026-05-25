import type { NextRequest } from 'next/server';
import { desc } from 'drizzle-orm';
import { courtsFinancialScenarios } from '@feera/db';
import { badRequest, created, ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtsFinancialScenarios)
        .orderBy(desc(courtsFinancialScenarios.createdAt)),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/financials/scenarios:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const { name, assumptions, outputs } = body as Record<string, unknown>;
    if (!name || typeof name !== 'string') {
      return badRequest('name is required.');
    }
    if (!assumptions || typeof assumptions !== 'object') {
      return badRequest('assumptions object is required.');
    }
    if (!outputs || typeof outputs !== 'object') {
      return badRequest('outputs object is required.');
    }

    const [inserted] = await withRequestContext(session, (tx) =>
      tx
        .insert(courtsFinancialScenarios)
        .values({
          name,
          assumptions,
          outputs,
          createdBy: session?.userId ?? null,
        })
        .returning(),
    );

    return created({ data: inserted });
  } catch (err) {
    return serverError('courts/financials/scenarios:POST', err);
  }
}
