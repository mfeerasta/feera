#!/usr/bin/env node
// payment-reconciliation.mjs
// Cron: every 30 minutes.
// Finds payments stuck in 'pending' > 1h and reconciles them against the
// provider (Stripe in Phase 1; JazzCash/Easypaisa adapters land in M9).
//
// Env: DATABASE_URL_POOLED (required), STRIPE_SECRET_KEY (optional).
// DRY_RUN=1 only reads, never writes.

import { getSql, closeAll } from '../lib/neon.mjs';
import { sendTelegram } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('payment-reconciliation');

async function reconcileStripe(providerPaymentId) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { status: 'unknown', reason: 'no_key' };
  const res = await fetch(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(providerPaymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Stripe-Version': '2024-11-20.acacia',
      },
    },
  );
  if (!res.ok) return { status: 'unknown', reason: `stripe_${res.status}` };
  const body = await res.json();
  const stripeStatus = body.status; // succeeded | processing | requires_action | canceled | requires_payment_method
  if (stripeStatus === 'succeeded') return { status: 'succeeded' };
  if (stripeStatus === 'canceled' || stripeStatus === 'requires_payment_method') {
    return { status: 'failed', reason: stripeStatus };
  }
  return { status: 'pending', reason: stripeStatus };
}

async function run() {
  const sql = getSql();
  const dryRun = process.env.DRY_RUN === '1';

  const stuck = await sql`
    SELECT id, provider, provider_payment_id, amount, currency, created_at
      FROM payments
     WHERE status = 'pending'
       AND created_at < now() - interval '1 hour'
     ORDER BY created_at ASC
     LIMIT 100
  `;
  log.info('candidates fetched', { count: stuck.length });

  const summary = { scanned: stuck.length, succeeded: 0, failed: 0, stillPending: 0, unknown: 0 };

  for (const p of stuck) {
    let outcome;
    if (p.provider === 'stripe') {
      outcome = await reconcileStripe(p.provider_payment_id).catch((err) => ({
        status: 'unknown', reason: err.message,
      }));
    } else {
      // JazzCash + Easypaisa adapters land in M9. Mark as unknown for now so
      // the row surfaces in the Telegram digest for manual review.
      outcome = { status: 'unknown', reason: `provider_${p.provider}_not_wired` };
    }
    summary[outcome.status === 'succeeded' ? 'succeeded'
      : outcome.status === 'failed' ? 'failed'
      : outcome.status === 'pending' ? 'stillPending'
      : 'unknown'] += 1;

    if (!dryRun && (outcome.status === 'succeeded' || outcome.status === 'failed')) {
      await sql`
        UPDATE payments
           SET status = ${outcome.status},
               updated_at = now(),
               metadata = coalesce(metadata, '{}'::jsonb)
                 || jsonb_build_object('reconciled_at', now(),
                                       'reconciled_reason', ${outcome.reason ?? null})
         WHERE id = ${p.id}
      `;
    }
    log.info('reconciled', {
      paymentId: p.id,
      provider: p.provider,
      outcome,
    });
  }

  if (summary.unknown > 0 || summary.failed > 0) {
    await sendTelegram(
      `*Payment reconciliation*\nscanned: ${summary.scanned}\nsucceeded: ${summary.succeeded}\nfailed: ${summary.failed}\nstillPending: ${summary.stillPending}\nunknown: ${summary.unknown}`,
    );
  }
  log.info('done', summary);
}

run()
  .catch((err) => {
    log.error('failed', err);
    process.exit(1);
  })
  .finally(closeAll);
