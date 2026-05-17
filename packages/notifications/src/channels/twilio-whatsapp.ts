import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types';

/**
 * Twilio WhatsApp Business channel. Uses the Messages API with whatsapp:
 * prefix on both to/from. Env required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_WHATSAPP_FROM (E.164 number registered as a WhatsApp sender).
 */

type TwilioClient = {
  messages: {
    create: (opts: { to: string; body: string; from: string }) => Promise<{ sid: string }>;
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

function waPrefix(phone: string): string {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

export class TwilioWhatsappChannel implements NotificationChannel {
  readonly name = 'twilio_whatsapp' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.phoneE164) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    const client = await getClient();
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!client || !from) {
      return { channel: this.name, status: 'skipped', reason: 'missing_credentials' };
    }
    try {
      const msg = await client.messages.create({
        to: waPrefix(req.recipient.phoneE164),
        from: waPrefix(from),
        body: `*${rendered.title}*\n\n${rendered.body}${rendered.actionUrl ? `\n\n${rendered.actionUrl}` : ''}`,
      });
      return { channel: this.name, status: 'sent', providerMessageId: msg.sid };
    } catch (err) {
      return {
        channel: this.name,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'twilio_whatsapp_send_failed',
      };
    }
  }
}
