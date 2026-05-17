import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  bookingJoinRequests,
  bookingParticipants,
  bookings,
  clubStaff,
  courts,
  userRatings,
} from '@feera/db';
import type { db as Db } from '@feera/db';

/**
 * Slot-level join request workflow.
 *
 * The organizer (or club staff) owns approval. Each approval inserts a
 * booking_participants row (status='accepted') and bumps bookings.seats_booked
 * atomically. When seats_booked reaches max_participants, is_open_match flips
 * to false so the booking drops out of the discovery feed.
 *
 * All mutations run inside a SERIALIZABLE transaction so two concurrent
 * approvals can't overfill the court.
 */

export type JoinRequestError =
  | { kind: 'booking_not_found' }
  | { kind: 'not_open_match' }
  | { kind: 'no_seats_available' }
  | { kind: 'already_participant' }
  | { kind: 'duplicate_request' }
  | { kind: 'request_not_found' }
  | { kind: 'forbidden' }
  | { kind: 'wrong_status' }
  | { kind: 'booking_started' };

interface ActorContext {
  userId: string;
  isAdmin: boolean;
}

async function isClubStaffForBooking(
  tx: typeof Db,
  bookingId: string,
  userId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: clubStaff.id })
    .from(clubStaff)
    .innerJoin(courts, eq(courts.clubId, clubStaff.clubId))
    .innerJoin(bookings, eq(bookings.courtId, courts.id))
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(clubStaff.userId, userId),
        eq(clubStaff.isActive, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function setSerializable(tx: typeof Db): Promise<void> {
  await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
}

export interface RequestJoinInput {
  bookingId: string;
  requesterUserId: string;
  seatsRequested: number;
  message?: string;
}

export async function requestJoin(
  tx: typeof Db,
  input: RequestJoinInput,
): Promise<
  { row: typeof bookingJoinRequests.$inferSelect } | JoinRequestError
> {
  await setSerializable(tx);

  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, input.bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };
  if (!booking.isOpenMatch) return { kind: 'not_open_match' };
  if (booking.startAt < new Date()) return { kind: 'booking_started' };

  const seatsOpen = booking.maxParticipants - booking.seatsBooked;
  if (seatsOpen <= 0 || input.seatsRequested > seatsOpen) {
    return { kind: 'no_seats_available' };
  }

  // Already a participant?
  const existingPart = await tx
    .select()
    .from(bookingParticipants)
    .where(
      and(
        eq(bookingParticipants.bookingId, input.bookingId),
        eq(bookingParticipants.userId, input.requesterUserId),
        inArray(bookingParticipants.status, ['accepted', 'invited']),
      ),
    )
    .limit(1);
  if (existingPart.length > 0) return { kind: 'already_participant' };

  // Duplicate pending request?
  const existingReq = await tx
    .select()
    .from(bookingJoinRequests)
    .where(
      and(
        eq(bookingJoinRequests.bookingId, input.bookingId),
        eq(bookingJoinRequests.requesterUserId, input.requesterUserId),
        eq(bookingJoinRequests.status, 'pending'),
      ),
    )
    .limit(1);
  if (existingReq.length > 0) return { kind: 'duplicate_request' };

  // Snapshot rating display at request time so organizer sees what they had.
  const [rating] = await tx
    .select({ ratingDisplay: userRatings.ratingDisplay })
    .from(userRatings)
    .where(eq(userRatings.userId, input.requesterUserId))
    .limit(1);

  const [row] = await tx
    .insert(bookingJoinRequests)
    .values({
      bookingId: input.bookingId,
      requesterUserId: input.requesterUserId,
      seatsRequested: input.seatsRequested,
      message: input.message,
      requesterRatingDisplay: rating?.ratingDisplay ?? null,
    })
    .returning();
  if (!row) throw new Error('join request insert returned no row');

  // TODO(@feera/notifications M6): emit booking.join_requested event to organizer.
  console.log('[booking.join_requested]', {
    bookingId: input.bookingId,
    requesterUserId: input.requesterUserId,
    requestId: row.id,
    seatsRequested: input.seatsRequested,
  });

  return { row };
}

async function loadRequestAndAuthorize(
  tx: typeof Db,
  bookingId: string,
  requestId: string,
  actor: ActorContext,
): Promise<
  | { booking: typeof bookings.$inferSelect; request: typeof bookingJoinRequests.$inferSelect }
  | JoinRequestError
> {
  const [request] = await tx
    .select()
    .from(bookingJoinRequests)
    .where(
      and(
        eq(bookingJoinRequests.id, requestId),
        eq(bookingJoinRequests.bookingId, bookingId),
      ),
    )
    .limit(1);
  if (!request) return { kind: 'request_not_found' };

  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { kind: 'booking_not_found' };

  if (
    !actor.isAdmin &&
    booking.organizerUserId !== actor.userId &&
    !(await isClubStaffForBooking(tx, bookingId, actor.userId))
  ) {
    return { kind: 'forbidden' };
  }

  return { booking, request };
}

