/**
 * Booking invites service.
 *
 * Private invitations from the organizer to specific friends. Distinct from
 * booking_join_requests (which strangers send to fill open slots).
 *
 * Lifecycle: pending -> accepted | declined | cancelled | expired.
 * Auto-expires after 72h via the DB default expires_at column (a worker
 * sweeper flips pending -> expired when now() > expires_at).
 *
 * Acceptance is atomic: we insert/upgrade the booking_participants row and
 * bump bookings.seats_booked inside a SERIALIZABLE transaction so two parallel
 * accepts can't oversell the court.
 */

import { and, eq, gt, lt, or, sql } from 'drizzle-orm';
import {
  bookingInvites,
  bookingParticipants,
  bookings,
  courts,
  users,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import { enqueueNotificationSafe } from '@/lib/notifications/outbox';

export type InviteRow = typeof bookingInvites.$inferSelect;

export type SendInvitesError =
  | { kind: 'booking_not_found' }
  | { kind: 'forbidden' }
  | { kind: 'no_invitees' }
  | { kind: 'invalid_invitee' };

export interface SendInvitesResult {
  created: InviteRow[];
  skippedExisting: string[]; // userIds that already had a pending invite
}

/**
 * Organizer-only batch invite. Skips invitees that already have a pending
 * invite (idempotent re-send is a no-op). Enqueues booking_invite_received
 * for each newly-created invite.
 */
export async function sendInvites(
  tx: typeof Db,
  bookingId: string,
  inviterUserId: string,
  inviteeUserIds: string[],
  message: string | null,
): Promise<SendInvitesResult | SendInvitesError> {
  if (inviteeUserIds.length === 0) return { kind: 'no_invitees' };

  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };
  if (booking.organizerUserId !== inviterUserId) return { kind: 'forbidden' };

  // De-dupe; never invite the inviter themselves.
  const cleaned = Array.from(
    new Set(inviteeUserIds.filter((id) => id !== inviterUserId)),
  );
  if (cleaned.length === 0) return { kind: 'invalid_invitee' };

  // Existing pending invites are skipped (partial unique index would block
  // anyway, but we want to return a clean response not a DB error).
  const existing = await tx
    .select({ id: bookingInvites.inviteeUserId })
    .from(bookingInvites)
    .where(
      and(
        eq(bookingInvites.bookingId, bookingId),
        eq(bookingInvites.status, 'pending'),
      ),
    );
  const skip = new Set(existing.map((r) => r.id));
  const toInsert = cleaned.filter((id) => !skip.has(id));

  if (toInsert.length === 0) {
    return { created: [], skippedExisting: cleaned };
  }

  const created = await tx
    .insert(bookingInvites)
    .values(
      toInsert.map((inviteeUserId) => ({
        bookingId,
        inviterUserId,
        inviteeUserId,
        message,
      })),
    )
    .returning();

  // Resolve inviter display name + club name once for fan-out.
  const [inviter] = await tx
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, inviterUserId))
    .limit(1);
  const [court] = await tx
    .select({ name: courts.name })
    .from(courts)
    .where(eq(courts.id, booking.courtId))
    .limit(1);

  const dateStr = booking.startAt.toISOString().slice(0, 10);
  const timeStr = booking.startAt.toISOString().slice(11, 16);

  for (const invite of created) {
    await enqueueNotificationSafe(
      {
        recipientUserId: invite.inviteeUserId,
        template: 'booking_invite_received',
        variables: {
          inviterName: inviter?.displayName ?? '',
          clubName: court?.name ?? '',
          date: dateStr,
          time: timeStr,
          bookingId,
        },
        urgency: 'medium',
        idempotencyKey: `booking_invite_received:${invite.id}`,
      },
      tx,
    );
  }

  return {
    created,
    skippedExisting: cleaned.filter((id) => skip.has(id)),
  };
}

export type RespondError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'invalid' }
  | { kind: 'capacity_reached' };

/**
 * Invitee responds. On accept we insert/upgrade booking_participants to
 * status='accepted' and bump bookings.seats_booked (capped at
 * maxParticipants) atomically.
 */
