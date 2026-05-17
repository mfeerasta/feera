import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { matches } from '@feera/db';
import { notFound, ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    const row = await withRequestContext(session, async (tx) => {
      const [m] = await tx.select().from(matches).where(eq(matches.id, id)).limit(1);
      return m ?? null;
    });
    if (!row) return notFound(`Match "${id}" not found.`);
    return ok({ data: row });
  } catch (err) {
    return serverError('matches/[id]:GET', err);
  }
}
