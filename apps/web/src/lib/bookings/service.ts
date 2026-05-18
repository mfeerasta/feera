import { and, desc, eq, gte, isNull, lte, type SQL } from 'drizzle-orm';
import {
  bookingParticipants,
  bookings,
  courts,
  users,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import { resolvePricing } from './pricing';
import { hasCourtConflict } from './conflict';
import { enqueueNotificationSafe } from '@/lib/notifications/outbox';
import type { BookingCreateInput, BookingUpdateInput } from '@/lib/api/booking-schemas';

export const DEFAULT_BOOKING_DURATION_MIN = 90;

export type CreateBookingError =
  | { kind: 'court_not_found' }
  | { kind: 'court_inactive' }
  | { kind: 'organizer_not_found' }
  | { kind: 'conflict' }
  | { kind: 'invalid_window' };

export interface CreateBookingResult {
  booking: typeof bookings.$inferSelect;
  priceWarning?: 'no_pricing_rule_matched';
}

export function computeEndAt(
  startAt: Date,
  endAt?: Date,
  durationMinutes?: number,
): Date {
  if (endAt) return endAt;
  const minutes = durationMinutes ?? DEFAULT_BOOKING_DURATION_MIN;
  return new Date(startAt.getTime() + minutes * 60_000);
}

export async function createBooking(
  tx: typeof Db,
  organizerUserId: string,
  input: BookingCreateInput,
): Promise<CreateBookingResult | CreateBookingError> {
  const startAt = new Date(input.startAt);
  const endAt = computeEndAt(
    startAt,
    input.endAt ? new Date(input.endAt) : undefined,
    input.durationMinutes,
  );
  if (Number.isNaN(startAt.getTime()) || endAt <= startAt) {
    return { kind: 'invalid_window' };
  }

  const [court] = await tx
    .select()
    .from(courts)
    .where(eq(courts.id, input.courtId))
    .limit(1);
  if (!court) return { kind: 'court_not_found' };
  if (!court.isActive) return { kind: 'court_inactive' };

  const [organizer] = await tx
    .select()
    .from(users)
    .where(eq(users.id, organizerUserId))
    .limit(1);
  if (!organizer) return { kind: 'organizer_not_found' };

  if (
    await hasCourtConflict(tx, {
      courtId: input.courtId,
      startAt,
      endAt,
    })
  ) {
    return { kind: 'conflict' };
  }

  const isEditionMember = organizer.editionMemberStatus === 'active';
  const pricing = await resolvePricing(tx, {
    courtId: input.courtId,
    startAt,
    endAt,
    isEditionMember,
  });

  // Slot-level semantics: organizer always occupies at least 1 seat. If the
  // organizer brought N friends (participantUserIds), seatsBooked defaults to
  // 1 + N (capped at maxParticipants). Caller may override via input.seatsBooked.
  // When seatsBooked < maxParticipants, mark the booking as an open match so
  // remaining seats are discoverable by strangers.
  const invitedCount = input.participantUserIds
    ? new Set(input.participantUserIds.filter((id) => id !== organizerUserId)).size
    : 0;
  const inferredSeats = Math.min(1 + invitedCount, input.maxParticipants);
  const seatsBooked = Math.min(
    Math.max(input.seatsBooked ?? inferredSeats, 1),
    input.maxParticipants,
  );
  const isOpenMatch = input.isOpenMatch || seatsBooked < input.maxParticipants;

  const [booking] = await tx
    .insert(bookings)
    .values({
      courtId: input.courtId,
      organizerUserId,
      startAt,
      endAt,
      totalAmount: pricing.totalAmount,
      currency: pricing.currency,
      isOpenMatch,
      requiredLevelMin: input.requiredLevelMin,
      requiredLevelMax: input.requiredLevelMax,
      genderPreference: input.genderPreference,
      maxParticipants: input.maxParticipants,
      seatsBooked,
      isEditionPriority: isEditionMember,
      notes: input.notes,
    })
    .returning();

  if (!booking) throw new Error('booking insert returned no row');

  // Organizer is always an accepted participant.
  await tx.insert(bookingParticipants).values({
    bookingId: booking.id,
    userId: organizerUserId,
    status: 'accepted',
  });

  let invitedIds: string[] = [];
  if (input.participantUserIds && input.participantUserIds.length > 0) {
    invitedIds = Array.from(
      new Set(input.participantUserIds.filter((id) => id !== organizerUserId)),
    );
    if (invitedIds.length > 0) {
      await tx.insert(bookingParticipants).values(
        invitedIds.map((userId) => ({
          bookingId: booking.id,
          userId,
          status: 'invited' as const,
        })),
      );
    }
  }

  // Fan-out booking_confirmed to organizer + every invited participant.
  const dateStr = booking.startAt.toISOString().slice(0, 10);
  const timeStr = booking.startAt.toISOString().slice(11, 16);
  const recipients = [organizerUserId, ...invitedIds];
  for (const userId of recipients) {
    await enqueueNotificationSafe(
      {
        recipientUserId: userId,
        template: 'booking_confirmed',
        variables: {
          clubName: court.name ?? 'the club',
          date: dateStr,
          time: timeStr,
          bookingId: booking.id,
        },
        urgency: 'high',
        idempotencyKey: `booking_confirmed:${booking.id}:${userId}`,
      },
      tx,
    );
  }

  return { booking, priceWarning: pricing.warning };
}

export interface BookingListFilters {
  organizerUserId?: string;
  courtId?: string;
  status?: 'pending' | 'confirmed' | 'in_progress' | 'cancelled' | 'completed' | 'no_show';
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export async function listBookings(tx: typeof Db, f: BookingListFilters) {
  const filters: SQL[] = [];
  if (f.organizerUserId) filters.push(eq(bookings.organizerUserId, f.organizerUserId));
  if (f.courtId) filters.push(eq(bookings.courtId, f.courtId));
  if (f.status) filters.push(eq(bookings.status, f.status));
  if (f.from) filters.push(gte(bookings.startAt, f.from));
  if (f.to) filters.push(lte(bookings.startAt, f.to));

  return tx
    .select()
    .from(bookings)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(bookings.startAt))
    .limit(f.limit)
    .offset(f.offset);
}

export async function getBookingWithParticipants(tx: typeof Db, id: string) {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!booking) return null;
  const participants = await tx
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, id));
  return { ...booking, participants };
}

