import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
import {
  badRequest,
  created,
  forbidden,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const photoCreateSchema = z.object({
  kind: z.enum(['club-logo', 'court-photo']),
  url: z.string().url(),
  courtId: z.string().regex(UUID_RE).optional(),
});

const photoDeleteSchema = z.object({
  url: z.string().url(),
  courtId: z.string().regex(UUID_RE).optional(),
});

function gateStaff(role: string): boolean {
  return role === 'platform_admin' || role === 'club_staff';
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!gateStaff(session.role)) {
      return forbidden('Only platform admins or club staff may upload photos.');
    }

    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = photoCreateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const { kind, url, courtId } = parsed.data;
    if (kind === 'court-photo' && !courtId) {
      return badRequest('courtId is required for court-photo.');
    }

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return { notFound: true as const };

      if (kind === 'club-logo') {
        const [row] = await tx
          .update(clubs)
          .set({
            photos: sql`COALESCE(${clubs.photos}, '[]'::jsonb) || ${JSON.stringify([url])}::jsonb`,
          })
          .where(eq(clubs.id, club.id))
          .returning({ id: clubs.id, photos: clubs.photos });
        return { notFound: false as const, row };
      }

      const [court] = await tx
        .select({ id: courts.id })
        .from(courts)
        .where(and(eq(courts.id, courtId!), eq(courts.clubId, club.id)))
        .limit(1);
      if (!court) return { notFound: true as const };

      const [row] = await tx
        .update(courts)
        .set({
          photos: sql`COALESCE(${courts.photos}, '[]'::jsonb) || ${JSON.stringify([url])}::jsonb`,
        })
        .where(eq(courts.id, courtId!))
        .returning({ id: courts.id, photos: courts.photos });
      return { notFound: false as const, row };
    });

    if (result.notFound) return notFound('Club or court not found.');
    return created({ data: result.row });
  } catch (err) {
    return serverError('clubs/[slug]/photos:POST', err);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!gateStaff(session.role)) {
      return forbidden('Only platform admins or club staff may delete photos.');
    }

    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = photoDeleteSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const { url, courtId } = parsed.data;

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id, photos: clubs.photos })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return { notFound: true as const };

      if (courtId) {
        const [court] = await tx
          .select({ id: courts.id, photos: courts.photos })
          .from(courts)
          .where(and(eq(courts.id, courtId), eq(courts.clubId, club.id)))
          .limit(1);
        if (!court) return { notFound: true as const };
        const filtered = (court.photos as string[]).filter((p) => p !== url);
        const [row] = await tx
          .update(courts)
          .set({ photos: filtered })
          .where(eq(courts.id, courtId))
          .returning({ id: courts.id, photos: courts.photos });
        return { notFound: false as const, row };
      }

      const filtered = (club.photos as string[]).filter((p) => p !== url);
      const [row] = await tx
        .update(clubs)
        .set({ photos: filtered })
        .where(eq(clubs.id, club.id))
        .returning({ id: clubs.id, photos: clubs.photos });
      return { notFound: false as const, row };
    });

    if (result.notFound) return notFound('Club or court not found.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('clubs/[slug]/photos:DELETE', err);
  }
}

// PUT - reorder photos: { kind, photos: string[], courtId? }
const photoReorderSchema = z.object({
  kind: z.enum(['club-logo', 'court-photo']),
  photos: z.array(z.string().url()),
  courtId: z.string().regex(UUID_RE).optional(),
});

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!gateStaff(session.role)) {
      return forbidden('Only platform admins or club staff may reorder photos.');
    }
    const { slug } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = photoReorderSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const { kind, photos, courtId } = parsed.data;
    if (kind === 'court-photo' && !courtId) return badRequest('courtId required.');

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return { notFound: true as const };
      if (kind === 'club-logo') {
        const [row] = await tx
          .update(clubs)
          .set({ photos })
          .where(eq(clubs.id, club.id))
          .returning({ id: clubs.id, photos: clubs.photos });
        return { notFound: false as const, row };
      }
      const [row] = await tx
        .update(courts)
        .set({ photos })
        .where(and(eq(courts.id, courtId!), eq(courts.clubId, club.id)))
        .returning({ id: courts.id, photos: courts.photos });
      if (!row) return { notFound: true as const };
      return { notFound: false as const, row };
    });
    if (result.notFound) return notFound('Club or court not found.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('clubs/[slug]/photos:PUT', err);
  }
}
