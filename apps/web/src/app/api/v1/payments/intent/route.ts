import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  bookingParticipants,
  bookings,
  payments,
} from '@feera/db';
import type { CountryCode, CurrencyCode, Uuid } from '@feera/types';
import {
  badRequest,
  created,
  forbidden,
  fromZodError,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getPaymentRouter } from '@/lib/payments/router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const intentSchema = z.object({
  bookingId: z.string().uuid(),
  payerUserId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
});

function toMajor(minor: number): number {
  // payments.amount is stored as a double in major units (the schema uses
  // doublePrecision). We persist majors but the provider speaks minors.
  return Math.round(minor) / 100;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = intentSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const input = parsed.data;

    // Caller can only mint an intent for themselves (or platform admin for any).
    if (session.role !== 'platform_admin' && session.userId !== input.payerUserId) {
      return forbidden('Cannot create a payment intent on behalf of another user.');
    }

    const router = getPaymentRouter();

    const outcome = await withRequestContext(session, async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) return { kind: 'notFound' as const };

      // Authorization: organizer or invited/accepted participant.
      const isOrganizer = booking.organizerUserId === input.payerUserId;
      if (!isOrganizer) {
        const [part] = await tx
          .select({ id: bookingParticipants.id })
          .from(bookingParticipants)
          .where(
            and(
              eq(bookingParticipants.bookingId, input.bookingId),
              eq(bookingParticipants.userId, input.payerUserId),
            ),
          )
          .limit(1);
        if (!part) return { kind: 'forbidden' as const };
      }

      // Sum existing succeeded payments on this booking to detect over-pay.
      const succeeded = await tx
        .select({
          amount: payments.amount,
          status: payments.status,
        })
        .from(payments)
        .where(
          and(
            eq(payments.contextTable, 'bookings'),
            eq(payments.contextId, input.bookingId),
          ),
        );
      const paidMajor = succeeded
        .filter((r) => r.status === 'succeeded')
        .reduce((s, r) => s + Number(r.amount), 0);
      const requestedMajor = toMajor(input.amountMinor);
      if (paidMajor + requestedMajor > Number(booking.totalAmount) + 0.001) {
        return { kind: 'overpaid' as const };
      }

      const idempotencyKey = `feera-booking-${input.bookingId}-${input.payerUserId}-${input.amountMinor}`;

      const checkout = await router.createCheckout({
        amountMinor: input.amountMinor,
        currency: input.currency as CurrencyCode,
        idempotencyKey,
        payerUserId: input.payerUserId as Uuid,
        payerCountryCode: session.countryCode as CountryCode,
        purpose: 'booking',
        contextId: input.bookingId as Uuid,
        successUrl: `${process.env.APP_URL ?? 'https://www.feera.ai'}/admin/bookings/${input.bookingId}`,
        cancelUrl: `${process.env.APP_URL ?? 'https://www.feera.ai'}/admin/bookings/${input.bookingId}`,
        webhookUrl: `${process.env.APP_URL ?? 'https://www.feera.ai'}/api/v1/payments/webhook/stripe`,
        metadata: { booking_id: input.bookingId },
      });

      const [row] = await tx
        .insert(payments)
        .values({
          payerUserId: input.payerUserId,
          payeeClubId: null,
          payeeUserId: null,
          purpose: 'booking',
          contextTable: 'bookings',
          contextId: input.bookingId,
          provider: 'stripe',
          providerPaymentId: checkout.providerTransactionId,
          amount: requestedMajor,
          currency: input.currency,
          status: 'pending',
          metadata: { idempotency_key: idempotencyKey },
        })
        .returning();

      // Strip the stripe:// prefix so the web client gets the raw client_secret.
      const clientSecret = decodeURIComponent(
        checkout.redirectUrl.replace(/^stripe:\/\/confirm\?cs=/, ''),
      );

      return {
        kind: 'ok' as const,
        paymentId: row?.id,
        providerTransactionId: checkout.providerTransactionId,
        clientSecret,
        status: checkout.status,
      };
    });

    if (outcome.kind === 'notFound') return notFound('Booking not found.');
    if (outcome.kind === 'forbidden')
      return forbidden('User is not a participant on this booking.');
    if (outcome.kind === 'overpaid')
      return badRequest('Payment would exceed the booking total.');

    return created({
      data: {
        paymentId: outcome.paymentId,
        providerTransactionId: outcome.providerTransactionId,
        clientSecret: outcome.clientSecret,
        status: outcome.status,
      },
    });
  } catch (err) {
    return serverError('payments/intent:POST', err);
  }
}
