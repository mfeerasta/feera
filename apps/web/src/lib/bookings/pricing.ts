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
  totalAmount: number;
  currency: string;
  warning?: 'no_pricing_rule_matched';
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
