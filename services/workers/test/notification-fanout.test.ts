import { describe, expect, it } from 'vitest';
import type { CountryCode } from '@feera/types';
import {
  NotificationRouter,
  type NotificationChannel,
  type NotificationChannelName,
} from '@feera/notifications';
import {
  runFanout,
  type NotificationFanoutDb,
  type OutboxRow,
  type RecipientProfile,
} from '../src/jobs/notification-fanout.js';
import type { JobContext } from '../src/types.js';

function silentLogger() {
  const noop = () => {};
  const self: unknown = { child: () => self, debug: noop, info: noop, warn: noop, error: noop };
  return self as JobContext['log'];
}

function ctx(): JobContext {
  return { runId: 'test', log: silentLogger(), dryRun: false, argv: [] };
}

class StubChannel implements NotificationChannel {
  constructor(
    readonly name: NotificationChannelName,
    private readonly behaviour: 'sent' | 'failed' | 'throw',
  ) {}
  async send() {
    if (this.behaviour === 'throw') throw new Error('boom');
    if (this.behaviour === 'failed') {
      return { channel: this.name, status: 'failed' as const, reason: 'stub_failed' };
    }
    return { channel: this.name, status: 'sent' as const, providerMessageId: 'stub-1' };
  }
}

function buildRouter(behaviour: 'sent' | 'failed' | 'throw'): NotificationRouter {
  const channels = new Map<NotificationChannelName, NotificationChannel>([
    ['expo_push', new StubChannel('expo_push', behaviour)],
    ['twilio_sms', new StubChannel('twilio_sms', behaviour)],
    ['twilio_whatsapp', new StubChannel('twilio_whatsapp', behaviour)],
    ['resend_email', new StubChannel('resend_email', behaviour)],
    ['onesignal_web', new StubChannel('onesignal_web', behaviour)],
  ]);
  return new NotificationRouter({ channels });
}

type RowState = OutboxRow & {
  state: 'queued' | 'sending' | 'delivered' | 'skipped' | 'failed';
  lastError: string | null;
  scheduledFor: Date | null;
};

function makeFakeDb(rows: RowState[], profile: RecipientProfile | null): {
  handle: NotificationFanoutDb;
  rows: RowState[];
  claimCount: number;
} {
  let claimCount = 0;
  const handle: NotificationFanoutDb = {
    async claimBatch(limit, now) {
      claimCount += 1;
      const eligible = rows.filter(
        (r) => r.state === 'queued' && (!r.scheduledFor || r.scheduledFor <= now),
      );
      const taken = eligible.slice(0, limit);
      for (const r of taken) r.state = 'sending';
      return taken.map((r) => ({
        id: r.id,
        recipientUserId: r.recipientUserId,
        template: r.template,
        variables: r.variables,
        urgency: r.urgency,
        retries: r.retries,
        channelsAttempted: r.channelsAttempted,
      }));
    },
    async loadRecipient() {
      return profile;
    },
    async markDelivered(rowId, channelsAttempted) {
      const r = rows.find((x) => x.id === rowId)!;
      r.state = 'delivered';
      r.channelsAttempted = channelsAttempted;
    },
    async markSkipped(rowId, reason) {
      const r = rows.find((x) => x.id === rowId)!;
      r.state = 'skipped';
      r.lastError = reason;
    },
    async rescheduleAfterFailure(rowId, retries, lastError, nextScheduledFor) {
      const r = rows.find((x) => x.id === rowId)!;
      r.state = 'queued';
      r.retries = retries;
      r.lastError = lastError;
      r.scheduledFor = nextScheduledFor;
    },
    async markPermanentFailure(rowId, lastError, channelsAttempted) {
      const r = rows.find((x) => x.id === rowId)!;
      r.state = 'failed';
      r.lastError = lastError;
      r.channelsAttempted = channelsAttempted;
    },
  };
  return {
    handle,
    rows,
    get claimCount() {
      return claimCount;
    },
  };
}

const baseRow = (id: string, overrides: Partial<RowState> = {}): RowState => ({
  id,
  recipientUserId: 'u1',
  template: 'booking_confirmed',
  variables: { clubName: 'X', date: '2026-06-01', time: '18:00', bookingId: 'b1' },
  urgency: 'high',
  retries: 0,
  channelsAttempted: [],
  state: 'queued',
  lastError: null,
  scheduledFor: null,
  ...overrides,
});

