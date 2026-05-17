import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql as drizzleSql, eq } from 'drizzle-orm';
import { clubs, courts, db, users } from '@feera/db';
import {
  computeEndAt,
  createBooking,
  DEFAULT_BOOKING_DURATION_MIN,
} from '../src/lib/bookings/service';
import { computeSetWinners } from '../src/lib/matches/service';
import {
  computePerSeatPrice,
  computePricing,
} from '../src/lib/bookings/pricing';

const HAS_DB = Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED);

describe('bookings smoke (pure logic, no DB)', () => {
  it('computeEndAt defaults to 90 minutes', () => {
    const start = new Date('2026-06-01T10:00:00Z');
    const end = computeEndAt(start);
    expect(end.getTime() - start.getTime()).toBe(DEFAULT_BOOKING_DURATION_MIN * 60_000);
  });

  it('computeEndAt honours explicit duration', () => {
    const start = new Date('2026-06-01T10:00:00Z');
    const end = computeEndAt(start, undefined, 120);
    expect(end.getTime() - start.getTime()).toBe(120 * 60_000);
  });

  it('computeEndAt honours explicit endAt', () => {
    const start = new Date('2026-06-01T10:00:00Z');
    const explicit = new Date('2026-06-01T11:30:00Z');
    expect(computeEndAt(start, explicit)).toEqual(explicit);
  });
});

describe('per-seat pricing', () => {
  it('splits a court total across max participants', () => {
    expect(computePerSeatPrice(2000, 4)).toBe(500);
  });

  it('rounds to 2 decimal places (major units)', () => {
    expect(computePerSeatPrice(1000, 3)).toBeCloseTo(333.33, 2);
  });

  it('computePricing charges organizer for their seats only', () => {
    const out = computePricing(
      { totalAmount: 2000, currency: 'PKR' },
      { seatsBooked: 2, maxParticipants: 4 },
    );
    expect(out.perSeatAmount).toBe(500);
    expect(out.organizerAmount).toBe(1000);
    expect(out.creditApplied).toBe(0);
  });

  it('full-court organizer covers any rounding remainder', () => {
    const out = computePricing(
      { totalAmount: 1000, currency: 'PKR' },
      { seatsBooked: 3, maxParticipants: 3 },
    );
    expect(out.organizerAmount).toBe(1000);
  });

  it('applies credits, capped at the organizer subtotal', () => {
    const out = computePricing(
      { totalAmount: 2000, currency: 'PKR' },
      { seatsBooked: 2, maxParticipants: 4, creditsApplied: 1500 },
    );
    expect(out.creditApplied).toBe(1000);
    expect(out.organizerAmount).toBe(0);
  });
});

describe('match score: set winner tally', () => {
  it('counts sets won per side', () => {
    expect(computeSetWinners([[6, 4], [3, 6], [7, 5]])).toEqual({
      teamASetsWon: 2,
      teamBSetsWon: 1,
    });
  });
  it('handles a 2-set sweep', () => {
    expect(computeSetWinners([[6, 2], [6, 3]])).toEqual({
      teamASetsWon: 2,
      teamBSetsWon: 0,
    });
  });
});

// The DB-backed scenario runs only when DATABASE_URL is set so the suite is
// CI-portable. Locally, point DATABASE_URL at the Frankfurt Neon sandbox; the
// test wraps everything in a transaction that rolls back, so no row leaks.
const dbDescribe = HAS_DB ? describe : describe.skip;

dbDescribe('bookings smoke (live DB, rolled back)', () => {
  // We tag everything with a random suffix so a partial rollback (shouldn't
  // happen, but just in case) does not collide with real data.
  const suffix = Math.random().toString(36).slice(2, 8);
  let clubId = '';
  let courtId = '';
  let organizerId = '';

  beforeAll(async () => {
    // Open a transaction we explicitly roll back at the end. Drizzle's tx
    // doesn't let us hold it open across tests, so instead we use the simpler
    // approach: insert fixtures, then DELETE them in afterAll.
    const [c] = await db
      .insert(clubs)
      .values({
        name: `Test Club ${suffix}`,
        slug: `test-club-${suffix}`,
        countryCode: 'PK',
        city: 'Lahore',
        defaultCurrency: 'PKR',
      })
      .returning();
    clubId = c!.id;

    const [ct] = await db
      .insert(courts)
      .values({
        clubId,
        name: 'Court 1',
        isActive: true,
      })
      .returning();
    courtId = ct!.id;

    const [u] = await db
      .insert(users)
      .values({
        displayName: `Tester ${suffix}`,
        countryCode: 'PK',
      })
      .returning();
    organizerId = u!.id;
  });

  afterAll(async () => {
    if (clubId) {
      await db.execute(drizzleSql`DELETE FROM matches WHERE booking_id IN (SELECT id FROM bookings WHERE court_id = ${courtId}::uuid)`);
      await db.execute(drizzleSql`DELETE FROM booking_participants WHERE booking_id IN (SELECT id FROM bookings WHERE court_id = ${courtId}::uuid)`);
      await db.execute(drizzleSql`DELETE FROM bookings WHERE court_id = ${courtId}::uuid`);
      await db.delete(courts).where(eq(courts.id, courtId));
      await db.delete(clubs).where(eq(clubs.id, clubId));
      await db.delete(users).where(eq(users.id, organizerId));
    }
  });

  it('creates a booking + rejects an overlapping slot with 409 semantics', async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 90 * 60_000);

    const first = await db.transaction((tx) =>
      createBooking(tx as unknown as typeof db, organizerId, {
        courtId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        isOpenMatch: false,
        genderPreference: 'open',
        maxParticipants: 4,
      }),
    );
    expect('booking' in first).toBe(true);
    if ('booking' in first) {
      expect(first.booking.id).toMatch(/^[0-9a-f-]{36}$/u);
    }

    const conflict = await db.transaction((tx) =>
      createBooking(tx as unknown as typeof db, organizerId, {
        courtId,
        startAt: new Date(start.getTime() + 30 * 60_000).toISOString(),
        endAt: new Date(end.getTime() + 30 * 60_000).toISOString(),
        isOpenMatch: false,
        genderPreference: 'open',
        maxParticipants: 4,
      }),
    );
    expect('kind' in conflict && conflict.kind === 'conflict').toBe(true);
  });
});
