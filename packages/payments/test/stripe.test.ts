/**
 * Stripe adapter smoke tests.
 *
 * Per ADR-0003 these run against real Stripe test mode when STRIPE_SECRET_KEY
 * is present. In dev and on standard CI the secret is unset and the cases are
 * skipped with a clear console reason. The `payment-smoke` GitHub Actions
 * workflow injects the secret and runs them weekly + on demand before any
 * prod deploy that touched packages/payments.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { StripeAdapter } from '../src/providers/stripe/index';
import type { CheckoutInput } from '../src/types';
import type { CountryCode, CurrencyCode, Uuid } from '@feera/types';

const HAS_KEY = !!process.env.STRIPE_SECRET_KEY;
const HAS_WEBHOOK = !!process.env.STRIPE_WEBHOOK_SECRET;

const describeWhen = HAS_KEY && HAS_WEBHOOK ? describe : describe.skip;

beforeAll(() => {
  if (!HAS_KEY || !HAS_WEBHOOK) {
    // eslint-disable-next-line no-console
    console.log(
      '[stripe.test] Skipping: STRIPE_SECRET_KEY and/or STRIPE_WEBHOOK_SECRET not set. ' +
        'These cases run in the payment-smoke workflow (ADR-0003).',
    );
  }
});

describeWhen('StripeAdapter integration (test mode)', () => {
  let adapter: StripeAdapter;
  beforeAll(() => {
    adapter = new StripeAdapter({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
  });

  it('creates a PaymentIntent and returns a usable client_secret', async () => {
    const input: CheckoutInput = {
      amountMinor: 500, // $5 in cents
      currency: 'USD' as CurrencyCode,
      idempotencyKey: `feera-test-${Date.now()}`,
      payerUserId: '00000000-0000-4000-8000-000000000001' as Uuid,
      payerCountryCode: 'US' as CountryCode,
      purpose: 'booking',
      contextId: '00000000-0000-4000-8000-000000000002' as Uuid,
      successUrl: 'https://www.feera.ai/payment/success',
      cancelUrl: 'https://www.feera.ai/payment/cancel',
      webhookUrl: 'https://www.feera.ai/api/v1/payments/webhook/stripe',
      metadata: { test: 'smoke' },
    };

    const result = await adapter.createCheckout(input);
    expect(result.provider).toBe('stripe');
    expect(result.providerTransactionId).toMatch(/^pi_/);
    expect(result.redirectUrl).toContain('stripe://confirm?cs=');
    expect(['pending', 'requires_action']).toContain(result.status);

    // Refund the unconfirmed intent should be a no-op error path in Stripe. We
    // instead just verify retrieval works.
    const tx = await adapter.getTransaction(result.providerTransactionId);
    expect(tx.providerTransactionId).toBe(result.providerTransactionId);
    expect(tx.amountMinor).toBe(500);
  }, 30_000);
});

describe('StripeAdapter unit', () => {
  it('throws on missing secret key', () => {
    expect(
      () => new StripeAdapter({ secretKey: '', webhookSecret: 'whsec_x' }),
    ).toThrow(/secretKey/);
  });

  it('throws on missing webhook secret', () => {
    expect(
      () => new StripeAdapter({ secretKey: 'sk_test_x', webhookSecret: '' }),
    ).toThrow(/webhookSecret/);
  });
});
