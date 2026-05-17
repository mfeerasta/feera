import { and, eq, lt, gt } from 'drizzle-orm';
import { courtPricingRules } from '@feera/db';
import type { db as Db } from '@feera/db';

export interface PricingResolveInput {
  courtId: string;
  startAt: Date;
  endAt: Date;
  isEditionMember: boolean;
}

export interface PricingResult {
  /** Court total in major units, the historical contract. */
  totalAmount: number;
  currency: string;
  warning?: 'no_pricing_rule_matched';
}

export interface ComputePricingOptions {
  /** Optional per-seat split applied to the organizer's upfront charge. */
  seatsBooked?: number;
  maxParticipants?: number;
  /** Credit applied to the organizer's payment, in major units. Never negative; capped at total. */
  creditsApplied?: number;
}

export interface ComputedPricing extends PricingResult {
  /** Per-seat price in major units (court total / maxParticipants), rounded to 2dp. */
  perSeatAmount: number;
  /** What the organizer owes upfront, in major units. perSeatAmount * seatsBooked, minus credits. */
  organizerAmount: number;
  /** Credit consumed (capped at organizer's pre-credit subtotal). */
  creditApplied: number;
}

/**
 * Phase 1 pricing resolver.
 *
 * Looks for `court_pricing_rules` whose day-of-week + time window straddles
 * the booking's start time. Among all matches:
 *   1. Filter Edition-only rules unless the organizer is an active Edition member.
 *   2. Pick the most specific rule: peak > member-only > default.
 *
 * If no rule matches we surface a `priceWarning: 'no_pricing_rule_matched'`
 * with a 1000 PKR fallback so the caller can still confirm and book a slot.
 */
export async function resolvePricing(
  tx: typeof Db,
  input: PricingResolveInput,
): Promise<PricingResult> {
  const dayOfWeek = input.startAt.getUTCDay();
  // Format the booking time as HH:MM:SS so the comparison against
  // pg `time` columns lines up.
  const slotTime = input.startAt.toISOString().slice(11, 19);

  const rules = await tx
    .select()
    .from(courtPricingRules)
    .where(
      and(
        eq(courtPricingRules.courtId, input.courtId),
        eq(courtPricingRules.dayOfWeek, dayOfWeek),
        // start_time <= slotTime < end_time
        lt(courtPricingRules.startTime, slotTime),
        gt(courtPricingRules.endTime, slotTime),
      ),
    );

  const eligible = rules.filter(
    (r) => input.isEditionMember || !r.appliesToEditionOnly,
  );

  if (eligible.length === 0) {
    return {
      totalAmount: 1000,
      currency: 'PKR',
      warning: 'no_pricing_rule_matched',
    };
  }

  // Most specific first: peak > member-only > default. Pick the first match.
  eligible.sort((a, b) => {
    const score = (r: typeof a) =>
      (r.isPeak ? 4 : 0) +
      (r.isMemberOnly ? 2 : 0) +
      (r.appliesToEditionOnly ? 1 : 0);
    return score(b) - score(a);
  });

  const chosen = eligible[0]!;
  // Slot rate is per the rule's slot, not per minute. Phase 1: 1 slot = 1 booking.
  return {
    totalAmount: chosen.pricePerSlot,
    currency: chosen.currency,
  };
}

/**
 * Per-seat price split. Rounds to 2 decimal places (major units). The seat
 * total may be a fraction of a paisa off the court total once you sum across
 * all participants, which the booking POST handler reconciles by charging
 * any rounding remainder to the organizer's first seat.
 */
export function computePerSeatPrice(
  courtTotal: number,
  maxParticipants: number,
): number {
  if (maxParticipants <= 0) return courtTotal;
  return Math.round((courtTotal / maxParticipants) * 100) / 100;
}

/**
 * Combine the resolved court price with per-seat split + applied credits.
 * Caller passes the already-resolved court total so this stays a pure helper.
 */
export function computePricing(
  resolved: PricingResult,
  opts: ComputePricingOptions = {},
): ComputedPricing {
  const max = Math.max(opts.maxParticipants ?? 1, 1);
  const seats = Math.min(Math.max(opts.seatsBooked ?? max, 1), max);
  const perSeat = computePerSeatPrice(resolved.totalAmount, max);
  // Organizer pays for their seats. If they're the only seat, they cover any
  // rounding gap so the court total still nets out.
  let organizerPreCredit = Math.round(perSeat * seats * 100) / 100;
  if (seats === max) {
    organizerPreCredit = resolved.totalAmount;
  }

  const credit = Math.max(0, Math.min(opts.creditsApplied ?? 0, organizerPreCredit));
  const organizerAmount = Math.max(0, Math.round((organizerPreCredit - credit) * 100) / 100);

  return {
    ...resolved,
    perSeatAmount: perSeat,
    organizerAmount,
    creditApplied: credit,
  };
}
