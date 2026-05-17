/**
 * Tiny fetch wrapper for the mobile app.
 *
 * - Joins relative paths to EXPO_PUBLIC_API_URL.
 * - Forwards the better-auth session cookie persisted by @better-auth/expo.
 * - Retries once on 5xx (network blips), throws on 4xx with parsed body.
 *
 * No React Query / SWR yet (lean Phase 1).
 */

import Constants from 'expo-constants';
import { authClient } from '../auth/client';

const DEFAULT_BASE = 'https://www.feera.ai';

export function apiBaseUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl;
  return fromExtra ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface FetchOptions extends RequestInit {
  /** Skip parsing the response body and return the raw Response. */
  raw?: boolean;
  /** Override the default base URL (rare). */
  baseUrl?: string;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  // better-auth Expo client persists cookies via expo-secure-store and exposes
  // them through getCookie(). When present, forward as Cookie header so the
  // server's getSession() picks up the auth cookie.
  const cookie =
    typeof (authClient as unknown as { getCookie?: () => string | null }).getCookie === 'function'
      ? (authClient as unknown as { getCookie: () => string | null }).getCookie()
      : null;
  if (cookie && cookie.length > 0 && !headers.has('cookie')) {
    headers.set('cookie', cookie);
  }
  return headers;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: FetchOptions = {},
): Promise<T> {
  const base = init.baseUrl ?? apiBaseUrl();
  const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = buildHeaders(init);

  const attempt = async (): Promise<Response> =>
    fetch(url, { ...init, headers, credentials: 'include' });

  let res: Response;
  try {
    res = await attempt();
    if (res.status >= 500 && res.status < 600) {
      res = await attempt();
    }
  } catch (e) {
    // Network error: one retry.
    res = await attempt();
  }

  if (init.raw) return res as unknown as T;

  const body = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, body, `HTTP ${res.status} for ${url}`);
  }
  return body as T;
}
