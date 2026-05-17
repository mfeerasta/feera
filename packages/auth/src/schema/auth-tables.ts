/**
 * Drizzle table definitions for better-auth core + plugins.
 *
 * These tables are owned by better-auth. They sit alongside the Feera
 * domain `users` table in `@feera/db` but are intentionally separate so
 * that better-auth can manage its own schema migrations and we can link
 * a `user.feeraUserId` to the domain users.id without coupling.
 *
 * Reference: better-auth core schema (auth, account, session, verification)
 * plus phoneNumber + magicLink plugin extensions.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);
const ts = (name: string) => timestamp(name, { withTimezone: true });

/**
 * authUser - better-auth's identity row. Linked one-to-one with the
 * domain `users` table via `feeraUserId` once a profile is completed.
 */
export const authUser = pgTable(
  'auth_user',
  {
    id: id(),
    email: text('email'),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name'),
    image: text('image'),
    // phone fields populated by the phoneNumber plugin
    phoneNumber: text('phone_number'),
    phoneNumberVerified: boolean('phone_number_verified').notNull().default(false),
    // Feera-specific fields surfaced as JWT claims
    countryCode: text('country_code'),
    locale: text('locale').notNull().default('en'),
    editionStatus: text('edition_status').notNull().default('none'),
    isCoach: boolean('is_coach').notNull().default(false),
    isClubStaff: boolean('is_club_staff').notNull().default(false),
    // Bridge to the domain users table once onboarding completes.
    feeraUserId: uuid('feera_user_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    emailUq: uniqueIndex('auth_user_email_uq').on(t.email),
    phoneUq: uniqueIndex('auth_user_phone_uq').on(t.phoneNumber),
    feeraIdIdx: index('auth_user_feera_id_idx').on(t.feeraUserId),
  }),
);

/**
 * authAccount - one row per linked credential (oauth, email-password,
 * passkey). Stores provider tokens.
 */
export const authAccount = pgTable(
  'auth_account',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    refreshTokenExpiresAt: ts('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    providerUq: uniqueIndex('auth_account_provider_uq').on(t.providerId, t.accountId),
    userIdx: index('auth_account_user_idx').on(t.userId),
  }),
);

/**
 * authSession - server-side session records. better-auth supports both
 * cookie sessions and JWTs; we issue JWTs for RLS but still keep
 * server sessions for revocation.
 */
export const authSession = pgTable(
  'auth_session',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: ts('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    tokenUq: uniqueIndex('auth_session_token_uq').on(t.token),
    userIdx: index('auth_session_user_idx').on(t.userId),
  }),
);

/**
 * authVerification - generic verification token bucket used by
 * email-verification, password-reset, magic-link, and phone OTP cache.
 */
export const authVerification = pgTable(
  'auth_verification',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    identifierIdx: index('auth_verification_identifier_idx').on(t.identifier),
  }),
);

export const authTables = {
  user: authUser,
  account: authAccount,
  session: authSession,
  verification: authVerification,
};