export type UpdateBookingError =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'conflict' }
  | { kind: 'cannot_change_after_start' };

export async function updateBooking(
  tx: typeof Db,
  bookingId: string,
  actorUserId: string,
  isAdmin: boolean,
  input: BookingUpdateInput,
): Promise<{ booking: typeof bookings.$inferSelect } | UpdateBookingError> {
  const [existing] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!existing) return { kind: 'not_found' };
  if (!isAdmin && existing.organizerUserId !== actorUserId) {
    return { kind: 'forbidden' };
  }

  const newStartAt = input.startAt ? new Date(input.startAt) : existing.startAt;
  const newEndAt = input.endAt ? new Date(input.endAt) : existing.endAt;

  if (
    (input.startAt || input.endAt) &&
    existing.startAt < new Date() &&
    existing.status !== 'pending'
  ) {
    return { kind: 'cannot_change_after_start' };
  }

  if (input.startAt || input.endAt) {
    if (
      await hasCourtConflict(tx, {
        courtId: existing.courtId,
        startAt: newStartAt,
        endAt: newEndAt,
        excludeBookingId: bookingId,
      })
    ) {
      return { kind: 'conflict' };
    }
  }

  const patch: Partial<typeof bookings.$inferInsert> = {};
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.genderPreference) patch.genderPreference = input.genderPreference;
  if (input.maxParticipants !== undefined) patch.maxParticipants = input.maxParticipants;
  if (input.isOpenMatch !== undefined) patch.isOpenMatch = input.isOpenMatch;
  if (input.requiredLevelMin !== undefined)
    patch.requiredLevelMin = input.requiredLevelMin ?? null;
  if (input.requiredLevelMax !== undefined)
    patch.requiredLevelMax = input.requiredLevelMax ?? null;
  if (input.startAt) patch.startAt = newStartAt;
  if (input.endAt) patch.endAt = newEndAt;

  const [updated] = await tx
    .update(bookings)
    .set(patch)
    .where(eq(bookings.id, bookingId))
    .returning();
  if (!updated) return { kind: 'not_found' };
  return { booking: updated };
}

