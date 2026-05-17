import { headers } from 'next/headers';

/**
 * Build an absolute origin for server-side fetches. We can't rely on relative
 * URLs in Server Components.
 */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/**
 * Fetch wrapper for admin Server Components. Forwards the dev-admin header so
 * gated routes accept the request. Replace with a real session token forward
 * once better-auth is wired.
 */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = await origin();
  return fetch(`${base}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      'x-feera-dev-admin': '1',
      ...(init.headers ?? {}),
    },
  });
}
