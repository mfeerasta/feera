import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { clubMemberNotes, clubs } from '@feera/db';
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ slug: string; userId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const upsertSchema = z.object({
  isVip: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  notes: z.string().max(4000).nullish(),
});

function gateStaff(role: string): boolean {
  return role === 'platform_admin' || role === 'club_staff';
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!gateStaff(session.role)) return forbidden('Staff only.');

    const { slug, userId } = await ctx.params;
    if (!UUID_RE.test(userId)) return badRequest('User id must be a UUID.');
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await withRequestContext(session, async (tx) => {
      const [club] = await tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
        .limit(1);
      if (!club) return { notFound: true as const };

      const insertValues = {
        clubId: club.id,
        userId,
        isVip: parsed.data.isVip ?? false,
        isBanned: parsed.data.isBanned ?? false,
        notes: parsed.data.notes ?? null,
        lastUpdatedByUserId: session.userId,
      };
      const setValues: Record<string, unknown> = {
        lastUpdatedByUserId: session.userId,
        updatedAt: new Date(),
      };
      if (parsed.data.isVip !== undefined) setValues.isVip = parsed.data.isVip;
      if (parsed.data.isBanned !== undefined) setValues.isBanned = parsed.data.isBanned;
      if (parsed.data.notes !== undefined) setValues.notes = parsed.data.notes;

      const [row] = await tx
        .insert(clubMemberNotes)
        .values(insertValues)
        .onConflictDoUpdate({
          target: [clubMemberNotes.clubId, clubMemberNotes.userId],
          set: setValues,
        })
        .returning();
      return { notFound: false as const, row };
    });
    if (result.notFound) return notFound('Club not found.');
    return ok({ data: result.row });
  } catch (err) {
    return serverError('clubs/[slug]/members/[userId]/notes:PUT', err);
  }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!gateStaff(session.role)) return forbidden('Staff only.');
    const { slug, userId } = await ctx.params;
    if (!UUID_RE.test(userId)) return badRequest('User id must be a UUID.');
    const [row] = await withRequestContext(session, async (tx) =>
      tx
        .select()
        .from(clubMemberNotes)
        .where(
          and(
            eq(clubMemberNotes.userId, userId),
            sql`${clubMemberNotes.clubId} = (SELECT id FROM clubs WHERE slug = ${slug} LIMIT 1)`,
          ),
        )
        .limit(1),
    );
    return ok({ data: row ?? null });
  } catch (err) {
    return serverError('clubs/[slug]/members/[userId]/notes:GET', err);
  }
}
