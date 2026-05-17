import type { NotificationTemplate } from '../types.js';
import { t } from './t.js';

type Vars = 'amount' | 'currency' | 'purpose' | 'receiptId';

export const paymentSucceeded: NotificationTemplate<Vars> = {
  name: 'payment_succeeded',
  variables: ['amount', 'currency', 'purpose', 'receiptId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Payment received'),
      body: t(
        locale,
        `We received ${vars.amount} ${vars.currency} for your ${vars.purpose}. Receipt ${vars.receiptId}.`,
      ),
      actionUrl: `feera://receipt/${vars.receiptId}`,
    };
  },
};
