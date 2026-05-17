import type { NextRequest } from 'next/server';
import postgres from 'postgres';
import { forbidden, unauthorized } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { isChatMember } from '@/lib/chats/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE chat stream powered by Postgres LISTEN/NOTIFY on the `chat_message_inserted` channel.
 *
 * Phase 1 default transport per ADR-0007. When REALTIME_TRANSPORT=soketi the client should
 * subscribe via Pusher SDK instead and this endpoint may be skipped.
 *
 * Each NOTIFY payload is filtered by chat id before being forwarded to the SSE client.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id: chatId } = await ctx.params;

  // Authorise.
  const allowed = await withRequestContext(session, (tx) => isChatMember(tx, chatId, session.userId));
  if (!allowed && session.role !== 'platform_admin') return forbidden('Not a member of this chat.');

  const dbUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    return new Response('database not configured', { status: 503 });
  }

  // A dedicated long-lived connection. PgBouncer transaction-mode pools do not
  // support session-scoped LISTEN, so we open a separate client here without `max: 1`.
  const listenSql = postgres(dbUrl, {
    max: 1,
    idle_timeout: 0,
    ssl: 'require',
    prepare: false,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (line: string) => controller.enqueue(encoder.encode(line));
      write(`: connected\n\n`);
      const ping = setInterval(() => {
        try {
          write(`: ping\n\n`);
        } catch {
          /* closed */
        }
      }, 25_000);

      try {
        await listenSql.listen('chat_message_inserted', (payload) => {
          if (!payload) return;
          try {
            const parsed = JSON.parse(payload) as { chat_id?: string };
            if (parsed.chat_id !== chatId) return;
            write(`event: message\n`);
            write(`data: ${payload}\n\n`);
          } catch {
            /* ignore malformed payloads */
          }
        });
      } catch (err) {
        write(`event: error\n`);
        write(`data: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
        clearInterval(ping);
        controller.close();
        await listenSql.end({ timeout: 1 }).catch(() => {});
        return;
      }

      const abort = () => {
        clearInterval(ping);
        controller.close();
        void listenSql.end({ timeout: 1 }).catch(() => {});
      };
      // No request abort wiring in Next 16 route handlers yet; rely on stream close.
      controller.enqueue(encoder.encode(`event: ready\ndata: {}\n\n`));
      void abort; // referenced for future wiring
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
