/**
 * Pre-match check-in.
 *
 * Window: bookings.start_at - 30 min .. start_at + 30 min.
 * Once all accepted participants check in, the booking transitions to
 * status='in_progress'.
 */

import { and, eq } from 'drizzle-orm';
import { bookingParticipants, bookings } from '@feera/db';
import type { db as Db } from '@feera/db';

export const CHECKIN_WINDOW_MIN = 30;

export type CheckInError =
  | { kind: 'booking_not_found' }
  | { kind: 'not_a_participant' }
  | { kind: 'wrong_status' }
  | { kind: 'outside_window' };

export interface CheckInResult {
  participant: typeof bookingParticipants.$inferSelect;
  bookingStatus: typeof bookings.$inferSelect.status;
  allCheckedIn: boolean;
}

/**
 * Pure: is `now` inside the check-in window for a booking starting at
 * `startAt`?
 */
export function isWithinCheckInWindow(startAt: Date, now: Date = new Date()): boolean {
  const ms = startAt.getTime();
  const lo = ms - CHECKIN_WINDOW_MIN * 60_000;
  const hi = ms + CHECKIN_WINDOW_MIN * 60_000;
  const n = now.getTime();
  return n >= lo && n <= hi;
}

export async function checkIn(
  tx: typeof Db,
  bookingId: string,
  userId: string,
  now: Date = new Date(),
): Promise<CheckInResult | CheckInError> {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };
  if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
    return { kind: 'wrong_status' };
  }
  if (!isWithinCheckInWindow(booking.startAt, now)) {
    return { kind: 'outside_window' };
  }

  const [participant] = await tx
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, bookingId),
        eq(bookingParticipants.userId, userId),
      ),
    )
    .limit(1);
  if (!participant || participant.status !== 'accepted') {
    return { kind: 'not_a_participant' };
  }

  let updatedParticipant = participant;
  if (!participant.checkedInAt) {
    const [upd] = await tx
      .update(bookingParticipants)
      .set({ checkedInAt: now })
      .where(eq(bookingParticipants.id, participant.id))
      .returning();
    updatedParticipant = upd ?? participant;
  }

  // Re-read all participants to decide on the transition.
  const allParts = await tx
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId));
  const accepted = allParts.filter((p) => p.status === 'accepted');
  const everyoneIn =
    accepted.length >= booking.maxParticipants &&
    accepted.every((p) => p.checkedInAt != null);

  let nextStatus: 'confirmed' | 'in_progress' =
    booking.status === 'in_progress' ? 'in_progress' : 'confirmed';
  if (everyoneIn && booking.status === 'confirmed') {
    const [updBooking] = await tx
      .update(bookings)
      .set({ status: 'in_progress' })
      .where(eq(bookings.id, bookingId))
      .returning({ status: bookings.status });
    nextStatus =
      (updBooking?.status as 'confirmed' | 'in_progress' | undefined) ??
      'in_progress';
  }

  return {
    participant: updatedParticipant,
    bookingStatus: nextStatus,
    allCheckedIn: everyoneIn,
  };
}
