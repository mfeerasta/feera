import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types';

/**
 * OneSignal web push facade. Phase 1 (M2) does no network IO.
 * TODO(M3): real provider call to OneSignal `/notifications`.
 */
export class OneSignalWebChannel implements NotificationChannel {
  readonly name = 'onesignal_web' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.onesignalPlayerId) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    // eslint-disable-next-line no-console
    console.info('[notifications] onesignal_web queued', {
      userId: req.recipient.userId,
      template: req.template,
      idempotencyKey: req.idempotencyKey,
      title: rendered.title,
    });
    return { channel: this.name, status: 'queued' };
  }
}
