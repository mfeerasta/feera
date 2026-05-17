import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import {
  ALL_CONTENT_KINDS,
  aclForKind,
  bucketForKind,
  createPresignedReadUrl,
  getHetznerStorage,
  isPublicKind,
} from '@feera/storage';
import { clubStaff, clubs, coaches, courts, users } from '@feera/db';
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

const bodySchema = z.object({
  kind: z.enum(ALL_CONTENT_KINDS as [string, ...string[]]),
  key: z.string().min(1).max(1024),
  /** clubId, courtId, etc, depending on kind. */
  contextId: z.string().uuid().optional(),
  /** Optional metadata the client knows after PUT. */
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024).optional(),
  contentType: z.string().min(3).max(120).optional(),
});

type Kind = (typeof ALL_CONTENT_KINDS)[number];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const { kind, key, contextId, sizeBytes, contentType } = parsed.data as {
      kind: Kind;
      key: string;
      contextId?: string;
      sizeBytes?: number;
      contentType?: string;
    };
    const bucket = bucketForKind(kind);
    const provider = getHetznerStorage();

    // Verify the object actually landed in the bucket. Cheap HEAD prevents
    // clients claiming a key they never uploaded.
    let head: Awaited<ReturnType<typeof provider.head>>;
    try {
      head = await provider.head(bucket, key);
    } catch (err) {
      return badRequest('Object not found in bucket. Did the PUT succeed?', {
        key,
        bucket,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    // Resolve the URL we will persist on the row.
    const resolvedUrl = isPublicKind(kind)
      ? provider.publicUrl(bucket, key)
      : await createPresignedReadUrl({ kind, key, ttlSeconds: 300 });

    const attachment = {
      key,
      url: resolvedUrl,
      bucket,
      acl: aclForKind(kind),
      sizeBytes: sizeBytes ?? head.sizeBytes ?? 0,
      contentType: contentType ?? head.contentType ?? 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    };

    const result = await withRequestContext(session, async (tx) => {
      switch (kind) {
        case 'profile-photo': {
          const [row] = await tx
            .update(users)
            .set({ profilePhotoUrl: resolvedUrl })
            .where(eq(users.id, session.userId))
            .returning({ id: users.id });
          if (!row) return { status: 'not_found' as const };
          return { status: 'ok' as const };
        }
        case 'club-logo': {
          if (!contextId) return { status: 'bad' as const, msg: 'contextId (clubId) required.' };
          const allowed = await isClubStaff(tx, session, contextId);
          if (!allowed) return { status: 'forbidden' as const };
          const [row] = await tx
            .update(clubs)
            .set({ logoUrl: resolvedUrl })
            .where(eq(clubs.id, contextId))
            .returning({ id: clubs.id });
          if (!row) return { status: 'not_found' as const };
          return { status: 'ok' as const };
        }
        case 'court-photo': {
          if (!contextId) return { status: 'bad' as const, msg: 'contextId (courtId) required.' };
          const [court] = await tx
            .select({ id: courts.id, clubId: courts.clubId })
            .from(courts)
            .where(eq(courts.id, contextId))
            .limit(1);
          if (!court) return { status: 'not_found' as const };
          const allowed = await isClubStaff(tx, session, court.clubId);
          if (!allowed) return { status: 'forbidden' as const };
          await tx
            .update(courts)
            .set({ photos: sql`coalesce(${courts.photos}, '[]'::jsonb) || ${JSON.stringify([attachment])}::jsonb` })
            .where(eq(courts.id, contextId));
          return { status: 'ok' as const };
        }
        case 'coach-intro-photo': {
          // The coach uploading the photo must own the coach row.
          const [coach] = await tx
            .select({ id: coaches.id })
            .from(coaches)
            .where(eq(coaches.userId, session.userId))
            .limit(1);
          if (!coach) return { status: 'not_found' as const };
          await tx
            .update(coaches)
            .set({ photos: sql`coalesce(${coaches.photos}, '[]'::jsonb) || ${JSON.stringify([attachment])}::jsonb` })
            .where(eq(coaches.id, coach.id));
          return { status: 'ok' as const };
        }
        case 'verification-doc': {
          const [coach] = await tx
            .select({ id: coaches.id })
            .from(coaches)
            .where(eq(coaches.userId, session.userId))
            .limit(1);
          if (!coach) return { status: 'not_found' as const };
          await tx
            .update(coaches)
            .set({
              verificationDocuments: sql`coalesce(${coaches.verificationDocuments}, '[]'::jsonb) || ${JSON.stringify([attachment])}::jsonb`,
            })
            .where(eq(coaches.id, coach.id));
          return { status: 'ok' as const };
        }
        case 'chat-attachment':
        case 'match-photo-private':
        case 'edition-public':
        case 'edition-editorial':
        case 'edition-flagship-photo':
          // No automatic column write. Caller (chat send route, edition CMS)
          // stores the attachment record itself.
          return { status: 'ok' as const };
        default:
          return { status: 'bad' as const, msg: `Unsupported kind: ${kind as string}` };
      }
    });

    switch (result.status) {
      case 'ok':
        return ok({ data: attachment });
      case 'forbidden':
        return forbidden('You do not have permission to attach to this resource.');
      case 'not_found':
        return notFound('Target resource not found.');
      case 'bad':
        return badRequest(result.msg);
    }
  } catch (err) {
    return serverError('uploads:confirm', err);
  }
}

async function isClubStaff(
  tx: Parameters<Parameters<typeof withRequestContext>[1]>[0],
  session: { userId: string; role: string },
  clubId: string,
): Promise<boolean> {
  if (session.role === 'platform_admin') return true;
  const [row] = await tx
    .select({ id: clubStaff.id })
    .from(clubStaff)
    .where(
      and(
        eq(clubStaff.clubId, clubId),
        eq(clubStaff.userId, session.userId),
        eq(clubStaff.isActive, true),
      ),
    )
    .limit(1);
  return !!row;
}
