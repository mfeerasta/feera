import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types';

/**
 * Twilio SMS channel. Calls the Twilio Messages API when env is present.
 * Env required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either
 * TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM.
 */

type TwilioClient = {
  messages: {
    create: (opts: {
      to: string;
      body: string;
      from?: string;
      messagingServiceSid?: string;
    }) => Promise<{ sid: string }>;
  };
};

let cachedClient: TwilioClient | null = null;
let cachedFailed = false;

async function getClient(): Promise<TwilioClient | null> {
  if (cachedClient) return cachedClient;
  if (cachedFailed) return null;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    const mod = (await import('twilio')) as unknown as {
      default: (sid: string, token: string) => TwilioClient;
    };
    cachedClient = mod.default(sid, token);
    return cachedClient;
  } catch {
    cachedFailed = true;
    return null;
  }
}

export class TwilioSmsChannel implements NotificationChannel {
  readonly name = 'twilio_sms' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.phoneE164) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    const client = await getClient();
    const from = process.env.TWILIO_SMS_FROM;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if (!client || (!from && !messagingServiceSid)) {
      return { channel: this.name, status: 'skipped', reason: 'missing_credentials' };
    }
    try {
      const msg = await client.messages.create({
        to: req.recipient.phoneE164,
        body: `${rendered.title}\n\n${rendered.body}${rendered.actionUrl ? `\n\n${rendered.actionUrl}` : ''}`,
        ...(messagingServiceSid ? { messagingServiceSid } : { from }),
      });
      return { channel: this.name, status: 'sent', providerMessageId: msg.sid };
    } catch (err) {
      return {
        channel: this.name,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'twilio_sms_send_failed',
      };
    }
  }
}
