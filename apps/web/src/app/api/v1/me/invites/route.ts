import { ok, serverError, unauthorized } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { listPendingInvitesForUser } from '@/lib/bookings/invites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const rows = await withRequestContext(session, (tx) =>
      listPendingInvitesForUser(tx, session.userId),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('me/invites:GET', err);
  }
}
