import { and, eq, gte, lt } from 'drizzle-orm';
import {
  bookings,
  courtClosures,
  courts as courtsTable,
  clubs as clubsTable,
} from '@feera/db';
import type { db as Db } from '@feera/db';

export type SlotStatus = 'free' | 'open' | 'confirmed' | 'closed';

export interface SlotKey {
  courtId: string;
  startAt: Date;
}

export interface SlotInfo {
  courtId: string;
  startAt: Date;
  endAt: Date;
  status: SlotStatus;
  bookingId?: string;
  closureId?: string;
  reason?: string | null;
}

export const SLOT_MINUTES = 30;

export function buildSlotGrid(args: {
  courtIds: string[];
  start: Date;
  days: number;
  bookings: Array<{
    id: string;
    courtId: string;
    startAt: Date;
    endAt: Date;
    status: string;
    isOpenMatch: boolean;
  }>;
  closures: Array<{
    id: string;
    courtId: string;
    startAt: Date;
    endAt: Date;
    reason: string | null;
  }>;
}): SlotInfo[] {
  const totalSlots = (args.days * 24 * 60) / SLOT_MINUTES;
  const grid: SlotInfo[] = [];
  for (const courtId of args.courtIds) {
    for (let i = 0; i < totalSlots; i++) {
      const slotStart = new Date(args.start.getTime() + i * SLOT_MINUTES * 60_000);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000);
      let status: SlotStatus = 'free';
      let bookingId: string | undefined;
      let closureId: string | undefined;
      let reason: string | null | undefined;

      const closure = args.closures.find(
        (cl) =>
          cl.courtId === courtId &&
          cl.startAt < slotEnd &&
          cl.endAt > slotStart,
      );
      if (closure) {
        status = 'closed';
        closureId = closure.id;
        reason = closure.reason;
      } else {
        const booking = args.bookings.find(
          (b) =>
            b.courtId === courtId &&
            (b.status === 'pending' || b.status === 'confirmed') &&
            b.startAt < slotEnd &&
            b.endAt > slotStart,
        );
        if (booking) {
          status = booking.isOpenMatch ? 'open' : 'confirmed';
          bookingId = booking.id;
        }
      }

      grid.push({ courtId, startAt: slotStart, endAt: slotEnd, status, bookingId, closureId, reason });
    }
  }
  return grid;
}

export async function loadCalendarData(
  tx: typeof Db,
  args: { clubSlug: string; start: Date; days: number },
) {
  const [club] = await tx
    .select({ id: clubsTable.id })
    .from(clubsTable)
    .where(eq(clubsTable.slug, args.clubSlug))
    .limit(1);
  if (!club) return null;

  const cts = await tx
    .select({ id: courtsTable.id, name: courtsTable.name })
    .from(courtsTable)
    .where(and(eq(courtsTable.clubId, club.id), eq(courtsTable.isActive, true)));

  const end = new Date(args.start.getTime() + args.days * 24 * 60 * 60 * 1000);

  const courtIds = cts.map((c) => c.id);
  if (courtIds.length === 0) {
    return { clubId: club.id, courts: cts, bookings: [], closures: [], start: args.start, days: args.days };
  }

  // Drizzle inArray import-less workaround: use OR via raw SQL is heavier;
  // but inArray is exported. Pull dynamically to avoid an extra import line cost.
  const { inArray } = await import('drizzle-orm');
  const bks = await tx
    .select({
      id: bookings.id,
      courtId: bookings.courtId,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      status: bookings.status,
      isOpenMatch: bookings.isOpenMatch,
    })
    .from(bookings)
    .where(
      and(
        inArray(bookings.courtId, courtIds),
        gte(bookings.startAt, args.start),
        lt(bookings.startAt, end),
      ),
    );

  const cls = await tx
    .select({
      id: courtClosures.id,
      courtId: courtClosures.courtId,
      startAt: courtClosures.startAt,
      endAt: courtClosures.endAt,
      reason: courtClosures.reason,
    })
    .from(courtClosures)
    .where(
      and(
        inArray(courtClosures.courtId, courtIds),
        gte(courtClosures.startAt, args.start),
        lt(courtClosures.startAt, end),
      ),
    );

  return {
    clubId: club.id,
    courts: cts,
    bookings: bks,
    closures: cls,
    start: args.start,
    days: args.days,
  };
}
