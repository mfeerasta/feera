import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types.js';

/**
 * Resend email facade. Phase 1 (M2) does no network IO.
 * TODO(M3): real provider call to Resend `emails.send`.
 */
export class ResendEmailChannel implements NotificationChannel {
  readonly name = 'resend_email' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.email) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    // eslint-disable-next-line no-console
    console.info('[notifications] resend_email queued', {
      userId: req.recipient.userId,
      template: req.template,
      idempotencyKey: req.idempotencyKey,
      subject: rendered.title,
    });
    return { channel: this.name, status: 'queued' };
  }
}
