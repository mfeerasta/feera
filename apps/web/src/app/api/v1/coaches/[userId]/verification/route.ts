import type { NextRequest } from 'next/server';
import {
  badRequest,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { verificationUploadSchema } from '@/lib/api/coach-schemas';
import {
  appendVerificationDocuments,
  getCoachByUserId,
} from '@/lib/coaches/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ userId: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.userId !== userId && session.role !== 'platform_admin') {
      return forbidden('Only the coach themselves or a platform admin may view verification status.');
    }
    const coach = await withRequestContext(session, (tx) =>
      getCoachByUserId(tx, userId, { includePrivate: true }),
    );
    if (!coach) return notFound('Coach profile not found.');
    return ok({
      data: {
        isVerifiedByFeera: coach.isVerifiedByFeera,
        isEditionEndorsed: coach.isEditionEndorsed,
        documents: coach.verificationDocuments ?? [],
      },
    });
  } catch (err) {
    return serverError('coaches/[userId]/verification:GET', err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { userId } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.userId !== userId && session.role !== 'platform_admin') {
      return forbidden('Only the coach themselves or a platform admin may upload verification documents.');
    }
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = verificationUploadSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const updated = await withRequestContext(session, (tx) =>
      appendVerificationDocuments(tx, userId, parsed.data.documents),
    );
    if (!updated) return notFound('Coach profile not found.');
    return ok({
      data: {
        documents: updated.verificationDocuments,
        message: 'Documents uploaded. An admin will review within 48 hours.',
      },
    });
  } catch (err) {
    return serverError('coaches/[userId]/verification:POST', err);
  }
}
