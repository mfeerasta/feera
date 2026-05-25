import { desc } from 'drizzle-orm';
import { courtsLeads } from '@feera/db';
import { ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtsLeads)
        .orderBy(desc(courtsLeads.createdAt)),
    );

    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/leads:GET', err);
  }
}
