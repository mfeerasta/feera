import { notFound } from 'next/navigation';

/**
 * Admin route guard. M2 stub.
 *
 * TODO(auth): once better-auth lands (subagent B), check the session for a
 * platform_admin or club_staff role and 404 otherwise. For M2, allow access
 * in development OR when `?admin=1` is set. This is intentionally permissive
 * because the admin UI ships with no real user data yet.
 */
export function gateAdmin(searchParams: { admin?: string } | undefined): void {
  if (process.env.NODE_ENV === 'development') return;
  if (searchParams?.admin === '1') return;
  notFound();
}
