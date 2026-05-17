import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ALL_CONTENT_KINDS, createPresignedUploadUrl } from '@feera/storage';
import {
  badRequest,
  fromZodError,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  kind: z.enum(ALL_CONTENT_KINDS as [string, ...string[]]),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
  filename: z.string().min(1).max(200).optional(),
  contextId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const r = await createPresignedUploadUrl({
      kind: parsed.data.kind as Parameters<typeof createPresignedUploadUrl>[0]['kind'],
      userId: session.userId,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      filename: parsed.data.filename,
      contextId: parsed.data.contextId,
    });

    if (!r.ok) {
      return badRequest(r.error.message, { code: r.error.code });
    }

    return ok({
      data: {
        uploadUrl: r.upload.uploadUrl,
        key: r.upload.key,
        bucket: r.upload.bucket,
        headers: r.upload.headers,
        publicUrl: r.upload.publicUrl ?? null,
        expiresAt: r.upload.expiresAt,
        kind: r.kind,
      },
    });
  } catch (err) {
    return serverError('uploads:sign', err);
  }
}
