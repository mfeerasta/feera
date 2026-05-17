/**
 * Soketi adapter (Pusher protocol) stub.
 *
 * Phase 1 (M4) intentionally does not call the network. SSE is the default realtime
 * transport while we focus on correctness over fan-out. Flip `REALTIME_TRANSPORT=soketi`
 * to switch once Soketi is provisioned per ADR-0007.
 *
 * When wired up for real, this adapter signs an HTTP POST to:
 *   POST {SOKETI_HTTP_URL}/apps/{SOKETI_APP_ID}/events
 * with the Pusher auth signature scheme.
 * See https://github.com/soketi/soketi for protocol details.
 */

export type SoketiEvent = Readonly<{
  channel: string; // e.g. "private-chat-<uuid>"
  event: string;   // e.g. "message.new"
  data: unknown;
}>;

export type SoketiTransport = 'soketi' | 'sse';

export function activeRealtimeTransport(): SoketiTransport {
  const t = process.env.REALTIME_TRANSPORT?.toLowerCase();
  return t === 'soketi' ? 'soketi' : 'sse';
}

export class SoketiChannel {
  readonly name = 'soketi' as const;

  async publish(event: SoketiEvent): Promise<{ status: 'queued' | 'skipped'; reason?: string }> {
    if (activeRealtimeTransport() !== 'soketi') {
      return { status: 'skipped', reason: 'transport_sse' };
    }
    const appId = process.env.SOKETI_APP_ID;
    const httpUrl = process.env.SOKETI_HTTP_URL;
    if (!appId || !httpUrl) {
      return { status: 'skipped', reason: 'missing_env' };
    }
    // TODO(M5): real Pusher-signed POST. Until then, log and return queued so callers
    // do not branch on transport selection.
    // eslint-disable-next-line no-console
    console.info('[notifications] soketi queued', {
      channel: event.channel,
      event: event.event,
    });
    return { status: 'queued' };
  }
}

export const soketi = new SoketiChannel();
