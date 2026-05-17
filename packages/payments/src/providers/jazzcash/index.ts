import type { CountryCode, CurrencyCode } from '@feera/types';
import { NotImplemented } from '../../router.js';
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  Transaction,
  WebhookVerification,
} from '../../types.js';

/**
 * JazzCash REST adapter (Pakistan mobile wallet + card).
 *
 * Phase 1 status: scaffolded. Live calls land once M opens a JazzCash merchant
 * account with SQ Enterprises and we capture sandbox + production endpoints.
 * Until then every method throws NotImplemented so PaymentRouter skips this
 * provider in the chain (per ADR-0003).
 *
 * Reference: https://sandbox.jazzcash.com.pk/Sandbox/ (DigitalPaymentSystem)
 * - HMAC-SHA256 (`pp_SecureHash`) over sorted non-empty fields + integrity salt.
 * - Hosted checkout: POST -> redirect to JazzCash checkout, callback to webhookUrl.
 * - Status query: GET /Sandbox/.../PaymentInquiry/Inquire/RECURRING/{txnRefNo}.
 */
export const jazzCashAdapter: PaymentProvider = {
  name: 'jazzcash',
  supportedCountries: ['PK' as CountryCode],
  supportedCurrencies: ['PKR' as CurrencyCode],
  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    throw new NotImplemented('jazzcash');
  },
  async verifyWebhook(_headers, _body): Promise<WebhookVerification> {
    throw new NotImplemented('jazzcash');
  },
  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new NotImplemented('jazzcash');
  },
  async getTransaction(_id: string): Promise<Transaction> {
    throw new NotImplemented('jazzcash');
  },
};
