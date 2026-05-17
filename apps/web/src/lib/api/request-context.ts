import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@feera/db';
import { auth, buildFeeraClaims } from '@feera/auth';
import type { FeeraJwtClaims } from '@feera/auth';

/**
 * Session shape resolved from the request. Backed by better-auth.
 */
export interface Session {
  userId: string;
  countryCode: string;
  editionStatus: 'none' | 'applicant' | 'active' | 'lapsed' | 'suspended';
  role: 'player' | 'club_staff' | 'platform_admin';
  isCoach: boolean;
  locale: string;
}

const DEV_ADMIN_SESSION: Session = {
  // Stable synthetic UUID v4 reserved for the dev-admin path.
  userId: '00000000-0000-4000-8000-00000000dead',
  countryCode: 'PK',
  editionStatus: 'active',
  role: 'platform_admin',
  isCoach: false,
  locale: 'en',
};

function devAdminHeaderEnabled(): boolean {
  if (process.env.ADMIN_DEV_HEADER === '1') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

/**
 * Resolve the session for the current request. Returns null when
 * unauthenticated.
 *
 * The `x-feera-dev-admin: 1` header bypass is gated on dev mode or the
 * explicit ADMIN_DEV_HEADER=1 escape hatch. Demo box sets the env var.
 */
export async function getSession(): Promise<Session | null> {
  const h = await headers();

  if (h.get('x-feera-dev-admin') === '1' && devAdminHeaderEnabled()) {
    return DEV_ADMIN_SESSION;
  }

  try {
    const session = await auth.api.getSession({ headers: h });
    if (!session || !session.user) return null;
    const u = session.user as {
      id: string;
      countryCode?: string | null;
      locale?: string | null;
      editionStatus?: string | null;
      isCoach?: boolean | null;
      isClubStaff?: boolean | null;
    };
    return {
      userId: u.id,
      countryCode: u.countryCode ?? 'PK',
      editionStatus:
        (u.editionStatus as Session['editionStatus']) ?? 'none',
      role: u.isClubStaff ? 'club_staff' : 'player',
      isCoach: Boolean(u.isCoach),
      locale: u.locale ?? 'en',
    };
  } catch {
    return null;
  }
}

/**
 * Build the JWT-claims JSON that Postgres RLS helpers read via
 * `current_setting('request.jwt.claims', true)`. Shape matches
 * `FeeraJwtClaims` so the `auth.*` helper functions resolve correctly.
 */
function buildClaims(session: Session): string {
  const claims: Omit<FeeraJwtClaims, 'iat' | 'exp'> = buildFeeraClaims({
    id: session.userId,
    countryCode: session.countryCode,
    locale: session.locale,
    editionStatus: session.editionStatus,
    isCoach: session.isCoach,
    isClubStaff: session.role === 'club_staff' || session.role === 'platform_admin',
  });
  return JSON.stringify(claims);
}

/**
 * Run a database operation with RLS request context set. Wraps in a
 * transaction so `set_config(..., true)` (local scope) applies for the
 * duration of `fn`.
 *
 * For unauthenticated requests, claims are cleared so RLS falls back to
 * the anonymous role.
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
