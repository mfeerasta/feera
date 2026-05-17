import type {
  NotificationChannel,
  NotificationRequest,
  NotificationResult,
  RenderedTemplate,
} from '../types';

/**
 * Resend email channel. Env required: RESEND_API_KEY, EMAIL_FROM.
 * The `resend` SDK is imported lazily so importing this module without
 * the dep installed (or in environments without RESEND_API_KEY) is safe.
 */

type ResendClient = {
  emails: {
    send: (args: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
      text?: string;
    }) => Promise<{ data?: { id?: string } | null; error?: { message: string } | null }>;
  };
};

let cachedClient: ResendClient | null = null;
let cachedFailed = false;

async function getClient(): Promise<ResendClient | null> {
  if (cachedClient) return cachedClient;
  if (cachedFailed) return null;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    const mod = (await import('resend')) as unknown as {
      Resend: new (k: string) => ResendClient;
    };
    cachedClient = new mod.Resend(apiKey);
    return cachedClient;
  } catch {
    cachedFailed = true;
    return null;
  }
}

function renderHtml(rendered: RenderedTemplate): string {
  const action = rendered.actionUrl
    ? `<p><a href="${rendered.actionUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Open in Feera</a></p>`
    : '';
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<h2 style="margin:0 0 12px">${rendered.title}</h2>
<p>${rendered.body}</p>
${action}
</body></html>`;
}

export class ResendEmailChannel implements NotificationChannel {
  readonly name = 'resend_email' as const;

  async send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult> {
    if (!req.recipient.email) {
      return { channel: this.name, status: 'skipped', reason: 'missing_recipient_field' };
    }
    const client = await getClient();
    const from = process.env.EMAIL_FROM ?? 'Feera <hello@feera.ai>';
    if (!client) {
      return { channel: this.name, status: 'skipped', reason: 'missing_credentials' };
    }
    try {
      const res = await client.emails.send({
        from,
        to: req.recipient.email,
        subject: rendered.title,
        html: renderHtml(rendered),
        text: `${rendered.body}${rendered.actionUrl ? `\n\n${rendered.actionUrl}` : ''}`,
      });
      if (res.error) {
        return { channel: this.name, status: 'failed', reason: res.error.message };
      }
      return {
        channel: this.name,
        status: 'sent',
        providerMessageId: res.data?.id,
      };
    } catch (err) {
      return {
        channel: this.name,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'resend_send_failed',
      };
    }
  }
}
