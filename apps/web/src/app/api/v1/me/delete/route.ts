import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { and, eq, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { users, userDeletionRequests } from '@feera/db';
import { sendMagicLinkEmail } from '@feera/auth';
import {
  badRequest,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRACE_DAYS = 7;

const reqSchema = z.union([
  z.object({ confirm: z.literal(false) }).strict(),
  z.object({ confirmationToken: z.string().min(32).max(128) }).strict(),
]);

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

async function sendConfirmation(email: string, token: string, willDeleteAt: Date) {
  const base = process.env.APP_URL ?? 'https://www.feera.ai';
  const url = `${base}/me/delete?token=${encodeURIComponent(token)}`;
  if (
    !process.env.RESEND_API_KEY &&
    (process.env.NODE_ENV !== 'production' || process.env.AUTH_DEV_OTP === '1')
  ) {
    console.log(
      `[me/delete:DEV] confirmation for ${email} -> ${url} (will purge ${willDeleteAt.toISOString()})`,
    );
    return;
  }
  await sendMagicLinkEmail({ email, url, token });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = reqSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const h = await headers();
    const ip =
      h.get('cf-connecting-ip') ??
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    const ua = h.get('user-agent');

    // Step 1: request deletion.
    if ('confirm' in parsed.data) {
      const token = newToken();
      const willDeleteAt = new Date(Date.now() + GRACE_DAYS * 86400_000);

      const { user, request } = await withRequestContext(session, async (tx) => {
        const [u] = await tx
          .select({ id: users.id, email: users.email, displayName: users.displayName })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);
        if (!u) return { user: null, request: null };

        const [row] = await tx
          .insert(userDeletionRequests)
          .values({
            userId: session.userId,
            confirmationToken: token,
            willDeleteAt,
            ip,
            userAgent: ua,
          })
          .returning({
            id: userDeletionRequests.id,
            willDeleteAt: userDeletionRequests.willDeleteAt,
            confirmationToken: userDeletionRequests.confirmationToken,
          });
        return { user: u, request: row };
      });

      if (!user || !request) return notFound('User not found.');
      if (user.email) {
        await sendConfirmation(user.email, request.confirmationToken, request.willDeleteAt);
      }

      return ok({
        data: {
          confirmationToken: request.confirmationToken,
          willDeleteAt: request.willDeleteAt,
          graceDays: GRACE_DAYS,
        },
      });
    }

    // Step 2: confirm deletion.
    const { confirmationToken } = parsed.data;
    const confirmed = await withRequestContext(session, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(userDeletionRequests)
        .set({ confirmedAt: now })
        .where(
          and(
            eq(userDeletionRequests.userId, session.userId),
            eq(userDeletionRequests.confirmationToken, confirmationToken),
            isNull(userDeletionRequests.purgedAt),
            gte(userDeletionRequests.willDeleteAt, now),
          ),
        )
        .returning({
          id: userDeletionRequests.id,
          confirmedAt: userDeletionRequests.confirmedAt,
          willDeleteAt: userDeletionRequests.willDeleteAt,
        });
      return row ?? null;
    });

    if (!confirmed) {
      return badRequest('Confirmation token invalid or expired.');
    }

    return ok({
      data: {
        confirmedAt: confirmed.confirmedAt,
        willDeleteAt: confirmed.willDeleteAt,
        message: 'Your account will be purged after the grace period. You can cancel by signing in and contacting support before then.',
      },
    });
  } catch (err) {
    return serverError('me/delete:POST', err);
  }
}
