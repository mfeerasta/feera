/**
 * Mobile Pusher subscriber. Wraps @pusher/pusher-websocket-react-native.
 *
 * Connects on app launch when the user is signed in. Falls through to a no-op
 * if NEXT_PUBLIC_SOKETI_KEY is unset (e.g. during local dev before Soketi is
 * provisioned).
 *
 * Channel scheme: same as web (private-match-{id}, private-tournament-{id},
 * presence-club-{id}). The auth endpoint POSTs include the user's session
 * bearer token so the Next API can resolve the better-auth session.
 */

import { Platform } from 'react-native';

type PusherEvent = { channelName: string; eventName: string; data: string };

type PusherInstance = {
  init: (config: {
    apiKey: string;
    cluster: string;
    onEvent?: (event: PusherEvent) => void;
    onAuthorizer?: (
      channelName: string,
      socketId: string,
    ) => Promise<{ auth: string; channel_data?: string }>;
  }) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (args: { channelName: string }) => Promise<void>;
  unsubscribe: (args: { channelName: string }) => Promise<void>;
};

type Listener = (event: string, data: unknown) => void;

const listeners = new Map<string, Set<Listener>>();
let pusher: PusherInstance | null = null;
let started = false;

interface RealtimeOptions {
  apiBaseUrl: string;
  bearerToken: () => string | null;
}

function readEnv() {
  // Expo exposes env via process.env after EAS build-time injection.
  const key = process.env.EXPO_PUBLIC_SOKETI_KEY ?? process.env.NEXT_PUBLIC_SOKETI_KEY;
  const host = process.env.EXPO_PUBLIC_SOKETI_HOST ?? process.env.NEXT_PUBLIC_SOKETI_HOST ?? 'realtime.feera.ai';
  const portRaw = process.env.EXPO_PUBLIC_SOKETI_PORT ?? process.env.NEXT_PUBLIC_SOKETI_PORT ?? '443';
  if (!key) return null;
  return { key, host, port: Number.parseInt(portRaw, 10) };
}

function emit(channel: string, event: string, data: unknown) {
  const set = listeners.get(channel);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(event, data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] listener threw', err);
    }
  }
}

export async function startRealtime(opts: RealtimeOptions): Promise<void> {
  if (started) return;
  const env = readEnv();
  if (!env) {
    // eslint-disable-next-line no-console
    console.info('[realtime] SOKETI_KEY missing; staying on SSE fallback');
    return;
  }
  try {
    const mod = (await import('@pusher/pusher-websocket-react-native')) as unknown as {
      Pusher: { getInstance: () => PusherInstance };
    };
    pusher = mod.Pusher.getInstance();
    await pusher.init({
      apiKey: env.key,
      cluster: 'mt1', // ignored by Soketi
      onEvent: ({ channelName, eventName, data }) => {
        let parsed: unknown = data;
        try {
          parsed = JSON.parse(data);
        } catch {
          /* keep as string */
        }
        emit(channelName, eventName, parsed);
      },
      onAuthorizer: async (channelName, socketId) => {
        const token = opts.bearerToken();
        const form = new URLSearchParams({ socket_id: socketId, channel_name: channelName });
        const res = await fetch(`${opts.apiBaseUrl}/v1/realtime/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Platform': Platform.OS,
          },
          body: form.toString(),
        });
        if (!res.ok) throw new Error(`auth ${res.status}`);
        return (await res.json()) as { auth: string; channel_data?: string };
      },
    });
    await pusher.connect();
    started = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[realtime] init failed', err);
  }
}

export async function stopRealtime(): Promise<void> {
  if (!pusher || !started) return;
  try {
    await pusher.disconnect();
  } catch {
    /* noop */
  }
  started = false;
  listeners.clear();
}

export async function subscribe(
  channel: string,
  listener: Listener,
): Promise<() => Promise<void>> {
  let set = listeners.get(channel);
  if (!set) {
    set = new Set();
    listeners.set(channel, set);
    if (pusher && started) {
      await pusher.subscribe({ channelName: channel });
    }
  }
  set.add(listener);
  return async () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      listeners.delete(channel);
      if (pusher && started) {
        try {
          await pusher.unsubscribe({ channelName: channel });
        } catch {
          /* noop */
        }
      }
    }
  };
}

export const channelFor = {
  match: (id: string) => `private-match-${id}`,
  tournament: (id: string) => `private-tournament-${id}`,
  club: (id: string) => `presence-club-${id}`,
  chat: (id: string) => `private-chat-${id}`,
  user: (id: string) => `private-user-${id}`,
} as const;
