/**
 * Stripe PaymentProvider adapter.
 *
 * Uses PaymentIntents (not Checkout Sessions) so the mobile + web flows can
 * confirm the card client-side via Stripe.js / Stripe RN SDK. The PaymentIntent's
 * client_secret is returned in the `redirectUrl` slot, prefixed with a
 * `stripe://confirm?cs=` marker so the mobile shell can intercept it.
 *
 * TODO(payments): finalise the mobile deep link convention with the RN team.
 * Web app reads `redirectUrl`, strips the `stripe://confirm?cs=` prefix, and
 * hands the raw client_secret to Stripe.js. Mobile shell intercepts the
 * scheme and routes into PaymentSheet.
 */

import Stripe from 'stripe';
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  PayoutInput,
  PayoutResult,
  RefundInput,
  RefundResult,
  Transaction,
  WebhookVerification,
} from '../../types';
import { NotImplemented } from '../../router';
import type { CountryCode, CurrencyCode } from '@feera/types';

export type StripeAdapterOptions = Readonly<{
  secretKey: string;
  webhookSecret: string;
  /** Use manual capture for organizer-led bookings where the slot is held first. */
  defaultCaptureMethod?: 'automatic' | 'manual';
  /** Inject a stub Stripe client in tests. */
  stripeClient?: Stripe;
}>;

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-08-27.basil';

/**
 * Currencies Stripe treats as zero-decimal. Everything else is 100x minor units.
 * https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Stripe accepts the amount in its own minor-unit convention. Our CheckoutInput
 * already speaks minor units (paisa, cents, fils). For zero-decimal currencies
 * Stripe expects the major-unit integer instead.
 */
function toStripeAmount(amountMinor: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amountMinor / 100) : amountMinor;
}

function fromStripeAmount(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? amount * 100 : amount;
}

function mapPiStatus(s: Stripe.PaymentIntent.Status): CheckoutResult['status'] {
  switch (s) {
    case 'succeeded':
      return 'succeeded';
    case 'requires_action':
    case 'requires_confirmation':
    case 'requires_payment_method':
      return 'requires_action';
    default:
      return 'pending';
  }
}

function mapTxStatus(pi: Stripe.PaymentIntent, refundedAmount = 0): Transaction['status'] {
  if (pi.status === 'succeeded') {
    if (refundedAmount > 0 && refundedAmount >= (pi.amount_received ?? pi.amount)) return 'refunded';
    if (refundedAmount > 0) return 'partially_refunded';
    return 'succeeded';
  }
  if (pi.status === 'canceled' || pi.last_payment_error) return 'failed';
  return 'pending';
}

const SUPPORTED_COUNTRIES = [
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'PK', 'US', 'GB', 'EU', 'CA',
  'FR', 'DE', 'ES', 'IT', 'PT', 'NL', 'BE', 'IE', 'AT', 'FI', 'SE', 'DK',
] as readonly string[] as readonly CountryCode[];

const SUPPORTED_CURRENCIES = [
  'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'PKR', 'USD', 'GBP', 'EUR', 'CAD',
] as readonly string[] as readonly CurrencyCode[];

export class StripeAdapter implements PaymentProvider {
  readonly name = 'stripe' as const;
  readonly supportedCountries = SUPPORTED_COUNTRIES;
  readonly supportedCurrencies = SUPPORTED_CURRENCIES;

  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly defaultCaptureMethod: 'automatic' | 'manual';

  constructor(opts: StripeAdapterOptions) {
    if (!opts.secretKey) throw new Error('StripeAdapter: secretKey is required');
    if (!opts.webhookSecret) throw new Error('StripeAdapter: webhookSecret is required');
    this.webhookSecret = opts.webhookSecret;
    this.defaultCaptureMethod = opts.defaultCaptureMethod ?? 'automatic';
    this.stripe =
      opts.stripeClient ??
      new Stripe(opts.secretKey, {
        apiVersion: STRIPE_API_VERSION,
        typescript: true,
        appInfo: { name: 'feera-web', version: '0.1.0' },
      });
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: toStripeAmount(input.amountMinor, input.currency),
      currency: input.currency.toLowerCase(),
      capture_method: this.defaultCaptureMethod,
      automatic_payment_methods: { enabled: true },
      metadata: {
        feera_payer_user_id: input.payerUserId,
        feera_purpose: input.purpose,
        feera_context_id: input.contextId,
        feera_country: input.payerCountryCode,
        ...(input.metadata ?? {}),
      },
    };

