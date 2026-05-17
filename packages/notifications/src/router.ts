import type {
  NotificationChannel,
  NotificationChannelName,
  NotificationRequest,
} from './types.js';

/**
 * Picks the channel chain for a given recipient + urgency.
 *
 * Rules per CLAUDE.md + task spec:
 *   PK + booking_confirmed + whatsapp opt-in + phone -> twilio_whatsapp first.
 *   PK + has phone + no whatsapp opt-in            -> twilio_sms.
 *   Gulf (AE/SA/QA/KW/BH/OM) + push + urgency>=med -> expo_push first.
 *   Default + push token                           -> expo_push, fallback email.
 *   Marketing urgency                              -> email only, requires opt-in.
 *   Opt-outs (`optIns[channel] === false`)         -> channel is always dropped.
 */

const GULF_COUNTRIES = new Set(['AE', 'SA', 'QA', 'KW', 'BH', 'OM']);

const URGENCY_RANK: Record<NotificationRequest['urgency'], number> = {
  marketing: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export type NotificationRouterOptions = Readonly<{
  channels: ReadonlyMap<NotificationChannelName, NotificationChannel>;
}>;

export class NotificationRouter {
  constructor(private readonly opts: NotificationRouterOptions) {}

  /**
   * Returns the ordered list of channels to try. Empty array means "do not send"
   * (e.g. marketing without email opt-in, or every viable channel opted out).
   */
  pickChannelChain(req: NotificationRequest): readonly NotificationChannel[] {
    const order = this.computeOrder(req);
    const recipient = req.recipient;

    const out: NotificationChannel[] = [];
    for (const name of order) {
      // Explicit opt-out is never bypassed.
      if (recipient.optIns[name] === false) continue;
      // Channel must have the recipient field it needs.
      if (!this.recipientHasFieldFor(name, recipient)) continue;
      const ch = this.opts.channels.get(name);
      if (!ch) continue;
      if (out.find((c) => c.name === ch.name)) continue;
      out.push(ch);
    }
    return out;
  }

  private computeOrder(req: NotificationRequest): readonly NotificationChannelName[] {
    const { recipient, urgency, template } = req;
    const country = recipient.countryCode;
    const isPk = country === 'PK';
    const isGulf = GULF_COUNTRIES.has(country as unknown as string);

    // Marketing: email only, only when email opt-in is explicitly true.
    if (urgency === 'marketing') {
      return recipient.optIns.resend_email === true ? ['resend_email'] : [];
    }

    if (isPk) {
      const order: NotificationChannelName[] = [];
      const hasPhone = Boolean(recipient.phoneE164);
      const waOptIn = recipient.optIns.twilio_whatsapp === true;
      // PK booking_confirmed with whatsapp opt-in goes whatsapp first.
      if (hasPhone && waOptIn) order.push('twilio_whatsapp');
      // PK with phone but no whatsapp opt-in falls back to sms.
      if (hasPhone) order.push('twilio_sms');
      if (recipient.expoPushToken) order.push('expo_push');
      if (recipient.email) order.push('resend_email');
      // Touchscreen-only web fallback last.
      if (recipient.onesignalPlayerId) order.push('onesignal_web');
      // Avoid duplicates if both whatsapp + sms got pushed.
      return order;
    }

    if (isGulf) {
      const order: NotificationChannelName[] = [];
      const meetsThreshold = URGENCY_RANK[urgency] >= URGENCY_RANK.medium;
      if (recipient.expoPushToken && meetsThreshold) order.push('expo_push');
      if (recipient.email) order.push('resend_email');
      if (recipient.expoPushToken && !meetsThreshold) order.push('expo_push');
      if (recipient.phoneE164) order.push('twilio_sms');
      return order;
    }

    // Default: push first, email fallback, then sms.
    const order: NotificationChannelName[] = [];
    if (recipient.expoPushToken) order.push('expo_push');
    if (recipient.email) order.push('resend_email');
    if (recipient.phoneE164) order.push('twilio_sms');
    if (recipient.onesignalPlayerId) order.push('onesignal_web');

    // Quiet unused-var lint in TS for `template` until M6 wires per-template rules.
    void template;
    return order;
  }

  private recipientHasFieldFor(
    name: NotificationChannelName,
    recipient: NotificationRequest['recipient'],
  ): boolean {
    switch (name) {
      case 'expo_push':
        return Boolean(recipient.expoPushToken);
      case 'twilio_sms':
      case 'twilio_whatsapp':
        return Boolean(recipient.phoneE164);
      case 'resend_email':
        return Boolean(recipient.email);
      case 'onesignal_web':
        return Boolean(recipient.onesignalPlayerId);
    }
  }
}
