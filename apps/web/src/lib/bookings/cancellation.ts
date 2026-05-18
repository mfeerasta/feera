/**
 * Cancellation policy for bookings.
 *
 * Mirrors the norms used by PadelLock + Playtomic so players coming from those
 * apps see expected behaviour:
 *
 *   > 24h before start    : full refund          (refundFraction = 1)
 *   4-24h before start    : 50% refund, club keeps 50% (refundFraction = 0.5)
 *   < 4h before start     : booking can still be cancelled to free the court
 *                           but no money is returned        (refundFraction = 0)
 *   after start_at        : cancellation is no longer allowed; the booking
 *                           must be reconciled via the match-creation /
 *                           no-show flow.
 *
 * Pure logic. Tested in `apps/web/test/cancellation.test.ts`. No DB / Stripe
 * coupling here so the policy stays reviewable on its own.
 */

export type RefundFraction = 0 | 0.5 | 1;

export interface CancellationBookingInput {
  startAt: Date;
  status: 'pending' | 'confirmed' | 'in_progress' | 'cancelled' | 'completed' | 'no_show';
}

export interface CancellationOutcome {
  canCancel: boolean;
  refundFraction: RefundFraction;
  /** Human-friendly justification, surfaced in the UI + audit log. */
  reason: string;
  /** Hours between `now` and `startAt`. Negative once the booking has started. */
  hoursUntilStart: number;
}

const MS_PER_HOUR = 60 * 60 * 1000;

export function computeCancellationOutcome(
  booking: CancellationBookingInput,
  now: Date,
): CancellationOutcome {
  const hoursUntilStart = (booking.startAt.getTime() - now.getTime()) / MS_PER_HOUR;

  if (booking.status === 'cancelled') {
    return {
      canCancel: false,
      refundFraction: 0,
      reason: 'Booking is already cancelled.',
      hoursUntilStart,
    };
  }
  if (booking.status === 'completed' || booking.status === 'no_show') {
    return {
      canCancel: false,
      refundFraction: 0,
      reason: 'Booking is closed and cannot be cancelled.',
      hoursUntilStart,
    };
  }

  if (hoursUntilStart <= 0) {
    return {
      canCancel: false,
      refundFraction: 0,
      reason: 'The booking has already started. Use no-show or complete instead.',
      hoursUntilStart,
    };
  }

  if (hoursUntilStart >= 24) {
    return {
      canCancel: true,
      refundFraction: 1,
      reason: 'More than 24 hours before start: full refund.',
      hoursUntilStart,
    };
  }

  if (hoursUntilStart >= 4) {
    return {
      canCancel: true,
      refundFraction: 0.5,
      reason: 'Between 4 and 24 hours before start: 50 percent refund, club retains 50 percent.',
      hoursUntilStart,
    };
  }

  return {
    canCancel: true,
    refundFraction: 0,
    reason: 'Less than 4 hours before start: court is freed but the payment is non refundable.',
    hoursUntilStart,
  };
}

/**
 * Helper for callers that already have an amount in minor units and want the
 * refund integer. Rounds half-up so 50 percent of an odd minor amount stays
 * inside the original total (e.g. 75 -> 38 refund + 37 retained).
 */
export function computeRefundMinor(
  amountMinor: number,
  fraction: RefundFraction,
): number {
  if (fraction === 0) return 0;
  if (fraction === 1) return amountMinor;
  return Math.round(amountMinor * fraction);
}