export async function approveJoin(
  tx: typeof Db,
  bookingId: string,
  requestId: string,
  actor: ActorContext,
): Promise<
  | { request: typeof bookingJoinRequests.$inferSelect; booking: typeof bookings.$inferSelect }
  | JoinRequestError
> {
  await setSerializable(tx);
  const loaded = await loadRequestAndAuthorize(tx, bookingId, requestId, actor);
  if ('kind' in loaded) return loaded;
  const { booking, request } = loaded;

  if (request.status !== 'pending') return { kind: 'wrong_status' };

  const seatsOpen = booking.maxParticipants - booking.seatsBooked;
  if (seatsOpen < request.seatsRequested) {
    return { kind: 'no_seats_available' };
  }

  // Insert participant row(s). seats_requested > 1 means the requester is
  // booking themselves plus N guests; we only insert the requester as a known
  // user, and account for the remaining seats numerically against capacity.
  // Future work: support named guest entries (M5).
  await tx.insert(bookingParticipants).values({
    bookingId,
    userId: request.requesterUserId,
    status: 'accepted',
  });

  const newSeatsBooked = booking.seatsBooked + request.seatsRequested;
  const stillOpen = newSeatsBooked < booking.maxParticipants;

  const [updatedBooking] = await tx
    .update(bookings)
    .set({
      seatsBooked: newSeatsBooked,
      isOpenMatch: stillOpen,
    })
    .where(eq(bookings.id, bookingId))
    .returning();

  const [updatedRequest] = await tx
    .update(bookingJoinRequests)
    .set({
      status: 'approved',
      respondedByUserId: actor.userId,
      respondedAt: new Date(),
    })
    .where(eq(bookingJoinRequests.id, requestId))
    .returning();

  // TODO(@feera/notifications M6): emit booking.join_approved to requester.
  console.log('[booking.join_approved]', {
    bookingId,
    requestId,
    requesterUserId: request.requesterUserId,
    seatsBooked: newSeatsBooked,
  });

  if (!updatedBooking || !updatedRequest) {
    throw new Error('approveJoin: update returned no row');
  }
  return { booking: updatedBooking, request: updatedRequest };
}

export async function declineJoin(
  tx: typeof Db,
  bookingId: string,
  requestId: string,
  actor: ActorContext,
): Promise<
  { request: typeof bookingJoinRequests.$inferSelect } | JoinRequestError
> {
  const loaded = await loadRequestAndAuthorize(tx, bookingId, requestId, actor);
  if ('kind' in loaded) return loaded;
  if (loaded.request.status !== 'pending') return { kind: 'wrong_status' };

  const [updated] = await tx
    .update(bookingJoinRequests)
    .set({
      status: 'declined',
      respondedByUserId: actor.userId,
      respondedAt: new Date(),
    })
    .where(eq(bookingJoinRequests.id, requestId))
    .returning();

  // TODO(@feera/notifications M6): emit booking.join_declined.
  console.log('[booking.join_declined]', {
    bookingId,
    requestId,
    requesterUserId: loaded.request.requesterUserId,
  });

  if (!updated) throw new Error('declineJoin: update returned no row');
  return { request: updated };
}

export async function cancelJoinRequest(
  tx: typeof Db,
  bookingId: string,
  requestId: string,
  actorUserId: string,
): Promise<
  { request: typeof bookingJoinRequests.$inferSelect } | JoinRequestError
> {
  const [request] = await tx
    .select()
    .from(bookingJoinRequests)
    .where(
      and(
        eq(bookingJoinRequests.id, requestId),
        eq(bookingJoinRequests.bookingId, bookingId),
      ),
    )
    .limit(1);
  if (!request) return { kind: 'request_not_found' };
  if (request.requesterUserId !== actorUserId) return { kind: 'forbidden' };
  if (request.status !== 'pending') return { kind: 'wrong_status' };

  const [updated] = await tx
    .update(bookingJoinRequests)
    .set({ status: 'cancelled' })
    .where(eq(bookingJoinRequests.id, requestId))
    .returning();
  if (!updated) throw new Error('cancelJoinRequest: update returned no row');
  return { request: updated };
}

export interface ListJoinRequestsFilters {
  bookingId: string;
  status?:
    | 'pending'
    | 'approved'
    | 'declined'
    | 'cancelled'
    | 'expired';
}

export async function listJoinRequestsForBooking(
  tx: typeof Db,
  f: ListJoinRequestsFilters,
) {
  const filters = [eq(bookingJoinRequests.bookingId, f.bookingId)];
  if (f.status) filters.push(eq(bookingJoinRequests.status, f.status));
  return tx
    .select()
    .from(bookingJoinRequests)
    .where(and(...filters))
    .orderBy(desc(bookingJoinRequests.createdAt));
}