export async function cancelBooking(
  tx: typeof Db,
  bookingId: string,
  actorUserId: string,
  isAdmin: boolean,
  reason: string = 'cancelled by organizer',
): Promise<{ booking: typeof bookings.$inferSelect } | { kind: 'not_found' | 'forbidden' | 'already_cancelled' }> {
  const [existing] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!existing) return { kind: 'not_found' };
  if (!isAdmin && existing.organizerUserId !== actorUserId) {
    return { kind: 'forbidden' };
  }
  if (existing.status === 'cancelled') return { kind: 'already_cancelled' };

  const [updated] = await tx
    .update(bookings)
    .set({ status: 'cancelled' })
    .where(eq(bookings.id, bookingId))
    .returning();

  if (updated) {
    // Notify every participant whose status is invited/accepted, plus pending joiners.
    const parts = await tx
      .select({ userId: bookingParticipants.userId })
      .from(bookingParticipants)
      .where(eq(bookingParticipants.bookingId, bookingId));
    const [court] = await tx
      .select({ name: courts.name })
      .from(courts)
      .where(eq(courts.id, existing.courtId))
      .limit(1);
    const dateStr = existing.startAt.toISOString().slice(0, 10);
    const timeStr = existing.startAt.toISOString().slice(11, 16);

    // Lazy import of bookingJoinRequests to avoid a circular schema dep at module init.
    const { bookingJoinRequests } = await import('@feera/db');
    const pending = await tx
      .select({ userId: bookingJoinRequests.requesterUserId })
      .from(bookingJoinRequests)
      .where(
        and(
          eq(bookingJoinRequests.bookingId, bookingId),
          eq(bookingJoinRequests.status, 'pending'),
        ),
      );

    const recipients = new Set<string>([
      ...parts.map((p) => p.userId),
      ...pending.map((p) => p.userId),
    ]);
    for (const userId of recipients) {
      await enqueueNotificationSafe(
        {
          recipientUserId: userId,
          template: 'booking_cancelled',
          variables: {
            clubName: court?.name ?? 'the club',
            date: dateStr,
            time: timeStr,
            bookingId,
            reason,
          },
          urgency: 'high',
          idempotencyKey: `booking_cancelled:${bookingId}:${userId}`,
        },
        tx,
      );
    }
  }

  // TODO(M3-C @feera/payments): trigger refund via payments router using
  // booking.id as idempotency key. Refund policy per region in ADR-0003.
  return updated ? { booking: updated } : { kind: 'not_found' };
}

export async function confirmBooking(
  tx: typeof Db,
  bookingId: string,
  actorUserId: string,
  isAdmin: boolean,
): Promise<
  | { booking: typeof bookings.$inferSelect }
  | { kind: 'not_found' | 'forbidden' | 'not_ready' | 'wrong_status' }
> {
  const [existing] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!existing) return { kind: 'not_found' };
  if (!isAdmin && existing.organizerUserId !== actorUserId) {
    return { kind: 'forbidden' };
  }
  if (existing.status !== 'pending') return { kind: 'wrong_status' };

  const parts = await tx
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId));

  const acceptedCount = parts.filter((p) => p.status === 'accepted').length;
  if (acceptedCount < existing.maxParticipants) return { kind: 'not_ready' };

  const organizerPart = parts.find((p) => p.userId === existing.organizerUserId);
  if (!organizerPart || organizerPart.paymentStatus !== 'paid') {
    return { kind: 'not_ready' };
  }

  const [updated] = await tx
    .update(bookings)
    .set({ status: 'confirmed' })
    .where(eq(bookings.id, bookingId))
    .returning();
  return updated ? { booking: updated } : { kind: 'not_found' };
}
