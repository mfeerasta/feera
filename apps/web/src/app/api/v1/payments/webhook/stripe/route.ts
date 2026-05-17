import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import {
  bookingParticipants,
  bookings,
  payments,
  paymentWebhookEvents,
} from '@feera/db';
import { db } from '@feera/db';
import { getStripeAdapter } from '@/lib/payments/router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook receiver.
 *
 * Idempotency: every event id is persisted in payment_webhook_events with a
 * UNIQUE on (provider, event_id). Re-deliveries short-circuit with a 200.
 *
 * Observability TODO: pipe accepted events into PostHog via the typed event
 * helper subagent F is landing in M3.5. For now we log to stdout so Sentry's
 * transport picks them up.
 */
export async function POST(req: NextRequest) {
  const adapter = (() => {
    try {
      return getStripeAdapter();
    } catch (err) {
      console.error('[webhook/stripe] missing envs', err);
      return null;
    }
  })();
  if (!adapter) {
    return NextResponse.json(
      { error: 'config_error', message: 'Stripe not configured.' },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  const verification = await adapter.verifyWebhook(headersObj, rawBody);
  if (!verification.verified) {
    console.warn('[webhook/stripe] bad signature', verification.reason);
    return NextResponse.json(
      { error: 'invalid_signature', message: verification.reason },
      { status: 400 },
    );
  }

  const event = verification.payload as Stripe.Event;

  // Idempotency gate. Insert; if it collides on (provider, event_id) we are a
  // re-delivery and exit cleanly.
  try {
    await db.insert(paymentWebhookEvents).values({
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('payment_webhook_events_provider_event_uq') || msg.includes('duplicate key')) {
      return NextResponse.json({ received: true, deduplicated: true }, { status: 200 });
    }
    console.error('[webhook/stripe] insert failure', err);
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(pi);
        emitPosthog('payment_succeeded', {
          provider_payment_id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          purpose: pi.metadata?.feera_purpose,
        });
        break;
      }
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await markPaymentFailed(pi, event.type);
        emitPosthog('payment_failed', {
          provider_payment_id: pi.id,
          reason: pi.last_payment_error?.message ?? event.type,
        });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await markPaymentRefunded(charge);
        emitPosthog('payment_refunded', {
          provider_payment_id: charge.payment_intent,
          amount_refunded: charge.amount_refunded,
        });
        break;
      }
      default:
        // Acknowledge unhandled events so Stripe stops retrying.
        break;
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('[webhook/stripe] handler error', event.type, err);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const purpose = pi.metadata?.feera_purpose;
  const contextId = pi.metadata?.feera_context_id;
  const payerUserId = pi.metadata?.feera_payer_user_id;

  // Flip the payments row to succeeded.
  await db
    .update(payments)
    .set({
      status: 'succeeded',
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.provider, 'stripe'), eq(payments.providerPaymentId, pi.id)));

  if (purpose === 'booking' && contextId && payerUserId) {
    // Mark this user's participant row paid.
    await db
      .update(bookingParticipants)
      .set({
        paymentStatus: 'paid',
        paidToOrganizerAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingParticipants.bookingId, contextId),
          eq(bookingParticipants.userId, payerUserId),
        ),
      );

    // If the organizer just paid full freight, confirm the booking.
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, contextId))
      .limit(1);
    if (booking && booking.organizerUserId === payerUserId && booking.status === 'pending') {
      const sumRow = await db
        .select({
          paidSum: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.as('paidSum'),
        })
        .from(payments)
        .where(
          and(
            eq(payments.contextTable, 'bookings'),
            eq(payments.contextId, contextId),
            eq(payments.status, 'succeeded'),
          ),
        );
      const paidSum = sumRow[0]?.paidSum ?? 0;
      if (Number(paidSum) + 0.001 >= Number(booking.totalAmount)) {
        await db
          .update(bookings)
          .set({ status: 'confirmed', updatedAt: new Date() })
          .where(eq(bookings.id, contextId));
      }
    }
  }
}

async function markPaymentFailed(pi: Stripe.PaymentIntent, eventType: string) {
  await db
    .update(payments)
    .set({
      status: 'failed',
      failureCode: pi.last_payment_error?.code ?? eventType,
      failureMessage: pi.last_payment_error?.message ?? eventType,
      updatedAt: new Date(),
    })
    .where(and(eq(payments.provider, 'stripe'), eq(payments.providerPaymentId, pi.id)));
}

async function markPaymentRefunded(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!pi) return;
  const refundedMajor = (charge.amount_refunded ?? 0) / 100;
  const fullyRefunded = (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);
  await db
    .update(payments)
    .set({
      status: fullyRefunded ? 'refunded' : 'partially_refunded',
      refundedAmount: refundedMajor,
      refundedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.provider, 'stripe'), eq(payments.providerPaymentId, pi)));
}

/**
 * PostHog stub. Real implementation lands with the typed event helper in M3.5.
 * For now we log a structured line that Loki / Sentry can scrape.
 */
function emitPosthog(event: string, props: Record<string, unknown>) {
  console.log(JSON.stringify({ ph_event: event, ...props }));
}
