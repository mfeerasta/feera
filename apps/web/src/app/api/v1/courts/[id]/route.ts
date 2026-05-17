import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { courts } from '@feera/db';
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
import { courtUpdateSchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');
    const session = await getSession();

    const [court] = await withRequestContext(session, (tx) =>
      tx.select().from(courts).where(eq(courts.id, id)).limit(1),
    );
    if (!court) return notFound(`Court "${id}" not found.`);
    return ok({ data: court });
  } catch (err) {
    return serverError('courts/[id]:GET', err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.editionStatus !== 'active') {
      return forbidden('Only platform admins or club staff may update courts.');
    }

    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = courtUpdateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const [updated] = await withRequestContext(session, (tx) =>
      tx.update(courts).set(parsed.data).where(eq(courts.id, id)).returning(),
    );
    if (!updated) return notFound(`Court "${id}" not found.`);
    return ok({ data: updated });
  } catch (err) {
    return serverError('courts/[id]:PATCH', err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== 'platform_admin' && session.editionStatus !== 'active') {
      return forbidden('Only platform admins or club staff may delete courts.');
    }

    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return badRequest('Court id must be a UUID.');

    const [deleted] = await withRequestContext(session, (tx) =>
      tx.delete(courts).where(eq(courts.id, id)).returning({ id: courts.id }),
    );
    if (!deleted) return notFound(`Court "${id}" not found.`);
    return ok({ data: { id: deleted.id, deleted: true } });
  } catch (err) {
    return serverError('courts/[id]:DELETE', err);
  }
}
