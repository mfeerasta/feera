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
 * Easypaisa REST adapter (Pakistan mobile wallet).
 *
 * Phase 1 status: scaffolded. Live calls land once M opens Easypaisa merchant
 * onboarding. Until then methods throw NotImplemented; PaymentRouter chain
 * skips this provider (per ADR-0003).
 *
 * Reference: https://easypay.easypaisa.com.pk/easypay/Index.jsf
 * - HMAC-SHA256 hash of pipe-separated fields with merchant secret.
 * - Hosted checkout: form POST -> Easypaisa screen -> callback to webhookUrl.
 */
export const easyPaisaAdapter: PaymentProvider = {
  name: 'easypaisa',
  supportedCountries: ['PK' as CountryCode],
  supportedCurrencies: ['PKR' as CurrencyCode],
  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    throw new NotImplemented('easypaisa');
  },
  async verifyWebhook(_headers, _body): Promise<WebhookVerification> {
    throw new NotImplemented('easypaisa');
  },
  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new NotImplemented('easypaisa');
  },
  async getTransaction(_id: string): Promise<Transaction> {
    throw new NotImplemented('easypaisa');
  },
};
