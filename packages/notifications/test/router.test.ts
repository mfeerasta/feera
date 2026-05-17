import { describe, expect, it } from 'vitest';
import type { CountryCode, Uuid } from '@feera/types';
import {
  ExpoPushChannel,
  NotificationRouter,
  OneSignalWebChannel,
  ResendEmailChannel,
  TwilioSmsChannel,
  TwilioWhatsappChannel,
  type NotificationChannel,
  type NotificationChannelName,
  type NotificationRequest,
} from '../src/index.js';

function buildRouter(): NotificationRouter {
  const channels = new Map<NotificationChannelName, NotificationChannel>([
    ['expo_push', new ExpoPushChannel()],
    ['twilio_sms', new TwilioSmsChannel()],
    ['twilio_whatsapp', new TwilioWhatsappChannel()],
    ['resend_email', new ResendEmailChannel()],
    ['onesignal_web', new OneSignalWebChannel()],
  ]);
  return new NotificationRouter({ channels });
}

function baseRequest(overrides: Partial<NotificationRequest> = {}): NotificationRequest {
  return {
    recipient: {
      userId: 'user-1' as Uuid,
      locale: 'en',
      countryCode: 'PK' as CountryCode,
      phoneE164: '+923001234567',
      email: 'a@example.com',
      expoPushToken: 'ExponentPushToken[abc]',
      optIns: {},
    },
    template: 'booking_confirmed',
    variables: { clubName: 'X', date: '2026-06-01', time: '18:00', bookingId: 'b1' },
    urgency: 'high',
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

describe('NotificationRouter', () => {
  const router = buildRouter();

  it('PK user with whatsapp + sms opt-in receives whatsapp first', () => {
    const req = baseRequest({
      recipient: {
        ...baseRequest().recipient,
        optIns: { twilio_whatsapp: true, twilio_sms: true },
      },
    });
    const chain = router.pickChannelChain(req).map((c) => c.name);
    expect(chain[0]).toBe('twilio_whatsapp');
    expect(chain).toContain('twilio_sms');
  });

  it('PK user with whatsapp opted out falls back to sms', () => {
    const req = baseRequest({
      recipient: {
        ...baseRequest().recipient,
        optIns: { twilio_whatsapp: false, twilio_sms: true },
      },
    });
    const chain = router.pickChannelChain(req).map((c) => c.name);
    expect(chain).not.toContain('twilio_whatsapp');
    expect(chain[0]).toBe('twilio_sms');
  });

  it('AE user gets expo_push first for medium+ urgency', () => {
    const req = baseRequest({
      recipient: {
        ...baseRequest().recipient,
        countryCode: 'AE' as CountryCode,
        optIns: {},
      },
      urgency: 'high',
    });
    const chain = router.pickChannelChain(req).map((c) => c.name);
    expect(chain[0]).toBe('expo_push');
    expect(chain).toContain('resend_email');
  });

  it('marketing urgency without email opt-in returns empty chain', () => {
    const req = baseRequest({
      urgency: 'marketing',
      recipient: {
        ...baseRequest().recipient,
        optIns: {},
      },
    });
    expect(router.pickChannelChain(req)).toHaveLength(0);
  });

  it('marketing urgency with email opt-in returns email only', () => {
    const req = baseRequest({
      urgency: 'marketing',
      recipient: {
        ...baseRequest().recipient,
        optIns: { resend_email: true, twilio_whatsapp: true, expo_push: true },
      },
    });
    const chain = router.pickChannelChain(req).map((c) => c.name);
    expect(chain).toEqual(['resend_email']);
  });

  it('opt-out is never bypassed even on high urgency', () => {
    const req = baseRequest({
      urgency: 'high',
      recipient: {
        ...baseRequest().recipient,
        countryCode: 'AE' as CountryCode,
        optIns: { expo_push: false, resend_email: false, twilio_sms: false },
      },
    });
    const chain = router.pickChannelChain(req).map((c) => c.name);
    expect(chain).not.toContain('expo_push');
    expect(chain).not.toContain('resend_email');
    expect(chain).not.toContain('twilio_sms');
  });

  it('skips channels when the recipient field is missing', () => {
    const req = baseRequest({
      recipient: {
        userId: 'user-2' as Uuid,
        locale: 'en',
        countryCode: 'PK' as CountryCode,
        optIns: { twilio_whatsapp: true },
      },
    });
    const chain = router.pickChannelChain(req);
    expect(chain).toHaveLength(0);
  });
});
