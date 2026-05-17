import { headers } from 'next/headers';

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/**
 * Server-side fetch wrapper for player Server Components. Forwards the
 * incoming cookie so better-auth sees the active session.
 */
export async function playFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = await origin();
  const h = await headers();
  const cookie = h.get('cookie') ?? '';
  return fetch(`${base}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/** Tiny empty-state block. */
export function emptyStateText(headline: string, body: string) {
  return { headline, body };
}
