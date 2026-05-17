/**
 * Lazy singleton PaymentRouter for the apps/web runtime.
 *
 * Constructed on first call so Next 16's build-time page data collection does
 * not need STRIPE_SECRET_KEY. Throws a clear error at request-time if the
 * envs are missing.
 */

import {
  PaymentRouter,
  type PaymentProvider,
  type PaymentProviderName,
} from '@feera/payments';
import { StripeAdapter } from '@feera/payments/providers/stripe';

let cached: PaymentRouter | null = null;

export function getPaymentRouter(): PaymentRouter {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Paste it into /srv/feera/.env and pm2 reload feera-web.',
    );
  }
  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. Paste it into /srv/feera/.env and pm2 reload feera-web.',
    );
  }

  const stripe = new StripeAdapter({ secretKey, webhookSecret });
  const providers = new Map<PaymentProviderName, PaymentProvider>([['stripe', stripe]]);
  cached = new PaymentRouter({ providers });
  return cached;
}

export function getStripeAdapter(): StripeAdapter {
  // Cheap second handle so the webhook route does not have to traverse the
  // router chain to verify signatures.
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw new Error('Stripe envs missing; cannot verify webhook.');
  }
  return new StripeAdapter({ secretKey, webhookSecret });
}