    const pi = await this.stripe.paymentIntents.create(params, {
      idempotencyKey: input.idempotencyKey,
    });

    const cs = pi.client_secret ?? '';
    return {
      provider: 'stripe',
      providerTransactionId: pi.id,
      redirectUrl: `stripe://confirm?cs=${encodeURIComponent(cs)}`,
      status: mapPiStatus(pi.status),
      rawProviderResponse: pi,
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<WebhookVerification> {
    const sig =
      headers['stripe-signature'] ??
      headers['Stripe-Signature'] ??
      headers['STRIPE-SIGNATURE'];
    if (!sig) return { verified: false, reason: 'missing stripe-signature header' };
    try {
      const event = await this.stripe.webhooks.constructEventAsync(
        rawBody,
        sig,
        this.webhookSecret,
      );
      return { verified: true, eventId: event.id, eventType: event.type, payload: event };
    } catch (err) {
      return { verified: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // Stripe's `reason` enum is narrower than ours; only forward the values it
    // accepts. 'fraud' on our side maps to 'fraudulent' on Stripe's side.
    let stripeReason: Stripe.RefundCreateParams.Reason | undefined;
    if (input.reason === 'requested_by_customer') stripeReason = 'requested_by_customer';
    else if (input.reason === 'duplicate') stripeReason = 'duplicate';
    else if (input.reason === 'fraud') stripeReason = 'fraudulent';
    const params: Stripe.RefundCreateParams = {
      payment_intent: input.providerTransactionId,
      reason: stripeReason,
    };
    if (typeof input.amountMinor === 'number') {
      // Refund amounts are in the currency's smallest unit too; reuse the PI currency.
      const pi = await this.stripe.paymentIntents.retrieve(input.providerTransactionId);
      params.amount = toStripeAmount(input.amountMinor, pi.currency);
    }
    const refund = await this.stripe.refunds.create(params, {
      idempotencyKey: input.idempotencyKey,
    });
    const status: RefundResult['status'] =
      refund.status === 'succeeded'
        ? 'succeeded'
        : refund.status === 'failed' || refund.status === 'canceled'
          ? 'failed'
          : 'pending';
    return {
      provider: 'stripe',
      providerRefundId: refund.id,
      amountMinor: fromStripeAmount(refund.amount, refund.currency),
      status,
      rawProviderResponse: refund,
    };
  }

  async getTransaction(providerTransactionId: string): Promise<Transaction> {
    const pi = await this.stripe.paymentIntents.retrieve(providerTransactionId);
    // Refunds in the basil API live on the refunds resource keyed by PI.
    let refundedAmount = 0;
    try {
      const refunds = await this.stripe.refunds.list({
        payment_intent: providerTransactionId,
        limit: 100,
      });
      refundedAmount = refunds.data.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    } catch {
      // Non-fatal; refunds endpoint may 404 for very young PIs.
    }
    return {
      provider: 'stripe',
      providerTransactionId: pi.id,
      amountMinor: fromStripeAmount(pi.amount, pi.currency),
      currency: pi.currency.toUpperCase() as CurrencyCode,
      status: mapTxStatus(pi, refundedAmount),
      paidAt: pi.status === 'succeeded' ? new Date(pi.created * 1000).toISOString() : undefined,
      refundedAmountMinor: fromStripeAmount(refundedAmount, pi.currency),
      rawProviderResponse: pi,
    };
  }

  async capturePayment(providerTransactionId: string): Promise<Transaction> {
    const pi = await this.stripe.paymentIntents.capture(providerTransactionId);
    return {
      provider: 'stripe',
      providerTransactionId: pi.id,
      amountMinor: fromStripeAmount(pi.amount, pi.currency),
      currency: pi.currency.toUpperCase() as CurrencyCode,
      status: mapTxStatus(pi),
      paidAt: pi.status === 'succeeded' ? new Date(pi.created * 1000).toISOString() : undefined,
      refundedAmountMinor: 0,
      rawProviderResponse: pi,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createPayout(_input: PayoutInput): Promise<PayoutResult> {
    // Stripe Connect onboarding + transfers land in Phase 2. Falls through the
    // PaymentRouter chain via the NotImplemented sentinel.
    throw new NotImplemented('stripe');
  }
}

export function createStripeAdapter(opts: StripeAdapterOptions): StripeAdapter {
  return new StripeAdapter(opts);
}
