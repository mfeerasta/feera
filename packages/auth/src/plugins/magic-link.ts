/**
 * Resend adapter for better-auth magicLink plugin.
 *
 * Env required:
 *   RESEND_API_KEY
 *   EMAIL_FROM    e.g. "Feera <hello@feera.ai>"
 */

import { Resend } from 'resend';

interface MagicLinkPayload {
  email: string;
  url: string;
  token: string;
}

let cachedClient: Resend | null = null;
function getResend(): Resend {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('[auth/magic-link] RESEND_API_KEY is required.');
  }
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

function renderHtml(url: string): string {
  // Plain, brand-neutral template. The web app can render a richer one
  // via React Email and pass `html` in directly later.
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p>Tap the link below to sign in to Feera. This link expires in 15 minutes.</p>
  <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Sign in to Feera</a></p>
  <p style="color:#666;font-size:12px">If you did not request this, ignore this email.</p>
</body></html>`;
}

export async function sendMagicLinkEmail({ email, url }: MagicLinkPayload) {
  const from = process.env.EMAIL_FROM ?? 'Feera <hello@feera.ai>';
  const resend = getResend();
  await resend.emails.send({
    from,
    to: email,
    subject: 'Your Feera sign-in link',
    html: renderHtml(url),
  });
}

/**
 * Hook for better-auth's magicLink plugin:
 *   magicLink({ sendMagicLink: magicLinkSender() })
 */
export function magicLinkSender() {
  return async ({ email, url, token }: MagicLinkPayload) => {
    await sendMagicLinkEmail({ email, url, token });
  };
}
