import { describe, expect, it } from 'vitest';
import {
  evaluateRules,
  runAwardDetector,
  type AchievementId,
  type AwardAchievementsDb,
  type UserCandidate,
  type UserSignals,
} from '../src/jobs/award-achievements.js';
import type { JobContext } from '../src/types.js';

function silentLogger() {
  const noop = () => {};
  const self: unknown = { child: () => self, debug: noop, info: noop, warn: noop, error: noop };
  return self as JobContext['log'];
}

function ctx(overrides: Partial<JobContext> = {}): JobContext {
  return { runId: 'test', log: silentLogger(), dryRun: false, argv: [], ...overrides };
}

function emptySignals(overrides: Partial<UserSignals> = {}): UserSignals {
  return {
    matchCount: 0,
    winCount: 0,
    currentStreak: 0,
    acceptedFriendsCount: 0,
    distinctPartnersCount: 0,
    isTournamentFinalist: false,
    isTournamentChampion: false,
    earlyBirdCount: 0,
    ...overrides,
  };
}

function makeFakeDb(opts: {
  users: UserCandidate[];
  signals: Map<string, UserSignals>;
  existing?: Map<string, AchievementId[]>;
  insertResults?: Map<string, boolean>;
}): {
  handle: AwardAchievementsDb;
  inserted: Array<{ userId: string; achievementId: AchievementId }>;
  notified: Array<{ userId: string; achievementId: AchievementId }>;
} {
  const inserted: Array<{ userId: string; achievementId: AchievementId }> = [];
  const notified: Array<{ userId: string; achievementId: AchievementId }> = [];
  const existing = opts.existing ?? new Map<string, AchievementId[]>();
  const insertResults = opts.insertResults ?? new Map<string, boolean>();
  const handle: AwardAchievementsDb = {
    async listLiveUsers() {
      return opts.users;
    },
    async loadSignals(userId) {
      return opts.signals.get(userId) ?? emptySignals();
    },
    async listExistingAwards(userId) {
      return existing.get(userId) ?? [];
    },
    async insertAward(row) {
      const key = `${row.userId}:${row.achievementId}`;
      if (insertResults.has(key)) {
        const r = insertResults.get(key)!;
        if (r) inserted.push(row);
        return r;
      }
      inserted.push(row);
      return true;
    },
    async enqueueAchievementNotification(userId, achievementId) {
      notified.push({ userId, achievementId });
    },
  };
  return { handle, inserted, notified };
}

const FOUNDER_USER: UserCandidate = {
  id: 'u1',
  createdAt: new Date('2026-06-01T00:00:00Z'),
};
const LATE_USER: UserCandidate = {
  id: 'u2',
  createdAt: new Date('2028-01-01T00:00:00Z'),
};

describe('evaluateRules', () => {
  it('first_match fires on user with exactly 1 match', () => {
    const ids = evaluateRules(FOUNDER_USER, emptySignals({ matchCount: 1 }));
    expect(ids).toContain('first_match');
  });

  it('wins_10 fires at exactly 10 wins, not at 9', () => {
    const at9 = evaluateRules(LATE_USER, emptySignals({ winCount: 9, matchCount: 9 }));
    expect(at9).not.toContain('wins_10');
    const at10 = evaluateRules(LATE_USER, emptySignals({ winCount: 10, matchCount: 10 }));
    expect(at10).toContain('wins_10');
    expect(at10).not.toContain('wins_50');
  });

  it('wins_50 + century stack at 100 wins and 100 matches', () => {
    const ids = evaluateRules(LATE_USER, emptySignals({ winCount: 100, matchCount: 100 }));
    expect(ids).toContain('wins_10');
    expect(ids).toContain('wins_50');
    expect(ids).toContain('century');
  });

  it('streak_5 + streak_10 boundary', () => {
    expect(evaluateRules(LATE_USER, emptySignals({ currentStreak: 4 }))).not.toContain('streak_5');
    expect(evaluateRules(LATE_USER, emptySignals({ currentStreak: 5 }))).toContain('streak_5');
    expect(evaluateRules(LATE_USER, emptySignals({ currentStreak: 9 }))).not.toContain('streak_10');
    expect(evaluateRules(LATE_USER, emptySignals({ currentStreak: 10 }))).toContain('streak_10');
  });

  it('founder_member fires only on users created before 2027-01-01', () => {
    expect(evaluateRules(FOUNDER_USER, emptySignals())).toContain('founder_member');
    expect(evaluateRules(LATE_USER, emptySignals())).not.toContain('founder_member');
  });

  it('social_butterfly at 25 accepted friends', () => {
    expect(evaluateRules(LATE_USER, emptySignals({ acceptedFriendsCount: 24 }))).not.toContain(
      'social_butterfly',
    );
    expect(evaluateRules(LATE_USER, emptySignals({ acceptedFriendsCount: 25 }))).toContain(
      'social_butterfly',
    );
  });

  it('mixer at 20 distinct partners', () => {
    expect(evaluateRules(LATE_USER, emptySignals({ distinctPartnersCount: 19 }))).not.toContain(
      'mixer',
    );
    expect(evaluateRules(LATE_USER, emptySignals({ distinctPartnersCount: 20 }))).toContain(
      'mixer',
    );
  });

  it('tournament_champion and tournament_finalist track independently', () => {
    expect(evaluateRules(LATE_USER, emptySignals({ isTournamentChampion: true }))).toContain(
      'tournament_champion',
    );
    expect(evaluateRules(LATE_USER, emptySignals({ isTournamentFinalist: true }))).toContain(
      'tournament_finalist',
    );
  });

  it('early_bird at 10 dawn check-ins', () => {
    expect(evaluateRules(LATE_USER, emptySignals({ earlyBirdCount: 9 }))).not.toContain(
      'early_bird',
    );
    expect(evaluateRules(LATE_USER, emptySignals({ earlyBirdCount: 10 }))).toContain('early_bird');
  });
});

