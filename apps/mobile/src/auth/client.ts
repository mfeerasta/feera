/**
 * Mobile auth client wiring. Stub for M2: instantiates the @feera/auth
 * Expo client backed by expo-secure-store and the feera:// deep link.
 *
 * The OTP / magic link UX lands in M3 (see docs/decisions/0006-auth-better-auth.md).
 * For now, screens import `authClient` to keep navigation breadcrumbs honest.
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { createFeeraExpoClient, type FeeraExpoClient } from '@feera/auth/expo-client';

const baseURL =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

export const authClient: FeeraExpoClient = createFeeraExpoClient({
  baseURL,
  scheme: 'feera',
  storage: {
    getItem: (key) => SecureStore.getItem(key),
    setItem: (key, value) => SecureStore.setItem(key, String(value)),
  },
});
