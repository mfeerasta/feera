/**
 * Common types for the payments adapter layer. Every PaymentProvider speaks these.
 * Money is integer minor units (paisa, cents, fils, halalas).
 */

import type { CountryCode, CurrencyCode, Uuid } from '@feera/types';

export type PaymentProviderName =
  | 'stripe'
  | 'jazzcash'
  | 'easypaisa'
  | 'raast'
  | 'checkout'
  | 'mada'
  | 'stcpay'
  | 'tabby'
  | 'tamara'
  | 'cash';

export type CheckoutMethod =
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'wallet'
  | 'raast_qr'
  | 'bank_transfer'
  | 'cash';

export type CheckoutInput = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
  /** Idempotency key the platform mints, so retries do not double-charge. */
  idempotencyKey: string;
  payerUserId: Uuid;
  payerCountryCode: CountryCode;
  /** What the user is paying for. Stored alongside the payment for reconciliation. */
  purpose: 'booking' | 'tournament' | 'coaching' | 'edition_membership';
  contextId: Uuid;
  /** Where the provider posts back. */
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  /** Optional override; defaults are inferred from country. */
  preferredMethod?: CheckoutMethod;
  /** Free-form key-value bag sent through to the provider for ops debugging. */
  metadata?: Record<string, string>;
}>;

export type CheckoutResult = Readonly<{
  provider: PaymentProviderName;
  providerTransactionId: string;
  /** URL or deep-link to drop the user into for completion. */
  redirectUrl: string;
  status: 'pending' | 'requires_action' | 'succeeded';
  rawProviderResponse: unknown;
}>;

export type WebhookVerification = Readonly<
  | { verified: true; eventId: string; eventType: string; payload: unknown }
  | { verified: false; reason: string }
>;

export type RefundInput = Readonly<{
  providerTransactionId: string;
  amountMinor?: number;
  reason?: 'requested_by_customer' | 'fraud' | 'duplicate' | 'other';
  idempotencyKey: string;
}>;

export type RefundResult = Readonly<{
  provider: PaymentProviderName;
  providerRefundId: string;
  amountMinor: number;
  status: 'pending' | 'succeeded' | 'failed';
  rawProviderResponse: unknown;
}>;

export type Transaction = Readonly<{
  provider: PaymentProviderName;
  providerTransactionId: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  paidAt?: string;
  refundedAmountMinor: number;
  rawProviderResponse: unknown;
}>;

export type PayoutInput = Readonly<{
  payeeType: 'club' | 'coach' | 'tournament' | 'organizer';
  payeeId: Uuid;
  amountMinor: number;
  currency: CurrencyCode;
  /** Provider-specific destination details (bank, wallet, IBAN, Stripe Connect id, etc.). */
  destination: Record<string, string>;
  idempotencyKey: string;
}>;

export type PayoutResult = Readonly<{
  provider: PaymentProviderName;
  providerPayoutId: string;
  amountMinor: number;
  status: 'pending' | 'paid' | 'failed';
  estimatedArrivalAt?: string;
  rawProviderResponse: unknown;
}>;

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly supportedCountries: readonly CountryCode[];
  readonly supportedCurrencies: readonly CurrencyCode[];

  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<WebhookVerification>;
  refund(input: RefundInput): Promise<RefundResult>;
  getTransaction(providerTransactionId: string): Promise<Transaction>;
  capturePayment?(providerTransactionId: string): Promise<Transaction>;
  createPayout?(input: PayoutInput): Promise<PayoutResult>;
}
