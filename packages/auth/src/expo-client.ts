/**
 * better-auth Expo client for apps/mobile.
 *
 * Uses better-auth's Expo plugin which integrates expo-secure-store
 * and the `feera://` deep-link scheme for OAuth callbacks. Wire the
 * deep link in `apps/mobile/app.config.ts` under `scheme`.
 */

import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { magicLinkClient, phoneNumberClient } from 'better-auth/client/plugins';

interface ExpoStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => unknown;
}

export function createFeeraExpoClient(opts: {
  baseURL: string;
  scheme?: string;
  storage: ExpoStorage;
}) {
  return createAuthClient({
    baseURL: opts.baseURL,
    plugins: [
      expoClient({
        scheme: opts.scheme ?? 'feera',
        storage: opts.storage,
      }),
      magicLinkClient(),
      phoneNumberClient(),
    ],
  });
}

export type FeeraExpoClient = ReturnType<typeof createFeeraExpoClient>;
