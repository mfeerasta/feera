import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql as drizzleSql, and, eq } from 'drizzle-orm';
import {
  bookingJoinRequests,
  bookingParticipants,
  bookings,
  clubs,
  courts,
  db,
  users,
} from '@feera/db';
import { createBooking } from '../src/lib/bookings/service';
import {
  approveJoin,
  requestJoin,
} from '../src/lib/bookings/join-requests';

const HAS_DB = Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED);
const dbDescribe = HAS_DB ? describe : describe.skip;

dbDescribe('booking slots + join requests (live DB)', () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  let clubId = '';
  let courtId = '';
  let organizerId = '';
  let strangerOneId = '';
  let strangerTwoId = '';
  let strangerThreeId = '';
  let bookingId = '';

  beforeAll(async () => {
    const [c] = await db
      .insert(clubs)
      .values({
        name: `Slot Test Club ${suffix}`,
        slug: `slot-test-${suffix}`,
        countryCode: 'PK',
        city: 'Lahore',
        defaultCurrency: 'PKR',
      })
      .returning();
    clubId = c!.id;

    const [ct] = await db
      .insert(courts)
      .values({ clubId, name: 'Court A', isActive: true })
      .returning();
    courtId = ct!.id;

    const inserts = await Promise.all(
      ['organizer', 'stranger1', 'stranger2', 'stranger3'].map((tag) =>
        db
          .insert(users)
          .values({ displayName: `${tag}-${suffix}`, countryCode: 'PK' })
          .returning(),
      ),
    );
    organizerId = inserts[0]![0]!.id;
    strangerOneId = inserts[1]![0]!.id;
    strangerTwoId = inserts[2]![0]!.id;
    strangerThreeId = inserts[3]![0]!.id;
  });

  afterAll(async () => {
    if (!clubId) return;
    await db.execute(
      drizzleSql`DELETE FROM booking_join_requests WHERE booking_id IN (SELECT id FROM bookings WHERE court_id = ${courtId}::uuid)`,
    );
    await db.execute(
      drizzleSql`DELETE FROM booking_participants WHERE booking_id IN (SELECT id FROM bookings WHERE court_id = ${courtId}::uuid)`,
    );
    await db.execute(
      drizzleSql`DELETE FROM bookings WHERE court_id = ${courtId}::uuid`,
    );
    await db.delete(courts).where(eq(courts.id, courtId));
    await db.delete(clubs).where(eq(clubs.id, clubId));
    for (const uid of [organizerId, strangerOneId, strangerTwoId, strangerThreeId]) {
      if (uid) await db.delete(users).where(eq(users.id, uid));
    }
  });

  it('creates a booking with 2 seats and 2 open', async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 90 * 60_000);

    const result = await db.transaction((tx) =>
      createBooking(tx as unknown as typeof db, organizerId, {
        courtId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        isOpenMatch: true,
        genderPreference: 'open',
        maxParticipants: 4,
        seatsBooked: 2,
      }),
    );
    expect('booking' in result).toBe(true);
    if (!('booking' in result)) throw new Error('booking not returned');
    bookingId = result.booking.id;
    expect(result.booking.seatsBooked).toBe(2);
    expect(result.booking.maxParticipants - result.booking.seatsBooked).toBe(2);
    expect(result.booking.isOpenMatch).toBe(true);
  });

  it('stranger 1 can request to join', async () => {
    const result = await db.transaction((tx) =>
      requestJoin(tx as unknown as typeof db, {
        bookingId,
        requesterUserId: strangerOneId,
        seatsRequested: 1,
        message: 'looking for a casual game',
      }),
    );
    expect('row' in result).toBe(true);
    if ('row' in result) {
      expect(result.row.status).toBe('pending');
    }
  });

  it('organizer approves stranger 1, seats_booked becomes 3', async () => {
    const [req] = await db
      .select()
      .from(bookingJoinRequests)
      .where(
        and(
          eq(bookingJoinRequests.bookingId, bookingId),
          eq(bookingJoinRequests.requesterUserId, strangerOneId),
        ),
      )
      .limit(1);
    expect(req).toBeTruthy();

    const result = await db.transaction((tx) =>
      approveJoin(tx as unknown as typeof db, bookingId, req!.id, {
        userId: organizerId,
        isAdmin: false,
      }),
    );
    expect('booking' in result).toBe(true);
    if (!('booking' in result)) throw new Error('approve failed');
    expect(result.booking.seatsBooked).toBe(3);
    expect(result.booking.isOpenMatch).toBe(true);
    expect(result.request.status).toBe('approved');

    const parts = await db
      .select()
      .from(bookingParticipants)
      .where(
        and(
          eq(bookingParticipants.bookingId, bookingId),
          eq(bookingParticipants.userId, strangerOneId),
        ),
      );
    expect(parts.length).toBe(1);
    expect(parts[0]!.status).toBe('accepted');
  });

  it('stranger 2 fills the last seat, court becomes full', async () => {
    const req = await db.transaction((tx) =>
      requestJoin(tx as unknown as typeof db, {
        bookingId,
        requesterUserId: strangerTwoId,
        seatsRequested: 1,
      }),
    );
    expect('row' in req).toBe(true);
    if (!('row' in req)) throw new Error('request failed');

    const approve = await db.transaction((tx) =>
      approveJoin(tx as unknown as typeof db, bookingId, req.row.id, {
        userId: organizerId,
        isAdmin: false,
      }),
    );
    if (!('booking' in approve)) throw new Error('approve failed');
    expect(approve.booking.seatsBooked).toBe(4);
    expect(approve.booking.isOpenMatch).toBe(false);
  });

  it('stranger 3 cannot join a full court', async () => {
    const result = await db.transaction((tx) =>
      requestJoin(tx as unknown as typeof db, {
        bookingId,
        requesterUserId: strangerThreeId,
        seatsRequested: 1,
      }),
    );
    expect('kind' in result).toBe(true);
    if ('kind' in result) {
      // Either not_open_match (flag flipped) or no_seats_available.
      expect(['not_open_match', 'no_seats_available']).toContain(result.kind);
    }
  });
});
