import { NextResponse } from 'next/server';
import { buildOpenApiDocument } from '@/lib/api/openapi';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): NextResponse {
  const doc = buildOpenApiDocument();
  return NextResponse.json(doc as unknown as Record<string, unknown>, {
    headers: {
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
