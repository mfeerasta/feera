import { and, eq } from 'drizzle-orm';
import { bookingParticipants, bookings } from '@feera/db';
import type { db as Db } from '@feera/db';

export type ParticipantError =
  | { kind: 'booking_not_found' }
  | { kind: 'forbidden' }
  | { kind: 'already_invited' }
  | { kind: 'capacity_reached' }
  | { kind: 'participant_not_found' };

export async function inviteParticipant(
  tx: typeof Db,
  bookingId: string,
  actorUserId: string,
  isAdmin: boolean,
  userId: string,
): Promise<{ row: typeof bookingParticipants.$inferSelect } | ParticipantError> {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };
  if (!isAdmin && booking.organizerUserId !== actorUserId) {
    return { kind: 'forbidden' };
  }

  const existing = await tx
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, bookingId),
        eq(bookingParticipants.userId, userId),
      ),
    )
    .limit(1);
  if (existing.length > 0) return { kind: 'already_invited' };

  const current = await tx
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId));
  const activeCount = current.filter(
    (p) => p.status === 'invited' || p.status === 'accepted',
  ).length;
  if (activeCount >= booking.maxParticipants) {
    return { kind: 'capacity_reached' };
  }

  const [row] = await tx
    .insert(bookingParticipants)
    .values({ bookingId, userId, status: 'invited' })
    .returning();
  if (!row) throw new Error('participant insert returned no row');
  return { row };
}

export async function removeParticipant(
  tx: typeof Db,
  bookingId: string,
  participantId: string,
  actorUserId: string,
  isAdmin: boolean,
): Promise<{ row: typeof bookingParticipants.$inferSelect } | ParticipantError> {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };
  if (!isAdmin && booking.organizerUserId !== actorUserId) {
    return { kind: 'forbidden' };
  }
  const [updated] = await tx
    .update(bookingParticipants)
    .set({ status: 'removed' })
    .where(
      and(
        eq(bookingParticipants.id, participantId),
        eq(bookingParticipants.bookingId, bookingId),
      ),
    )
    .returning();
  if (!updated) return { kind: 'participant_not_found' };
  return { row: updated };
}

export async function rsvpParticipant(
  tx: typeof Db,
  bookingId: string,
  participantId: string,
  actorUserId: string,
  isAdmin: boolean,
  status: 'accepted' | 'declined',
): Promise<{ row: typeof bookingParticipants.$inferSelect } | ParticipantError> {
  const [part] = await tx
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.id, participantId),
        eq(bookingParticipants.bookingId, bookingId),
      ),
    )
    .limit(1);
  if (!part) return { kind: 'participant_not_found' };
  if (!isAdmin && part.userId !== actorUserId) return { kind: 'forbidden' };

  const paymentStatus = status === 'declined' ? 'waived' : part.paymentStatus;
  const [updated] = await tx
    .update(bookingParticipants)
    .set({ status, paymentStatus })
    .where(eq(bookingParticipants.id, participantId))
    .returning();
  if (!updated) return { kind: 'participant_not_found' };
  return { row: updated };
}
