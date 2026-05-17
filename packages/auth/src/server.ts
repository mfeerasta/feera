/**
 * better-auth server instance for Feera.
 *
 * Mounts in `apps/web` as a catch-all Next.js Route Handler
 * (see `examples/route.ts.example`). The same instance powers the
 * web cookie session and the JWT used by mobile + Postgres RLS.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins/magic-link';
import { phoneNumber } from 'better-auth/plugins/phone-number';
import { jwt } from 'better-auth/plugins/jwt';
import { expo } from '@better-auth/expo';

import { db } from '@feera/db/client';
import * as authSchema from './schema/auth-tables';
import { phoneOtpSender, verifyOtp } from './plugins/phone-otp';
import { magicLinkSender } from './plugins/magic-link';
import { buildFeeraClaims, feeraAdditionalUserFields } from './jwt-claims';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[auth] ${name} is required.`);
  return v;
}

export const auth = betterAuth({
  appName: 'Feera',
  baseURL: process.env.AUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000',
  secret: required('AUTH_SECRET'),

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authSchema.authUser,
      account: authSchema.authAccount,
      session: authSchema.authSession,
      verification: authSchema.authVerification,
    },
  }),

  user: {
    additionalFields: feeraAdditionalUserFields,
  },

  session: {
    // 7d rolling, refresh on use.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? '',
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? '',
      // Apple JWT signing inputs. better-auth uses these to mint the
      // `client_secret` JWT on every token exchange.
      appBundleIdentifier: process.env.APPLE_CLIENT_ID ?? '',
      // Custom Apple-specific fields surfaced via authorization param
      // builder (see ADR-0006). These are read by the plugin below.
    },
  },

  plugins: [
    phoneNumber({
      sendOTP: phoneOtpSender(),
      // Twilio Verify owns code generation; we just confirm.
      verifyOTP: async ({ phoneNumber: phone, code }) => {
        const result = await verifyOtp(phone, code);
        return result.valid;
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/[^0-9]/g, '')}@phone.feera.local`,
        getTempName: (phone) => phone,
      },
    }),

    magicLink({
      sendMagicLink: magicLinkSender(),
      expiresIn: 60 * 15,
    }),

    jwt({
      jwt: {
        // Embed Feera claims in every issued JWT so Postgres RLS
        // (auth.user_id(), auth.country_code(), etc.) can read them.
        definePayload: ({ user }) =>
          buildFeeraClaims({
            id: user.id,
            countryCode: (user as { countryCode?: string | null }).countryCode,
            locale: (user as { locale?: string | null }).locale,
            editionStatus: (user as { editionStatus?: string | null }).editionStatus,
            isCoach: (user as { isCoach?: boolean | null }).isCoach,
            isClubStaff: (user as { isClubStaff?: boolean | null }).isClubStaff,
          }),
        expirationTime: '7d',
      },
    }),

    expo(),
  ],

  advanced: {
    cookiePrefix: 'feera',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  trustedOrigins: [
    process.env.APP_URL ?? 'http://localhost:3000',
    'feera://',
  ],
});

export type Auth = typeof auth;
export type Session = Auth['$Infer']['Session'];
