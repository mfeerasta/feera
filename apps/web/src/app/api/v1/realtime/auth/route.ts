/**
 * Soketi/Pusher private + presence channel auth.
 *
 * Pusher-js POSTs `socket_id` + `channel_name` here. We:
 *   1. Resolve the better-auth session.
 *   2. Parse the channel kind (match | tournament | club | chat | user).
 *   3. Run a permission check against the DB under the user's RLS context.
 *   4. Return the Pusher-signed payload.
 *
 * Returns 403 on auth failure, 503 when Soketi is not configured so the
 * client cleanly falls back to SSE.
 */

import type { NextRequest } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { matches, tournamentRegistrations, clubStaff, chatMembers } from '@feera/db';
import { forbidden, serverError, unauthorized } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  authorizePrivateChannel,
  parseChannel,
  type ChannelDescriptor,
} from '@/lib/realtime/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function userIsAllowed(
  session: { userId: string; role: string },
  desc: ChannelDescriptor,
): Promise<boolean> {
  if (session.role === 'platform_admin') return true;
  if (!desc.entityId) return false;

  return withRequestContext(session as never, async (tx) => {
    switch (desc.kind) {
      case 'user':
        return desc.entityId === session.userId;
      case 'match': {
        const rows = await tx
          .select({ id: matches.id })
          .from(matches)
          .where(
            and(
              eq(matches.id, desc.entityId!),
              or(
                eq(matches.teamAPlayer1, session.userId),
                eq(matches.teamAPlayer2, session.userId),
                eq(matches.teamBPlayer1, session.userId),
                eq(matches.teamBPlayer2, session.userId),
              ),
            ),
          )
          .limit(1);
        return rows.length > 0;
      }
      case 'tournament': {
        const rows = await tx
          .select({ id: tournamentRegistrations.id })
          .from(tournamentRegistrations)
          .where(
            and(
              eq(tournamentRegistrations.tournamentId, desc.entityId!),
              eq(tournamentRegistrations.userId, session.userId),
            ),
          )
          .limit(1);
        return rows.length > 0;
      }
      case 'club': {
        const rows = await tx
          .select({ id: clubStaff.id })
          .from(clubStaff)
          .where(
            and(
              eq(clubStaff.clubId, desc.entityId!),
              eq(clubStaff.userId, session.userId),
            ),
          )
          .limit(1);
        return rows.length > 0;
      }
      case 'chat': {
        const rows = await tx
          .select({ id: chatMembers.id })
          .from(chatMembers)
          .where(
            and(
              eq(chatMembers.chatId, desc.entityId!),
              eq(chatMembers.userId, session.userId),
            ),
          )
          .limit(1);
        return rows.length > 0;
      }
      default:
        return false;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    // Pusher-js sends application/x-www-form-urlencoded.
    const form = await req.formData();
    const socketId = String(form.get('socket_id') ?? '');
    const channel = String(form.get('channel_name') ?? '');
    if (!socketId || !channel) {
      return forbidden('socket_id and channel_name required.');
    }
    const desc = parseChannel(channel);
    if (desc.kind === 'unknown') {
      return forbidden(`Unknown channel "${channel}".`);
    }

    const allowed = await userIsAllowed(session, desc);
    if (!allowed) return forbidden('Not authorised on this channel.');

    const signed = await authorizePrivateChannel(
      channel,
      socketId,
      session.userId,
      { country: session.countryCode, locale: session.locale },
    );
    if (!signed) {
      return new Response(
        JSON.stringify({ error: 'realtime_unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return Response.json(signed);
  } catch (err) {
    return serverError('realtime/auth:POST', err);
  }
}
