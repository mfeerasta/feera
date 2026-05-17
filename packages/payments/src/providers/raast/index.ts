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
 * Raast P2M adapter (Pakistan instant interbank, via 1Link bridge).
 *
 * Phase 1 status: scaffolded. Live calls land once M onboards with 1Link as
 * a Raast merchant (often via Soneri Bank or another acquirer). Until then
 * methods throw NotImplemented; PaymentRouter chain skips this provider.
 *
 * Reference: https://www.sbp.org.pk/raast/ (State Bank of Pakistan)
 * - QR-based P2M. Customer scans QR in their bank app, confirms, funds
 *   move instantly. Free for low-value transactions.
 * - Callback via 1Link merchant webhook (signed with shared secret).
 */
export const raastAdapter: PaymentProvider = {
  name: 'raast',
  supportedCountries: ['PK' as CountryCode],
  supportedCurrencies: ['PKR' as CurrencyCode],
  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    throw new NotImplemented('raast');
  },
  async verifyWebhook(_headers, _body): Promise<WebhookVerification> {
    throw new NotImplemented('raast');
  },
  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new NotImplemented('raast');
  },
  async getTransaction(_id: string): Promise<Transaction> {
    throw new NotImplemented('raast');
  },
};
