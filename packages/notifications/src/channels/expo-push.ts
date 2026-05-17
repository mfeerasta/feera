import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types.js';

/**
 * Expo Push channel facade. Phase 1 (M2) does no network IO. M3 wires the real
 * Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
 */
export class ExpoPushChannel implements NotificationChannel {
  readonly name = 'expo_push' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.expoPushToken) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    // TODO(M3): real provider call to https://exp.host/--/api/v2/push/send
    // eslint-disable-next-line no-console
    console.info('[notifications] expo_push queued', {
      userId: req.recipient.userId,
      template: req.template,
      idempotencyKey: req.idempotencyKey,
      title: rendered.title,
    });
    return { channel: this.name, status: 'queued' };
  }
}