describe('runAwardDetector', () => {
  it('inserts a new award and enqueues a notification', async () => {
    const fake = makeFakeDb({
      users: [FOUNDER_USER],
      signals: new Map([[FOUNDER_USER.id, emptySignals({ matchCount: 1 })]]),
    });
    const metrics = await runAwardDetector(fake.handle, ctx());
    expect(metrics.usersChecked).toBe(1);
    // first_match + founder_member both fire.
    expect(metrics.newAwards).toBe(2);
    expect(metrics.notificationsEnqueued).toBe(2);
    expect(fake.inserted.map((i) => i.achievementId).sort()).toEqual(
      ['first_match', 'founder_member'].sort(),
    );
    expect(fake.notified.length).toBe(2);
  });

  it('wins_10 awards at 10 but not at 9 in the live run', async () => {
    const just9 = makeFakeDb({
      users: [LATE_USER],
      signals: new Map([[LATE_USER.id, emptySignals({ matchCount: 9, winCount: 9 })]]),
    });
    const m9 = await runAwardDetector(just9.handle, ctx());
    expect(just9.inserted.map((i) => i.achievementId)).toContain('first_match');
    expect(just9.inserted.map((i) => i.achievementId)).not.toContain('wins_10');
    void m9;

    const at10 = makeFakeDb({
      users: [LATE_USER],
      signals: new Map([[LATE_USER.id, emptySignals({ matchCount: 10, winCount: 10 })]]),
    });
    await runAwardDetector(at10.handle, ctx());
    expect(at10.inserted.map((i) => i.achievementId)).toContain('wins_10');
  });

  it('is idempotent: skips already-awarded achievements without re-inserting', async () => {
    const fake = makeFakeDb({
      users: [FOUNDER_USER],
      signals: new Map([[FOUNDER_USER.id, emptySignals({ matchCount: 1 })]]),
      existing: new Map([[FOUNDER_USER.id, ['first_match', 'founder_member']]]),
    });
    const metrics = await runAwardDetector(fake.handle, ctx());
    expect(metrics.newAwards).toBe(0);
    expect(metrics.notificationsEnqueued).toBe(0);
    expect(fake.inserted).toEqual([]);
  });

  it('ON CONFLICT race: insertAward returning false skips the notification', async () => {
    const fake = makeFakeDb({
      users: [FOUNDER_USER],
      signals: new Map([[FOUNDER_USER.id, emptySignals({ matchCount: 1 })]]),
      insertResults: new Map([
        [`${FOUNDER_USER.id}:first_match`, false],
        [`${FOUNDER_USER.id}:founder_member`, true],
      ]),
    });
    const metrics = await runAwardDetector(fake.handle, ctx());
    expect(metrics.newAwards).toBe(1);
    expect(metrics.notificationsEnqueued).toBe(1);
    expect(fake.notified.map((n) => n.achievementId)).toEqual(['founder_member']);
  });

  it('sandbag-flagged users still get achievements (this worker does not gate on the flag)', async () => {
    // The worker handle does not consult the sandbag flag at all; the rule
    // simply fires off signals. We assert via a normal run that signals alone
    // drive the awards.
    const fake = makeFakeDb({
      users: [LATE_USER],
      signals: new Map([
        [LATE_USER.id, emptySignals({ matchCount: 50, winCount: 50, currentStreak: 10 })],
      ]),
    });
    await runAwardDetector(fake.handle, ctx());
    const ids = fake.inserted.map((i) => i.achievementId).sort();
    expect(ids).toContain('first_match');
    expect(ids).toContain('wins_10');
    expect(ids).toContain('wins_50');
    expect(ids).toContain('streak_5');
    expect(ids).toContain('streak_10');
  });

  it('one bad user does not crash the run', async () => {
    const good = FOUNDER_USER;
    const bad: UserCandidate = { id: 'bad', createdAt: new Date('2026-01-01Z') };
    const handle: AwardAchievementsDb = {
      async listLiveUsers() {
        return [bad, good];
      },
      async loadSignals(userId) {
        if (userId === 'bad') throw new Error('synthetic failure');
        return emptySignals({ matchCount: 1 });
      },
      async listExistingAwards() {
        return [];
      },
      async insertAward() {
        return true;
      },
      async enqueueAchievementNotification() {},
    };
    const metrics = await runAwardDetector(handle, ctx());
    expect(metrics.usersChecked).toBe(2);
    expect(metrics.errored).toBe(1);
    expect(metrics.newAwards).toBeGreaterThan(0);
  });

  it('dryRun does not insert or notify', async () => {
    const fake = makeFakeDb({
      users: [FOUNDER_USER],
      signals: new Map([[FOUNDER_USER.id, emptySignals({ matchCount: 1 })]]),
    });
    const metrics = await runAwardDetector(fake.handle, ctx({ dryRun: true }));
    expect(metrics.newAwards).toBe(0);
    expect(fake.inserted).toEqual([]);
    expect(fake.notified).toEqual([]);
  });
});
