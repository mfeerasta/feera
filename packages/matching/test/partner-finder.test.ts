import { describe, expect, it } from 'vitest';
import {
  findPartners,
  haversineKm,
  type FinderUser,
  type OpenMatch,
} from '../src/partner-finder.js';
import { fromDisplayRating } from '../src/glicko.js';
import type { CountryCode, Locale, Uuid } from '@feera/types';

const PK = 'PK' as CountryCode;
const EN: Locale = 'en';

function uuid(seed: number): Uuid {
  const hex = seed.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}` as Uuid;
}

function baseUser(overrides: Partial<FinderUser> = {}): FinderUser {
  return {
    id: uuid(1),
    rating: 1500,
    rd: 200,
    lat: 31.5497, // Lahore
    lng: 74.3436,
    gender: 'm',
    locale: EN,
    countryCode: PK,
    onTimeRate: 0.95,
    noShowRate: 0.02,
    editionStatus: 'none',
    blockedUserIds: new Set<Uuid>(),
    isSandbagFlagged: false,
    ...overrides,
  };
}

function baseMatch(overrides: Partial<OpenMatch> = {}): OpenMatch {
  const start = new Date('2026-05-20T18:00:00Z');
  const end = new Date('2026-05-20T19:30:00Z');
  return {
    bookingId: uuid(100),
    courtId: uuid(200),
    clubId: uuid(300),
    clubName: 'Lahore Padel Club',
    lat: 31.55,
    lng: 74.35,
    startAt: start,
    endAt: end,
    requiredLevelMin: 3.0,
    requiredLevelMax: 4.0,
    genderPreference: 'open',
    participants: [
      { userId: uuid(401), rating: 1500, isFriend: false, isPriorOpponent: false, reliability: 0.9 },
      { userId: uuid(402), rating: 1520, isFriend: false, isPriorOpponent: false, reliability: 0.85 },
      { userId: uuid(403), rating: 1480, isFriend: false, isPriorOpponent: false, reliability: 0.92 },
    ],
    isEditionPriority: false,
    countryCode: PK,
    ...overrides,
  };
}

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineKm(31.5, 74.3, 31.5, 74.3)).toBeLessThan(0.001);
  });

  it('returns a sane distance for Lahore to Karachi (~1030 km)', () => {
    const d = haversineKm(31.5497, 74.3436, 24.8607, 67.0011);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1100);
  });
});

describe('findPartners — hard filters', () => {
  it('excludes matches outside radius', () => {
    const user = baseUser();
    const far = baseMatch({ lat: 24.86, lng: 67.0 }); // Karachi
    const result = findPartners({ user, candidates: [far] });
    expect(result.length).toBe(0);
  });

  it('excludes matches outside level range ±0.5', () => {
    const user = baseUser({ rating: fromDisplayRating(2.0) }); // display 2.0
    const tooHigh = baseMatch({ requiredLevelMin: 5.0, requiredLevelMax: 6.0 });
    const result = findPartners({ user, candidates: [tooHigh] });
    expect(result.length).toBe(0);
  });

  it('includes matches whose level range overlaps user ±0.5', () => {
    const user = baseUser({ rating: fromDisplayRating(3.5) });
    const ok = baseMatch({ requiredLevelMin: 3.0, requiredLevelMax: 4.0 });
    const result = findPartners({ user, candidates: [ok] });
    expect(result.length).toBe(1);
  });

  it('excludes women_only matches for male user', () => {
    const user = baseUser({ gender: 'm' });
    const womenOnly = baseMatch({ genderPreference: 'women_only' });
    expect(findPartners({ user, candidates: [womenOnly] }).length).toBe(0);
  });

  it('excludes men_only matches for female user', () => {
    const user = baseUser({ gender: 'f' });
    const menOnly = baseMatch({ genderPreference: 'men_only' });
    expect(findPartners({ user, candidates: [menOnly] }).length).toBe(0);
  });

  it('excludes matches where a blocked user is a participant', () => {
    const blocked = uuid(401);
    const user = baseUser({ blockedUserIds: new Set([blocked]) });
    const match = baseMatch();
    expect(findPartners({ user, candidates: [match] }).length).toBe(0);
  });

  it('returns empty when user is flagged as sandbag', () => {
    const user = baseUser({ isSandbagFlagged: true });
    expect(findPartners({ user, candidates: [baseMatch()] }).length).toBe(0);
  });

  it('excludes time-conflicting matches', () => {
    const user = baseUser({
      existingBookings: [
        {
          startAt: new Date('2026-05-20T18:30:00Z'),
          endAt: new Date('2026-05-20T20:00:00Z'),
        },
      ],
    });
    expect(findPartners({ user, candidates: [baseMatch()] }).length).toBe(0);
  });

  it('excludes matches where the user is already a participant', () => {
    const user = baseUser();
    const match = baseMatch({
      participants: [
        { userId: user.id, rating: 1500, isFriend: false, isPriorOpponent: false, reliability: 0.9 },
      ],
    });
    expect(findPartners({ user, candidates: [match] }).length).toBe(0);
  });
});

describe('findPartners — scoring', () => {
  it('ranks closer-level match higher than a fringe-level one', () => {
    const user = baseUser({ rating: fromDisplayRating(3.5) });
    const close = baseMatch({
      bookingId: uuid(1001),
      requiredLevelMin: 3.4,
      requiredLevelMax: 3.6,
      participants: [
        { userId: uuid(501), rating: fromDisplayRating(3.5), isFriend: false, isPriorOpponent: false, reliability: 0.9 },
      ],
    });
    const fringe = baseMatch({
      bookingId: uuid(1002),
      requiredLevelMin: 3.0,
      requiredLevelMax: 4.0,
      participants: [
        { userId: uuid(502), rating: fromDisplayRating(4.0), isFriend: false, isPriorOpponent: false, reliability: 0.9 },
      ],
    });
    const result = findPartners({ user, candidates: [fringe, close] });
    expect(result[0]?.match.bookingId).toBe(close.bookingId);
  });

  it('edition boost lifts an edition-priority match for an active edition member', () => {
    const editionUser = baseUser({ editionStatus: 'active' });
    const nonEditionUser = baseUser({ editionStatus: 'none' });
    const priority = baseMatch({ bookingId: uuid(2001), isEditionPriority: true });
    const standard = baseMatch({ bookingId: uuid(2002), isEditionPriority: false });

    const r1 = findPartners({ user: editionUser, candidates: [standard, priority] });
    expect(r1[0]?.match.bookingId).toBe(priority.bookingId);

    // Non-edition user: edition boost does nothing, so identical-otherwise matches tie.
    const r2 = findPartners({ user: nonEditionUser, candidates: [standard, priority] });
    expect(r2[0]?.score).toBeCloseTo(r2[1]?.score ?? -1, 5);
  });

  it('friend signal lifts ranking', () => {
    const user = baseUser();
    const withFriend = baseMatch({
      bookingId: uuid(3001),
      participants: [
        { userId: uuid(601), rating: 1500, isFriend: true, isPriorOpponent: false, reliability: 0.9 },
        { userId: uuid(602), rating: 1500, isFriend: false, isPriorOpponent: false, reliability: 0.9 },
        { userId: uuid(603), rating: 1500, isFriend: false, isPriorOpponent: false, reliability: 0.9 },
      ],
    });
    const noFriend = baseMatch({ bookingId: uuid(3002) });
    const result = findPartners({ user, candidates: [noFriend, withFriend] });
    expect(result[0]?.match.bookingId).toBe(withFriend.bookingId);
    expect(result[0]?.reasons.some((r) => /partner/.test(r))).toBe(true);
  });

  it('emits a reliability reason string', () => {
    const user = baseUser();
    const result = findPartners({ user, candidates: [baseMatch()] });
    expect(result[0]?.reasons.some((r) => /% reliable/.test(r))).toBe(true);
  });

  it('caps results at 20', () => {
    const user = baseUser();
    const many: OpenMatch[] = [];
    for (let i = 0; i < 50; i++) {
      many.push(baseMatch({ bookingId: uuid(5000 + i) }));
    }
    const result = findPartners({ user, candidates: many });
    expect(result.length).toBe(20);
  });
});

describe('findPartners — 500 synthetic users across 5 cities', () => {
  it('produces a sane score distribution', () => {
    // 5 city centres
    const cities = [
      { lat: 31.5497, lng: 74.3436 }, // Lahore
      { lat: 24.8607, lng: 67.0011 }, // Karachi
      { lat: 33.6844, lng: 73.0479 }, // Islamabad
      { lat: 25.2048, lng: 55.2708 }, // Dubai
      { lat: 38.7223, lng: -9.1393 }, // Lisbon
    ];

    // 500 candidate open matches, scattered within ~10 km of each city.
    const candidates: OpenMatch[] = [];
    for (let i = 0; i < 500; i++) {
      const c = cities[i % cities.length]!;
      const jitterLat = (Math.sin(i) * 0.05);
      const jitterLng = (Math.cos(i) * 0.05);
      const display = 2.5 + ((i % 9) * 0.5); // 2.5 .. 6.5
      candidates.push({
        bookingId: uuid(10_000 + i),
        courtId: uuid(20_000 + i),
        clubId: uuid(30_000 + (i % 50)),
        clubName: `Club ${i % 50}`,
        lat: c.lat + jitterLat,
        lng: c.lng + jitterLng,
        startAt: new Date(2026, 4, 20 + (i % 7), 18, 0, 0),
        endAt: new Date(2026, 4, 20 + (i % 7), 19, 30, 0),
        requiredLevelMin: Math.max(0, display - 0.5),
        requiredLevelMax: Math.min(7, display + 0.5),
        genderPreference: 'open',
        participants: [
          {
            userId: uuid(40_000 + i),
            rating: fromDisplayRating(display),
            isFriend: i % 23 === 0,
            isPriorOpponent: i % 11 === 0,
            reliability: 0.6 + ((i % 5) * 0.08),
          },
        ],
        isEditionPriority: i % 17 === 0,
        countryCode: PK,
      });
    }

    const lahoreUser = baseUser({
      lat: cities[0]!.lat,
      lng: cities[0]!.lng,
      rating: fromDisplayRating(3.5),
    });
    const result = findPartners({ user: lahoreUser, candidates, filters: { radiusKm: 20 } });

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(20);
    // Top score must be in [0, 1]
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    // Sorted descending.
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.score).toBeGreaterThanOrEqual(result[i]!.score);
    }
    // Every returned candidate must have a level range that overlaps user's ±0.5 window.
    for (const r of result) {
      expect(r.match.requiredLevelMin).toBeLessThanOrEqual(4.0);
      expect(r.match.requiredLevelMax).toBeGreaterThanOrEqual(3.0);
    }
  });
});
