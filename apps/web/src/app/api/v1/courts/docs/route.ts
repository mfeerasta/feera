import type { NextRequest } from 'next/server';
import { asc } from 'drizzle-orm';
import { courtsDocumentsLibrary } from '@feera/db';
import {
  badRequest,
  conflict,
  created,
  ok,
  serverError,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      tx
        .select()
        .from(courtsDocumentsLibrary)
        .orderBy(
          asc(courtsDocumentsLibrary.category),
          asc(courtsDocumentsLibrary.createdAt),
        ),
    );
    return ok({ data: rows });
  } catch (err) {
    return serverError('courts/docs:GET', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const { title, category, contentMd } = body as Record<string, unknown>;
    if (!title || typeof title !== 'string') {
      return badRequest('title is required.');
    }

    const slug =
      typeof (body as Record<string, unknown>).slug === 'string'
        ? (body as Record<string, unknown>).slug as string
        : toSlug(title);

    const row = await withRequestContext(session, async (tx) => {
      const existing = await tx
        .select({ id: courtsDocumentsLibrary.id })
        .from(courtsDocumentsLibrary)
        .where(eq(courtsDocumentsLibrary.slug, slug))
        .limit(1);
      if (existing.length > 0) return { conflict: true as const };

      const [inserted] = await tx
        .insert(courtsDocumentsLibrary)
        .values({
          title,
          slug,
          category: (category as string) ?? 'guide',
          contentMd: (contentMd as string) ?? null,
        })
        .returning();
      return { conflict: false as const, doc: inserted };
    });

    if (row.conflict) return conflict(`Slug "${slug}" already exists.`);
    return created({ data: row.doc });
  } catch (err) {
    return serverError('courts/docs:POST', err);
  }
}
