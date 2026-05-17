import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types';

/**
 * Expo Push channel. Uses the `expo-server-sdk` when installed; falls back to
 * a direct fetch against https://exp.host/--/api/v2/push/send so an Expo
 * access token (EXPO_ACCESS_TOKEN) is sufficient even without the SDK.
 *
 * Env required: at least one Expo push token on the recipient. EXPO_ACCESS_TOKEN
 * is required for production sends (Expo enforces it on receipts).
 */

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

type ExpoSdk = {
  isExpoPushToken: (t: string) => boolean;
  chunkPushNotifications: <T>(messages: T[]) => T[][];
  sendPushNotificationsAsync: (messages: unknown[]) => Promise<ExpoTicket[]>;
};

let cachedSdk: ExpoSdk | null | undefined;

async function tryLoadSdk(): Promise<ExpoSdk | null> {
  if (cachedSdk !== undefined) return cachedSdk;
  try {
    const mod = (await import('expo-server-sdk')) as unknown as {
      Expo: new (opts?: { accessToken?: string }) => ExpoSdk;
    };
    cachedSdk = new mod.Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    return cachedSdk;
  } catch {
    cachedSdk = null;
    return null;
  }
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
}

async function sendViaHttp(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`expo_push_http_${res.status}`);
  }
  const json = (await res.json()) as { data?: ExpoTicket[]; errors?: Array<{ message: string }> };
  const firstErr = json.errors?.[0];
  if (firstErr) {
    throw new Error(firstErr.message);
  }
  return json.data ?? [];
}

export class ExpoPushChannel implements NotificationChannel {
  readonly name = 'expo_push' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    const token = req.recipient.expoPushToken;
    if (!token) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }

    const message: ExpoMessage = {
      to: token,
      title: rendered.title,
      body: rendered.body,
      data: rendered.actionUrl ? { url: rendered.actionUrl } : undefined,
      priority: req.urgency === 'high' ? 'high' : 'default',
      sound: req.urgency === 'high' ? 'default' : null,
    };

    try {
      const sdk = await tryLoadSdk();
      let tickets: ExpoTicket[];
      if (sdk) {
        if (!sdk.isExpoPushToken(token)) {
          return { channel: this.name, status: 'failed', reason: 'invalid_expo_token' };
        }
        const chunks = sdk.chunkPushNotifications([message]);
        tickets = [];
        for (const chunk of chunks) {
          tickets.push(...(await sdk.sendPushNotificationsAsync(chunk)));
        }
      } else {
        tickets = await sendViaHttp([message]);
      }
      const ticket = tickets[0];
      if (!ticket || ticket.status !== 'ok') {
        return {
          channel: this.name,
          status: 'failed',
          reason: ticket?.message ?? ticket?.details?.error ?? 'expo_push_failed',
        };
      }
      return { channel: this.name, status: 'sent', providerMessageId: ticket.id };
    } catch (err) {
      return {
        channel: this.name,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'expo_push_send_failed',
      };
    }
  }
}