const baseProfile = (): RecipientProfile => ({
  userId: 'u1',
  locale: 'en',
  countryCode: 'PK' as CountryCode,
  phoneE164: '+923001234567',
  email: 'a@example.com',
  expoPushToken: null,
  optIns: {},
});

describe('notification-fanout runFanout', () => {
  const now = new Date('2026-06-01T10:00:00Z');

  it('claims a queued row and marks delivered on success', async () => {
    const fake = makeFakeDb([baseRow('r1')], baseProfile());
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('sent'));
    expect(metrics.delivered).toBe(1);
    expect(metrics.drained).toBe(1);
    expect(fake.rows[0]!.state).toBe('delivered');
    expect(fake.rows[0]!.channelsAttempted.length).toBeGreaterThan(0);
  });

  it('on every channel failing, increments retries and schedules exponential backoff', async () => {
    const fake = makeFakeDb([baseRow('r1')], baseProfile());
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('failed'));
    expect(metrics.retried).toBe(1);
    expect(metrics.delivered).toBe(0);
    expect(fake.rows[0]!.state).toBe('queued');
    expect(fake.rows[0]!.retries).toBe(1);
    // 2^1 minutes = 120_000 ms.
    expect(fake.rows[0]!.scheduledFor?.getTime()).toBe(now.getTime() + 120_000);
    expect(fake.rows[0]!.lastError).toBe('stub_failed');
  });

  it('after MAX_RETRIES failures, marks the row failed', async () => {
    const fake = makeFakeDb([baseRow('r1', { retries: 2 })], baseProfile());
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('failed'));
    expect(metrics.failedPermanent).toBe(1);
    expect(metrics.retried).toBe(0);
    expect(fake.rows[0]!.state).toBe('failed');
    expect(fake.rows[0]!.lastError).toBe('stub_failed');
  });

  it('skips rows another worker has already claimed', async () => {
    // Simulate: row is already in `sending` state (another worker grabbed it).
    // claimBatch only returns 'queued' rows, so we drain nothing.
    const fake = makeFakeDb([baseRow('r1', { state: 'sending' })], baseProfile());
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('sent'));
    expect(metrics.drained).toBe(0);
    expect(metrics.delivered).toBe(0);
    expect(fake.rows[0]!.state).toBe('sending');
  });

  it('marks skipped when no eligible channel is available for the recipient', async () => {
    const noContactProfile: RecipientProfile = {
      ...baseProfile(),
      phoneE164: null,
      email: null,
      expoPushToken: null,
    };
    const fake = makeFakeDb([baseRow('r1')], noContactProfile);
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('sent'));
    expect(metrics.skipped).toBe(1);
    expect(fake.rows[0]!.state).toBe('skipped');
    expect(fake.rows[0]!.lastError).toBe('no_eligible_channel');
  });

  it('marks skipped when the recipient is missing', async () => {
    const fake = makeFakeDb([baseRow('r1')], null);
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('sent'));
    expect(metrics.skipped).toBe(1);
    expect(fake.rows[0]!.state).toBe('skipped');
    expect(fake.rows[0]!.lastError).toBe('recipient_not_found');
  });

  it('skips scheduled-future rows and processes due ones', async () => {
    const future = new Date(now.getTime() + 5 * 60_000);
    const fake = makeFakeDb(
      [
        baseRow('r1', { scheduledFor: future }),
        baseRow('r2'),
      ],
      baseProfile(),
    );
    const metrics = await runFanout(fake.handle, ctx(), now, buildRouter('sent'));
    expect(metrics.drained).toBe(1);
    expect(metrics.delivered).toBe(1);
    expect(fake.rows[0]!.state).toBe('queued');
    expect(fake.rows[1]!.state).toBe('delivered');
  });

  it('dry run does not claim or send', async () => {
    const fake = makeFakeDb([baseRow('r1')], baseProfile());
    const metrics = await runFanout(
      fake.handle,
      { ...ctx(), argv: ['--dry-run'] },
      now,
      buildRouter('sent'),
    );
    expect(metrics.drained).toBe(0);
    expect(fake.rows[0]!.state).toBe('queued');
  });
});
