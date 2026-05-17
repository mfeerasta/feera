import type { NextRequest } from 'next/server';
import {
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { setVerificationFlag } from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ userId: string }>;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin') {
      return forbidden('Only platform admins may reject coach verifications.');
    }
    const updated = await withRequestContext(session, (tx) =>
      setVerificationFlag(tx, userId, false),
    );
    if (!updated) return notFound(`Coach profile for user "${userId}" not found.`);
    return ok({ data: updated, message: 'Coach verification rejected and removed from the marketplace.' });
  } catch (err) {
    return serverError('coaches/[userId]/reject:POST', err);
  }
}
