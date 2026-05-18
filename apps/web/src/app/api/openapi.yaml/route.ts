import { stringify } from 'yaml';
import { buildOpenApiDocument } from '@/lib/api/openapi';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET() {
  const doc = buildOpenApiDocument();
  const body = stringify(doc);
  return new Response(body, {
    status: 200,
    headers: {
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      'content-type': 'application/yaml; charset=utf-8',
    },
  });
}
