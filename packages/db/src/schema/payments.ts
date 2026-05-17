import { sql } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clubs } from './clubs';
import {
  createdAtColumn,
  idColumn,
  paymentProviderEnum,
  paymentPurposeEnum,
  paymentStatusEnum,
  payoutStatusEnum,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * payments - one row per attempted charge. Idempotent on (provider, providerPaymentId).
 * payerUserId is the human who paid; payeeClubId is the club that gets the funds (null for platform fees).
 */
export const payments = pgTable(
  'payments',
  {
    id: idColumn(),
    payerUserId: uuid('payer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    payeeClubId: uuid('payee_club_id').references(() => clubs.id, {
      onDelete: 'set null',
    }),
    payeeUserId: uuid('payee_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    purpose: paymentPurposeEnum('purpose').notNull(),
    contextTable: text('context_table').notNull(),
    contextId: uuid('context_id').notNull(),
    provider: paymentProviderEnum('provider').notNull(),
    providerPaymentId: text('provider_payment_id'),
    providerCustomerId: text('provider_customer_id'),
    amount: doublePrecision('amount').notNull(),
    currency: text('currency').notNull(),
    platformFee: doublePrecision('platform_fee').notNull().default(0),
    processorFee: doublePrecision('processor_fee').notNull().default(0),
    netToPayee: doublePrecision('net_to_payee').notNull().default(0),
    status: paymentStatusEnum('status').notNull().default('pending'),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAmount: doublePrecision('refunded_amount').notNull().default(0),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('payments_provider_id_uq').on(t.provider, t.providerPaymentId),
    index('payments_payer_idx').on(t.payerUserId, t.createdAt),
    index('payments_payee_club_idx').on(t.payeeClubId, t.createdAt),
    index('payments_context_idx').on(t.contextTable, t.contextId),
    index('payments_status_idx').on(t.status),
  ],
);

/**
 * payouts - batched disbursements to clubs or coaches. Aggregates many payments.
 */
export const payouts = pgTable(
  'payouts',
  {
    id: idColumn(),
    payeeClubId: uuid('payee_club_id').references(() => clubs.id, {
      onDelete: 'set null',
    }),
    payeeUserId: uuid('payee_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    provider: paymentProviderEnum('provider').notNull(),
    providerPayoutId: text('provider_payout_id'),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    amount: doublePrecision('amount').notNull(),
    currency: text('currency').notNull(),
    status: payoutStatusEnum('status').notNull().default('pending'),
    paymentIds: jsonb('payment_ids').notNull().default(sql`'[]'::jsonb`),
    failureMessage: text('failure_message'),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('payouts_provider_id_uq').on(t.provider, t.providerPayoutId),
    index('payouts_payee_club_period_idx').on(t.payeeClubId, t.periodEnd),
    index('payouts_status_idx').on(t.status),
  ],
);
