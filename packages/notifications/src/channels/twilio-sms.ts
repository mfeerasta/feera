import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types.js';

/**
 * Twilio SMS facade. Phase 1 (M2) does no network IO.
 * TODO(M3): real provider call to Twilio Messages API.
 */
export class TwilioSmsChannel implements NotificationChannel {
  readonly name = 'twilio_sms' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.phoneE164) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    // eslint-disable-next-line no-console
    console.info('[notifications] twilio_sms queued', {
      userId: req.recipient.userId,
      template: req.template,
      idempotencyKey: req.idempotencyKey,
      bodyPreview: rendered.body.slice(0, 40),
    });
    return { channel: this.name, status: 'queued' };
  }
}
