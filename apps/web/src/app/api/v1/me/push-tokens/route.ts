import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { pushTokens } from '@feera/db';
import {
  badRequest,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  token: z.string().min(8).max(500),
  platform: z.enum(['expo', 'ios', 'android', 'web']).default('expo'),
  deviceName: z.string().max(200).optional(),
  appVersion: z.string().max(40).optional(),
  locale: z.string().max(16).optional(),
});

const deleteSchema = z.object({
  token: z.string().min(8).max(500),
});

/**
 * POST /api/v1/me/push-tokens
 * Idempotent upsert for the caller's device push token.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const row = await withRequestContext(session, async (tx) => {
      const [r] = await tx
        .insert(pushTokens)
        .values({
          userId: session.userId,
          token: parsed.data.token,
          platform: parsed.data.platform,
          deviceName: parsed.data.deviceName,
          appVersion: parsed.data.appVersion,
          locale: parsed.data.locale,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pushTokens.userId, pushTokens.token],
          set: {
            platform: parsed.data.platform,
            deviceName: parsed.data.deviceName,
            appVersion: parsed.data.appVersion,
            locale: parsed.data.locale,
            lastSeenAt: new Date(),
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: pushTokens.id });
      return r;
    });

    return ok({ data: row });
  } catch (err) {
    return serverError('me:push-tokens:POST', err);
  }
}

/**
 * DELETE /api/v1/me/push-tokens
 * Body: { token }. Removes the token for the caller (sign-out, logout).
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    await withRequestContext(session, async (tx) => {
      await tx
        .delete(pushTokens)
        .where(
          and(eq(pushTokens.userId, session.userId), eq(pushTokens.token, parsed.data.token)),
        );
    });

    return ok({ data: { ok: true } });
  } catch (err) {
    return serverError('me:push-tokens:DELETE', err);
  }
}
