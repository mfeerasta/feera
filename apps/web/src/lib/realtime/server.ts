/**
 * Server-side Pusher helper for Soketi (ADR-0007).
 *
 * Wraps the `pusher` SDK so route handlers can call `triggerEvent` after their
 * DB writes without worrying about lazy init, missing env, or transport choice.
 * When SOKETI_KEY is unset (dev without realtime) every call is a logged no-op
 * so the caller never branches on transport.
 *
 * All triggers run in fire-and-forget with try/catch + log; never block the
 * caller's response on realtime fan-out.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
type PusherCtor = new (config: {
  appId: string;
  key: string;
  secret: string;
  host: string;
  port: string;
  useTLS: boolean;
  cluster?: string;
}) => {
  trigger: (channel: string | string[], event: string, data: unknown) => Promise<unknown>;
  authorizeChannel: (
    socketId: string,
    channel: string,
    presenceData?: { user_id: string; user_info?: Record<string, unknown> },
  ) => { auth: string; channel_data?: string };
};

let _client: InstanceType<PusherCtor> | null = null;
let _initFailed = false;

interface SoketiEnv {
  appId: string;
  key: string;
  secret: string;
  host: string;
  port: string;
  useTLS: boolean;
}

function readEnv(): SoketiEnv | null {
  const appId = process.env.SOKETI_APP_ID;
  const key = process.env.SOKETI_KEY;
  const secret = process.env.SOKETI_SECRET;
  if (!appId || !key || !secret) return null;
  // Default to the prod hostname. NEXT_PUBLIC_SOKETI_HOST is the client-facing
  // host; SOKETI_HTTP_HOST may differ if the box is reached internally.
  const host = process.env.SOKETI_HTTP_HOST ?? process.env.NEXT_PUBLIC_SOKETI_HOST ?? 'realtime.feera.ai';
  const port = process.env.SOKETI_HTTP_PORT ?? process.env.NEXT_PUBLIC_SOKETI_PORT ?? '443';
  const useTLS = port === '443' || process.env.SOKETI_USE_TLS === '1';
  return { appId, key, secret, host, port, useTLS };
}

async function getClient(): Promise<InstanceType<PusherCtor> | null> {
  if (_client) return _client;
  if (_initFailed) return null;
  const env = readEnv();
  if (!env) {
    _initFailed = true;
    return null;
  }
  try {
    // Dynamic import so dev installs without `pusher` still typecheck/build.
    const mod = (await import('pusher')) as unknown as { default: PusherCtor } | PusherCtor;
    const Ctor = (mod as { default?: PusherCtor }).default ?? (mod as PusherCtor);
    _client = new Ctor({
      appId: env.appId,
      key: env.key,
      secret: env.secret,
      host: env.host,
      port: env.port,
      useTLS: env.useTLS,
    });
    return _client;
  } catch (err) {
    _initFailed = true;
    // eslint-disable-next-line no-console
    console.warn('[realtime] pusher init failed, falling back to no-op', {
      msg: (err as Error).message,
    });
    return null;
  }
}

export interface TriggerResult {
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
}

/**
 * Fire-and-forget event publish. Always resolves; never throws. Safe to call
 * inside a Next route handler without awaiting if the response should not block.
 */
export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown,
): Promise<TriggerResult> {
  const client = await getClient();
  if (!client) {
    return { status: 'skipped', reason: 'soketi_not_configured' };
  }
  try {
    await client.trigger(channel, event, data);
    return { status: 'sent' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[realtime] trigger failed', {
      channel,
      event,
      msg: (err as Error).message,
    });
    return { status: 'failed', reason: (err as Error).message };
  }
}

/**
 * Sign an auth payload for a private or presence channel. Returns null when
 * Soketi is not configured (caller should respond 503 in that case so the
 * client falls back to SSE).
 */
export async function authorizePrivateChannel(
  channel: string,
  socketId: string,
  userId: string,
  userInfo?: Record<string, unknown>,
): Promise<{ auth: string; channel_data?: string } | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    if (channel.startsWith('presence-')) {
      return client.authorizeChannel(socketId, channel, {
        user_id: userId,
        user_info: userInfo ?? {},
      });
    }
    return client.authorizeChannel(socketId, channel);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[realtime] authorize failed', {
      channel,
      msg: (err as Error).message,
    });
    return null;
  }
}

/**
 * Best-effort channel-name parser. Returns the kind + entity id so the
 * authorisation endpoint can run a per-kind permission check.
 */
export interface ChannelDescriptor {
  kind: 'match' | 'tournament' | 'club' | 'chat' | 'user' | 'unknown';
  entityId: string | null;
  presence: boolean;
}

export function parseChannel(channel: string): ChannelDescriptor {
  const presence = channel.startsWith('presence-');
  const body = channel.replace(/^(private-|presence-)/, '');
  const [kind, ...rest] = body.split('-');
  const entityId = rest.join('-') || null;
  switch (kind) {
    case 'match':
    case 'tournament':
    case 'club':
    case 'chat':
    case 'user':
      return { kind, entityId, presence };
    default:
      return { kind: 'unknown', entityId, presence };
  }
}

/**
 * Convenience helpers so route handlers do not hand-build channel strings.
 */
export const channelFor = {
  match: (id: string) => `private-match-${id}`,
  tournament: (id: string) => `private-tournament-${id}`,
  club: (id: string) => `presence-club-${id}`,
  chat: (id: string) => `private-chat-${id}`,
  user: (id: string) => `private-user-${id}`,
} as const;
