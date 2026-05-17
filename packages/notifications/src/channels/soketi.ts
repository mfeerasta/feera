/**
 * Soketi adapter (Pusher protocol) - real implementation.
 *
 * Phase 1.5 (M7): Soketi container is deployed per ADR-0007. This channel
 * forwards to apps/web/src/lib/realtime/server.ts when called inside the
 * Next.js process, or talks to the Pusher HTTP REST API directly when called
 * from a Node worker that does not have the Next runtime loaded.
 *
 * Flip REALTIME_TRANSPORT=sse to force the legacy SSE-only fallback (the
 * SoketiChannel.publish call then no-ops with status "skipped").
 */

import { createHmac, createHash } from 'node:crypto';

export type SoketiEvent = Readonly<{
  channel: string; // e.g. "private-chat-<uuid>"
  event: string;   // e.g. "message.new"
  data: unknown;
}>;

export type SoketiTransport = 'soketi' | 'sse';

export function activeRealtimeTransport(): SoketiTransport {
  const t = process.env.REALTIME_TRANSPORT?.toLowerCase();
  if (t === 'sse') return 'sse';
  // Auto-detect: if SOKETI_KEY is set we are on the soketi transport.
  return process.env.SOKETI_KEY ? 'soketi' : 'sse';
}

interface SoketiCreds {
  appId: string;
  key: string;
  secret: string;
  baseUrl: string;
}

function loadCreds(): SoketiCreds | null {
  const appId = process.env.SOKETI_APP_ID;
  const key = process.env.SOKETI_KEY;
  const secret = process.env.SOKETI_SECRET;
  if (!appId || !key || !secret) return null;
  const host = process.env.SOKETI_HTTP_URL
    ?? `https://${process.env.NEXT_PUBLIC_SOKETI_HOST ?? 'realtime.feera.ai'}`;
  return { appId, key, secret, baseUrl: host.replace(/\/$/, '') };
}

/**
 * Sign and POST to Pusher's REST events endpoint. Mirrors what the `pusher`
 * npm SDK does internally; we hand-roll so the channels package stays
 * dependency-light (workers can import it without dragging in a server-only
 * Pusher build).
 */
async function postEvent(creds: SoketiCreds, event: SoketiEvent): Promise<void> {
  const path = `/apps/${creds.appId}/events`;
  const body = JSON.stringify({
    name: event.event,
    channel: event.channel,
    data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
  });
  const bodyMd5 = createHash('md5').update(body).digest('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = new URLSearchParams({
    auth_key: creds.key,
    auth_timestamp: timestamp,
    auth_version: '1.0',
    body_md5: bodyMd5,
  });
  const stringToSign = ['POST', path, params.toString()].join('\n');
  const signature = createHmac('sha256', creds.secret).update(stringToSign).digest('hex');
  params.set('auth_signature', signature);

  const res = await fetch(`${creds.baseUrl}${path}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    throw new Error(`soketi REST ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

export class SoketiChannel {
  readonly name = 'soketi' as const;

  async publish(event: SoketiEvent): Promise<{ status: 'queued' | 'skipped' | 'failed'; reason?: string }> {
    if (activeRealtimeTransport() !== 'soketi') {
      return { status: 'skipped', reason: 'transport_sse' };
    }
    const creds = loadCreds();
    if (!creds) {
      return { status: 'skipped', reason: 'missing_env' };
    }
    try {
      await postEvent(creds, event);
      return { status: 'queued' };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[notifications] soketi publish failed', {
        channel: event.channel,
        event: event.event,
        msg: (err as Error).message,
      });
      return { status: 'failed', reason: (err as Error).message };
    }
  }
}

export const soketi = new SoketiChannel();
