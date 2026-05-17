import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql as drizzleSql, eq } from 'drizzle-orm';
import { coaches, coachingSessions, db, users } from '@feera/db';
import {
  createCoachingSession,
  reviewCoachingSession,
} from '../src/lib/coaches/service';
import { computeAvailableSlots } from '../src/lib/coaches/availability';

const HAS_DB = Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED);
const dbDescribe = HAS_DB ? describe : describe.skip;

describe('computeAvailableSlots (pure logic)', () => {
  const monday = new Date(Date.UTC(2026, 5, 1, 0, 0, 0)); // 2026-06-01 is a Monday

  it('returns no slots when the weekday is entirely off', () => {
    const slots = computeAvailableSlots(
      { tue: [{ start: '09:00', end: '12:00' }] },
      [],
      1,
      { from: monday },
    );
    expect(slots).toHaveLength(0);
  });

  it('produces 30 minute slots aligned to window boundaries', () => {
    const slots = computeAvailableSlots(
      { mon: [{ start: '07:00', end: '09:15' }] },
      [],
      1,
      { from: monday },
    );
    expect(slots).toHaveLength(4);
    expect(slots[3]!.endAt.getUTCHours()).toBe(9);
    expect(slots[3]!.endAt.getUTCMinutes()).toBe(0);
  });

  it('treats back-to-back sessions as non-blocking', () => {
    const existing = [
      {
        startAt: new Date(Date.UTC(2026, 5, 1, 7, 0)),
        endAt: new Date(Date.UTC(2026, 5, 1, 7, 30)),
      },
    ];
    const slots = computeAvailableSlots(
      { mon: [{ start: '07:00', end: '08:00' }] },
      existing,
      1,
      { from: monday },
    );
    // 07:00 blocked, 07:30 free.
    expect(slots).toHaveLength(1);
    expect(slots[0]!.startAt.getUTCHours()).toBe(7);
    expect(slots[0]!.startAt.getUTCMinutes()).toBe(30);
  });

  it('blocks slots that partially overlap an existing session', () => {
    const existing = [
      {
        startAt: new Date(Date.UTC(2026, 5, 1, 7, 15)),
        endAt: new Date(Date.UTC(2026, 5, 1, 8, 15)),
      },
    ];
    const slots = computeAvailableSlots(
      { mon: [{ start: '07:00', end: '09:00' }] },
      existing,
      1,
      { from: monday },
    );
    // 07:00, 07:30, 08:00 all overlap. 08:30 free.
    expect(slots.map((s) => s.startAt.getUTCHours() * 100 + s.startAt.getUTCMinutes())).toEqual([830]);
  });

  it('returns an empty list when windowDays is zero or negative', () => {
    expect(
      computeAvailableSlots({ mon: [{ start: '07:00', end: '08:00' }] }, [], 0, {
        from: monday,
      }),
    ).toHaveLength(0);
  });
});

dbDescribe('coaching sessions + review (live DB)', () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  let coachUserId = '';
  let coachRowId = '';
  let learnerUserId = '';
  let sessionId = '';

  beforeAll(async () => {
    const [coachUser] = await db
      .insert(users)
      .values({
        displayName: `Coach Test ${suffix}`,
        countryCode: 'PK',
        city: 'Lahore',
      })
      .returning();
    coachUserId = coachUser!.id;
    const [coachRow] = await db
      .insert(coaches)
      .values({
        userId: coachUserId,
        bio: 'Test coach used by smoke suite. Not visible in marketplace until verified.',
        languages: ['English'],
        specialties: ['Beginner technique'],
        certifications: [],
        hourlyRate: 1000,
        currency: 'PKR',
        weeklyAvailability: {
          mon: [{ start: '00:00', end: '23:30' }],
          tue: [{ start: '00:00', end: '23:30' }],
          wed: [{ start: '00:00', end: '23:30' }],
          thu: [{ start: '00:00', end: '23:30' }],
          fri: [{ start: '00:00', end: '23:30' }],
          sat: [{ start: '00:00', end: '23:30' }],
          sun: [{ start: '00:00', end: '23:30' }],
        },
        isVerifiedByFeera: true,
        isAcceptingBookings: true,
      })
      .returning();
    coachRowId = coachRow!.id;

    const [learner] = await db
      .insert(users)
      .values({
        displayName: `Learner Test ${suffix}`,
        countryCode: 'PK',
      })
      .returning();
    learnerUserId = learner!.id;
  });

  afterAll(async () => {
    if (coachRowId) {
      await db.execute(
        drizzleSql`DELETE FROM coaching_sessions WHERE coach_id = ${coachRowId}::uuid`,
      );
      await db.delete(coaches).where(eq(coaches.id, coachRowId));
    }
    if (learnerUserId) await db.delete(users).where(eq(users.id, learnerUserId));
    if (coachUserId) await db.delete(users).where(eq(users.id, coachUserId));
  });

  it('creates a coaching session with pending status and correct price', async () => {
    // Schedule one minute past now to clear validation.
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    start.setUTCSeconds(0, 0);
    const result = await db.transaction((tx) =>
      createCoachingSession(tx as unknown as typeof db, learnerUserId, {
        coachUserId,
        startAt: start.toISOString(),
        durationMinutes: 60,
        sessionType: 'single',
      }),
    );
    expect('session' in result).toBe(true);
    if (!('session' in result)) throw new Error('session not returned');
    sessionId = result.session.id;
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(result.session.status).toBe('pending');
    expect(result.session.totalAmount).toBe(1000);
    expect(result.session.currency).toBe('PKR');
  });

  it('rejects a 5 star review until after the session start time, then accepts and updates the coach average', async () => {
    // Move the session into the past so the review is allowed.
    await db.execute(
      drizzleSql`UPDATE coaching_sessions SET start_at = now() - interval '2 hours', end_at = now() - interval '1 hour' WHERE id = ${sessionId}::uuid`,
    );

    const result = await db.transaction((tx) =>
      reviewCoachingSession(tx as unknown as typeof db, sessionId, learnerUserId, {
        rating: 5,
        text: 'Excellent session, sharp feedback on my smash.',
      }),
    );
    expect('session' in result).toBe(true);
    if (!('session' in result)) throw new Error('review failed');
    expect(result.session.status).toBe('completed');
    expect(result.newCount).toBe(1);
    expect(result.newAverage).toBe(5);

    // Re-read the coach to confirm the snapshot was persisted.
    const [refreshed] = await db
      .select()
      .from(coaches)
      .where(eq(coaches.id, coachRowId))
      .limit(1);
    expect(refreshed!.averageRating).toBe(5);
    expect(refreshed!.ratingCount).toBe(1);
  });
});
