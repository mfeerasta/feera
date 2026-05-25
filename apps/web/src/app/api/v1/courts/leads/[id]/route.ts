import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { courtsLeads } from '@feera/db';
import { badRequest, notFound, ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = [
  'new',
  'triaged',
  'call-booked',
  'qualified',
  'disqualified',
  'converted',
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const body = await req.json().catch(() => null);
    if (!body || typeof body.status !== 'string') {
      return badRequest('Body must include a valid "status" string.');
    }

    if (!VALID_STATUSES.includes(body.status)) {
      return badRequest(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }

    const [updated] = await withRequestContext(session, (tx) =>
      tx
        .update(courtsLeads)
        .set({ status: body.status })
        .where(eq(courtsLeads.id, id))
        .returning(),
    );

    if (!updated) return notFound('Lead not found.');

    return ok({ data: updated });
  } catch (err) {
    return serverError('courts/leads/[id]:PATCH', err);
  }
}
