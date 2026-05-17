/**
 * Feera JWT claim shape. These claims are embedded in every better-auth
 * issued JWT and consumed by Postgres RLS via the helpers in
 * `sql/auth-helpers.sql`.
 *
 * The Next.js request pipeline is responsible for calling
 *   SET LOCAL request.jwt.claims = '<json>'
 * on each pooled connection before running tenant-scoped queries.
 */

export interface FeeraJwtClaims {
  /** better-auth user id (uuid) */
  sub: string;
  /** ISO 3166-1 alpha-2 country, e.g. "PK", "AE", "PT" */
  country_code: string | null;
  /** BCP-47 locale, e.g. "en", "ur", "ar" */
  locale: string;
  /** Edition membership lifecycle */
  edition_status: 'none' | 'applicant' | 'active' | 'lapsed' | 'suspended';
  /** Verified coach flag */
  is_coach: boolean;
  /** Member of any club staff list */
  is_club_staff: boolean;
  /** Issued-at, seconds since epoch */
  iat?: number;
  /** Expiry, seconds since epoch */
  exp?: number;
}

/**
 * Build the JWT claim object from a better-auth user row.
 * Safe to extend, but adding fields means also patching
 * `sql/auth-helpers.sql`.
 */
export function buildFeeraClaims(input: {
  id: string;
  countryCode?: string | null;
  locale?: string | null;
  editionStatus?: string | null;
  isCoach?: boolean | null;
  isClubStaff?: boolean | null;
}): Omit<FeeraJwtClaims, 'iat' | 'exp'> {
  const editionStatus = (input.editionStatus ??
    'none') as FeeraJwtClaims['edition_status'];
  return {
    sub: input.id,
    country_code: input.countryCode ?? null,
    locale: input.locale ?? 'en',
    edition_status: editionStatus,
    is_coach: Boolean(input.isCoach),
    is_club_staff: Boolean(input.isClubStaff),
  };
}

/**
 * Additional user fields registered with better-auth so they flow into
 * the session payload (and therefore the JWT we sign).
 */
export const feeraAdditionalUserFields = {
  countryCode: { type: 'string', required: false, input: true },
  locale: { type: 'string', required: false, input: true, defaultValue: 'en' },
  editionStatus: {
    type: 'string',
    required: false,
    input: false,
    defaultValue: 'none',
  },
  isCoach: { type: 'boolean', required: false, input: false, defaultValue: false },
  isClubStaff: {
    type: 'boolean',
    required: false,
    input: false,
    defaultValue: false,
  },
  feeraUserId: { type: 'string', required: false, input: false },
} as const;
