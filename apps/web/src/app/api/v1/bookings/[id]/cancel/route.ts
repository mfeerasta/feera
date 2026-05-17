import type { NextRequest } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  bookingCredits,
  bookingJoinRequests,
  bookingParticipants,
  bookings,
  payments,
} from '@feera/db';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  computeCancellationOutcome,
  computeRefundMinor,
} from '@/lib/bookings/cancellation';
import { getPaymentRouter } from '@/lib/payments/router';
import { NotImplemented, type PaymentProviderName } from '@feera/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

function majorToMinor(major: number): number {
  return Math.round(major * 100);
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return unauthorized();
    const isAdmin = session.role === 'platform_admin';

    const result = await withRequestContext(session, async (tx) => {
      // Lock isolation for the cancel + refund + ledger writes so concurrent
      // mutations on the same booking don't double-refund or skip credit
      // accrual.
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);
      if (!booking) return { kind: 'not_found' as const };
      if (!isAdmin && booking.organizerUserId !== session.userId) {
        return { kind: 'forbidden' as const };
      }

      const outcome = computeCancellationOutcome(
        { startAt: booking.startAt, status: booking.status },
        new Date(),
      );

      if (!outcome.canCancel && booking.status === 'cancelled') {
        // Idempotent: already cancelled, return current state.
        return { kind: 'already_cancelled' as const, booking };
      }
      if (!outcome.canCancel) {
        return { kind: 'cannot_cancel' as const, reason: outcome.reason };
      }

      // 1. Flip booking status first so a refund failure does not block court
      //    release. Refund errors are logged + the cancellation still stands;
      //    operator reconciles via Stripe dashboard.
      const [updated] = await tx
        .update(bookings)
        .set({ status: 'cancelled' })
        .where(eq(bookings.id, id))
        .returning();
      if (!updated) return { kind: 'not_found' as const };

      // 2. Refund every succeeded payment row on this booking, partial per
      //    refundFraction. Pending / failed rows are ignored. Each refund call
      //    uses an idempotency key so retries are safe.
      const paymentRows = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.contextTable, 'bookings'),
            eq(payments.contextId, id),
            eq(payments.status, 'succeeded'),
          ),
        );

      const refundResults: Array<{
        paymentId: string;
        refundedMinor: number;
        status: 'succeeded' | 'pending' | 'failed' | 'manual_required';
      }> = [];

      if (paymentRows.length > 0) {
        let router: ReturnType<typeof getPaymentRouter> | null = null;
        try {
          router = getPaymentRouter();
        } catch (err) {
          // STRIPE_SECRET_KEY missing on the box. The booking is still
          // cancelled; operator handles refund manually.
          console.warn('[bookings.cancel] payment router unavailable, refunds deferred', {
            bookingId: id,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        for (const row of paymentRows) {
          if (!row.providerPaymentId) continue;
          const paidMinor = majorToMinor(Number(row.amount));
          const refundMinor = computeRefundMinor(paidMinor, outcome.refundFraction);
          if (refundMinor <= 0) continue;
          if (!router) {
            refundResults.push({
              paymentId: row.id,
              refundedMinor: refundMinor,
              status: 'manual_required',
            });
            continue;
          }
          // Route refunds through the matching provider adapter. Phase 1 only
          // wires stripe; the router selects it from row.provider.
          // `manual` rows are reconciled by hand; the adapter chain skips them.
          if (row.provider === 'manual') {
            refundResults.push({
              paymentId: row.id,
              refundedMinor: refundMinor,
              status: 'manual_required',
            });
            continue;
          }
          const provider = router.getProvider(row.provider as PaymentProviderName);
          if (!provider) {
            refundResults.push({
              paymentId: row.id,
              refundedMinor: refundMinor,
              status: 'manual_required',
            });
            continue;
          }
          try {
            const result = await provider.refund({
              providerTransactionId: row.providerPaymentId,
              amountMinor: refundMinor,
              reason: 'requested_by_customer',
              idempotencyKey: `feera-refund-${row.id}-${outcome.refundFraction}`,
            });
            await tx
              .update(payments)
              .set({
                status: result.status === 'succeeded'
                  ? (outcome.refundFraction === 1 ? 'refunded' : 'partially_refunded')
                  : 'processing',
                refundedAmount: Number(row.refundedAmount) + result.amountMinor / 100,
                refundedAt: new Date(),
              })
              .where(eq(payments.id, row.id));
            refundResults.push({
              paymentId: row.id,
              refundedMinor: result.amountMinor,
              status: result.status,
            });
          } catch (err) {
            if (err instanceof NotImplemented) {
              refundResults.push({
                paymentId: row.id,
                refundedMinor: refundMinor,
                status: 'manual_required',
              });
              continue;
            }
            console.error('[bookings.cancel] refund failed', {
              bookingId: id,
              paymentId: row.id,
              error: err instanceof Error ? err.message : String(err),
            });
            refundResults.push({
              paymentId: row.id,
              refundedMinor: refundMinor,
              status: 'failed',
            });
          }
        }
      }

      // 3. Cancel pending join requests + accrue credits for already-approved
      //    joiners. We pull the requests first so we can split them by status.
      const joinRows = await tx
        .select()
        .from(bookingJoinRequests)
        .where(
          and(
            eq(bookingJoinRequests.bookingId, id),
            inArray(bookingJoinRequests.status, ['pending', 'approved']),
          ),
        );

      const pendingIds = joinRows.filter((r) => r.status === 'pending').map((r) => r.id);
      const approvedRows = joinRows.filter((r) => r.status === 'approved');

      if (pendingIds.length > 0) {
        await tx
          .update(bookingJoinRequests)
          .set({ status: 'cancelled' })
          .where(inArray(bookingJoinRequests.id, pendingIds));
      }
      if (approvedRows.length > 0) {
        await tx
          .update(bookingJoinRequests)
          .set({ status: 'cancelled' })
          .where(inArray(bookingJoinRequests.id, approvedRows.map((r) => r.id)));
      }

      // For every approved joiner whose payment we cannot refund (e.g. they
      // paid the organizer directly via the per-seat flow but stripe call
      // returned manual_required), grant a credit of their per-seat share so
      // they're made whole on their next booking.
      const perSeatMajor =
        booking.maxParticipants > 0
          ? Math.round((Number(booking.totalAmount) / booking.maxParticipants) * 100) / 100
          : 0;
      for (const j of approvedRows) {
        const refundDueMajor = Math.round(perSeatMajor * j.seatsRequested * outcome.refundFraction * 100) / 100;
        if (refundDueMajor <= 0) continue;
        await tx.insert(bookingCredits).values({
          userId: j.requesterUserId,
          amountMinor: Math.round(refundDueMajor * 100),
          currency: booking.currency,
          source: 'cancellation',
          sourceBookingId: id,
          note: `Credit from cancelled booking ${id} (${outcome.refundFraction * 100}%).`,
        });
      }

      // 4. Notify confirmed participants and pending join-requesters. Real
      //    Twilio/Resend wiring lands in M6; for now emit a structured event
      //    that the notifications worker can pick up.
      const confirmedParts = await tx
        .select({ userId: bookingParticipants.userId })
        .from(bookingParticipants)
        .where(
          and(
            eq(bookingParticipants.bookingId, id),
            inArray(bookingParticipants.status, ['accepted', 'invited']),
          ),
        );

      console.info('[booking.cancelled]', {
        bookingId: id,
        actorUserId: session.userId,
        refundFraction: outcome.refundFraction,
        notifyUserIds: Array.from(
          new Set([
            ...confirmedParts.map((p) => p.userId),
            ...joinRows.map((r) => r.requesterUserId),
          ]),
        ),
        refundResults,
        creditsIssued: approvedRows.length,
      });

      return {
        kind: 'ok' as const,
        booking: updated,
        outcome,
        refundResults,
      };
    });

    if (result.kind === 'not_found') return notFound(`Booking "${id}" not found.`);
    if (result.kind === 'forbidden')
      return forbidden('Only the organizer or a club administrator may cancel.');
    if (result.kind === 'cannot_cancel') return badRequest(result.reason);
    if (result.kind === 'already_cancelled')
      return ok({ data: { id, status: 'cancelled' } });

    return ok({
      data: {
        booking: result.booking,
        refundFraction: result.outcome.refundFraction,
        reason: result.outcome.reason,
        refunds: result.refundResults,
      },
    });
  } catch (err) {
    return serverError('bookings/[id]/cancel:POST', err);
  }
}
