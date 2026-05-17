/**
 * better-auth catch-all route handler.
 *
 * Mounts the @feera/auth server instance under /api/auth/*. Handles
 * phone OTP, magic link, OAuth (Google + Apple), and session management.
 *
 * Runtime: nodejs (Twilio + Resend SDKs require Node, not Edge).
 * Dynamic: force-dynamic (each request is unique, never cacheable).
 */

import { auth } from '@feera/auth/server';
import { toNextJsHandler } from 'better-auth/next-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, POST } = toNextJsHandler(auth);