export async function respondToInvite(
  tx: typeof Db,
  inviteId: string,
  inviteeUserId: string,
  action: 'accept' | 'decline',
): Promise<{ invite: InviteRow } | RespondError> {
  const [invite] = await tx
    .select()
    .from(bookingInvites)
    .where(eq(bookingInvites.id, inviteId))
    .limit(1);
  if (!invite) return { kind: 'not_found' };
  if (invite.inviteeUserId !== inviteeUserId) return { kind: 'forbidden' };
  if (invite.status !== 'pending') return { kind: 'invalid' };
  if (invite.expiresAt.getTime() <= Date.now()) {
    // Self-heal: flip to expired in the same call so the UI can refresh.
    const [expired] = await tx
      .update(bookingInvites)
      .set({ status: 'expired', respondedAt: new Date() })
      .where(eq(bookingInvites.id, inviteId))
      .returning();
    return { invite: expired ?? invite };
  }

  if (action === 'decline') {
    const [updated] = await tx
      .update(bookingInvites)
      .set({ status: 'declined', respondedAt: new Date() })
      .where(eq(bookingInvites.id, inviteId))
      .returning();
    return { invite: updated! };
  }

  // Accept path: capacity check + seat bump + participant upsert.
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, invite.bookingId))
    .limit(1);
  if (!booking) return { kind: 'not_found' };

  if (booking.seatsBooked >= booking.maxParticipants) {
    return { kind: 'capacity_reached' };
  }

  // Upsert participant row.
  const [existingPart] = await tx
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, invite.bookingId),
        eq(bookingParticipants.userId, inviteeUserId),
      ),
    )
    .limit(1);

  if (existingPart) {
    if (existingPart.status !== 'accepted') {
      await tx
        .update(bookingParticipants)
        .set({ status: 'accepted' })
        .where(eq(bookingParticipants.id, existingPart.id));
    }
  } else {
    await tx.insert(bookingParticipants).values({
      bookingId: invite.bookingId,
      userId: inviteeUserId,
      status: 'accepted',
    });
  }

  // Bump seats_booked atomically using a conditional update so we never
  // overshoot max_participants.
  await tx
    .update(bookings)
    .set({ seatsBooked: sql`LEAST(${bookings.seatsBooked} + 1, ${bookings.maxParticipants})` })
    .where(eq(bookings.id, invite.bookingId));

  const [updated] = await tx
    .update(bookingInvites)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(eq(bookingInvites.id, inviteId))
    .returning();

  return { invite: updated! };
}

/**
 * Either side can cancel: invitee withdraws, inviter rescinds. Hard-flips
 * pending -> cancelled.
 */
export async function cancelInvite(
  tx: typeof Db,
  inviteId: string,
  actorUserId: string,
): Promise<{ invite: InviteRow } | RespondError> {
  const [invite] = await tx
    .select()
    .from(bookingInvites)
    .where(eq(bookingInvites.id, inviteId))
    .limit(1);
  if (!invite) return { kind: 'not_found' };
  if (
    invite.inviteeUserId !== actorUserId &&
    invite.inviterUserId !== actorUserId
  ) {
    return { kind: 'forbidden' };
  }
  if (invite.status !== 'pending') return { kind: 'invalid' };
  const [updated] = await tx
    .update(bookingInvites)
    .set({ status: 'cancelled', respondedAt: new Date() })
    .where(eq(bookingInvites.id, inviteId))
    .returning();
  return { invite: updated! };
}

export interface InviteWithBooking {
  invite: InviteRow;
  booking: {
    id: string;
    startAt: Date;
    endAt: Date;
    clubName: string | null;
    courtName: string | null;
  };
  inviterDisplayName: string | null;
}

/** Pending invites visible to the viewer (as invitee). */
export async function listPendingInvitesForUser(
  tx: typeof Db,
  userId: string,
): Promise<InviteWithBooking[]> {
  const rows = await tx
    .select({
      invite: bookingInvites,
      bookingId: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      courtName: courts.name,
      inviterDisplayName: users.displayName,
    })
    .from(bookingInvites)
    .innerJoin(bookings, eq(bookings.id, bookingInvites.bookingId))
    .leftJoin(courts, eq(courts.id, bookings.courtId))
    .leftJoin(users, eq(users.id, bookingInvites.inviterUserId))
    .where(
      and(
        eq(bookingInvites.inviteeUserId, userId),
        eq(bookingInvites.status, 'pending'),
        gt(bookingInvites.expiresAt, new Date()),
      ),
    );

  return rows.map((r) => ({
    invite: r.invite,
    booking: {
      id: r.bookingId,
      startAt: r.startAt,
      endAt: r.endAt,
      clubName: null,
      courtName: r.courtName,
    },
    inviterDisplayName: r.inviterDisplayName,
  }));
}

/** Count helper for nav badge. */
export async function countPendingInvitesForUser(
  tx: typeof Db,
  userId: string,
): Promise<number> {
  const rows = await tx
    .select({ id: bookingInvites.id })
    .from(bookingInvites)
    .where(
      and(
        eq(bookingInvites.inviteeUserId, userId),
        eq(bookingInvites.status, 'pending'),
        gt(bookingInvites.expiresAt, new Date()),
      ),
    );
  return rows.length;
}

/* ---------- Pure helpers (DB-free) ---------- */

export type InviteStatus = InviteRow['status'];

export function isResponsible(
  invite: Pick<InviteRow, 'status' | 'expiresAt'>,
  now: Date = new Date(),
): boolean {
  return invite.status === 'pending' && invite.expiresAt.getTime() > now.getTime();
}

/** Pure: decide what happens when a viewer tries to cancel. */
export function decideCancelOutcome(
  invite: Pick<InviteRow, 'status' | 'inviterUserId' | 'inviteeUserId'>,
  actorUserId: string,
): 'forbidden' | 'invalid' | 'ok' {
  if (
    invite.inviterUserId !== actorUserId &&
    invite.inviteeUserId !== actorUserId
  ) {
    return 'forbidden';
  }
  if (invite.status !== 'pending') return 'invalid';
  return 'ok';
}

// Silence unused or imports kept for future signed expiry sweeps.
void or;
void lt;
