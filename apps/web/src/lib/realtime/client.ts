/**
 * Client-side Pusher subscriber. Browser-only.
 *
 * Use:
 *   const sub = subscribeToChannel('private-match-abc', (event, data) => ...)
 *   sub.unsubscribe()
 *
 * Falls back gracefully when NEXT_PUBLIC_SOKETI_KEY is unset (returns a no-op
 * subscription) so calling components can mount unconditionally and progressively
 * upgrade once Soketi is provisioned.
 */

'use client';

import { useEffect, useRef } from 'react';

type PusherClient = {
  subscribe: (channel: string) => {
    bind: (event: string, cb: (data: unknown) => void) => void;
    unbind_all: () => void;
  };
  unsubscribe: (channel: string) => void;
  disconnect: () => void;
};

let _client: PusherClient | null = null;
let _initPromise: Promise<PusherClient | null> | null = null;

function readEnv() {
  const key = process.env.NEXT_PUBLIC_SOKETI_KEY;
  const host = process.env.NEXT_PUBLIC_SOKETI_HOST ?? 'realtime.feera.ai';
  const port = process.env.NEXT_PUBLIC_SOKETI_PORT ?? '443';
  if (!key) return null;
  return { key, host, port: Number.parseInt(port, 10) };
}

async function getClient(): Promise<PusherClient | null> {
  if (_client) return _client;
  if (_initPromise) return _initPromise;
  const env = readEnv();
  if (!env) return null;

  _initPromise = (async () => {
    try {
      const mod = (await import('pusher-js')) as unknown as {
        default: new (key: string, opts: Record<string, unknown>) => PusherClient;
      };
      const Ctor = mod.default;
      _client = new Ctor(env.key, {
        wsHost: env.host,
        wsPort: env.port,
        wssPort: env.port,
        forceTLS: env.port === 443,
        enabledTransports: ['ws', 'wss'],
        cluster: 'mt1', // ignored by Soketi but required by pusher-js types
        channelAuthorization: {
          endpoint: '/api/v1/realtime/auth',
          transport: 'ajax',
        },
      });
      return _client;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[realtime/client] init failed, SSE fallback active', err);
      return null;
    }
  })();

  return _initPromise;
}

export interface Subscription {
  unsubscribe: () => void;
}

export async function subscribeToChannel(
  channel: string,
  events: Record<string, (data: unknown) => void>,
): Promise<Subscription> {
  const client = await getClient();
  if (!client) {
    return { unsubscribe: () => undefined };
  }
  const ch = client.subscribe(channel);
  for (const [event, cb] of Object.entries(events)) {
    ch.bind(event, cb);
  }
  return {
    unsubscribe: () => {
      try {
        ch.unbind_all();
        client.unsubscribe(channel);
      } catch {
        /* noop */
      }
    },
  };
}

/**
 * React hook flavour. Resubscribes when the channel changes; cleans up on unmount.
 * Pass a stable `events` object (memoise upstream) or accept the resubscribe cost.
 */
export function useRealtimeChannel(
  channel: string | null,
  events: Record<string, (data: unknown) => void>,
): void {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!channel) return;
    let sub: Subscription | null = null;
    let cancelled = false;
    void subscribeToChannel(channel, eventsRef.current).then((s) => {
      if (cancelled) {
        s.unsubscribe();
        return;
      }
      sub = s;
    });
    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [channel]);
}

/** True when the client has Soketi env wired. UI may show a "live" badge. */
export function realtimeEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SOKETI_KEY);
}
