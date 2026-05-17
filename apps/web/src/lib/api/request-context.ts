import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@feera/db';

/**
 * Session shape resolved from the request. M2 stub.
 *
 * TODO(auth): replace `getSession()` body with better-auth's verified JWT path
 * once subagent B lands `packages/auth`. The JWT claims object must contain at
 * minimum: { sub, country_code, edition_status, role }. We already wire those
 * claims into Postgres via `set_config('request.jwt.claims', ...)` so the RLS
 * policies subagent A wrote will pick them up untouched.
 */
export interface Session {
  userId: string;
  countryCode: string;
  editionStatus: 'none' | 'applicant' | 'active' | 'lapsed' | 'suspended';
  role: 'player' | 'club_staff' | 'platform_admin';
}

const DEV_ADMIN_SESSION: Session = {
  // Stable synthetic UUID v4 reserved for the dev-admin path. Documented so
  // it never collides with a real user.
  userId: '00000000-0000-4000-8000-00000000dead',
  countryCode: 'PK',
  editionStatus: 'active',
  role: 'platform_admin',
};

/**
 * Best-effort JWT payload decode. No signature verification. Replace with
 * better-auth's verify in M2/M3 (TODO above).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1]!, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the session for the current request. Returns null when the request
 * is unauthenticated.
 *
 * Dev shortcut: when `x-feera-dev-admin: 1` is present, returns a synthetic
 * platform_admin session. Gate this header at the edge (Caddy) before
 * production launch.
 */
export async function getSession(): Promise<Session | null> {
  const h = await headers();

  if (h.get('x-feera-dev-admin') === '1') {
    return DEV_ADMIN_SESSION;
  }

  const auth = h.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const payload = decodeJwtPayload(auth.slice(7).trim());
    if (payload && typeof payload.sub === 'string') {
      return {
        userId: payload.sub,
        countryCode:
          typeof payload.country_code === 'string' ? payload.country_code : 'PK',
        editionStatus:
          (payload.edition_status as Session['editionStatus']) ?? 'none',
        role: (payload.role as Session['role']) ?? 'player',
      };
    }
  }

  return null;
}

/**
 * Build the JWT-claims JSON that RLS policies read via `current_setting()`.
 */
function buildClaims(session: Session): string {
  return JSON.stringify({
    sub: session.userId,
    country_code: session.countryCode,
    edition_status: session.editionStatus,
    role: session.role,
  });
}

/**
 * Run a database operation with RLS request context set. Wraps in a
 * transaction so `set_config(..., true)` (local scope) applies for the
 * duration of `fn`.
 *
 * For unauthenticated requests, claims are cleared so RLS falls back to the
 * anonymous role.
 */
export async function withRequestContext<T>(
  session: Session | null,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = session ? buildClaims(session) : '';
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
    );
    return fn(tx as unknown as typeof db);
  });
}
