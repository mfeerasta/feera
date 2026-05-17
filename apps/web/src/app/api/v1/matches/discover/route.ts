import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { discoverOpenMatches } from '@/lib/matches/discover';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  radiusKm: z.coerce.number().positive().max(200).default(15),
  from: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'ISO datetime expected')
    .optional(),
  to: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'ISO datetime expected')
    .optional(),
  genderPreference: z.enum(['open', 'men_only', 'women_only', 'mixed']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const queryRaw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(queryRaw);
    if (!parsed.success) return fromZodError(parsed.error);
    const q = parsed.data;

    const now = new Date();
    const defaultTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const data = await withRequestContext(session, (tx) =>
      discoverOpenMatches(tx, session.userId, {
        radiusKm: q.radiusKm,
        from: q.from ? new Date(q.from) : now,
        to: q.to ? new Date(q.to) : defaultTo,
        genderPreference: q.genderPreference,
      }),
    );

    return ok({ data });
  } catch (err) {
    return serverError('matches:discover', err);
  }
}
