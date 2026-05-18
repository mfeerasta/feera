import { sql } from 'drizzle-orm';
import type { db as Db } from '@feera/db';

/**
 * Revenue aggregation helpers for the club owner dashboard.
 * All sums look at payments with status = 'succeeded' joined back to the
 * club via the booking's court. Refunds use refunded_amount on the same row.
 */

export interface RevenueSummary {
  grossMinor: number;
  platformFeeMinor: number;
  refundsMinor: number;
  netMinor: number;
  bookingCount: number;
  avgBasketMinor: number;
  currency: string | null;
  momGrowthPct: number;
}

export interface WeeklyBucket {
  weekStart: string;
  grossMinor: number;
}

export interface RecentPayment {
  id: string;
  paidAt: string | null;
  payerName: string | null;
  courtName: string | null;
  amount: number;
  currency: string;
  status: string;
  refundedAmount: number;
}

const PAYMENTS_FROM_CLUB_BOOKINGS_SQL = sql`
  payments p
  JOIN bookings b ON b.id = p.context_id AND p.context_table = 'bookings'
  JOIN courts c ON c.id = b.court_id
`;

/**
 * Toy helper to convert decimal currency (the doublePrecision column) to
 * integer minor units (cents/paisa) for safe arithmetic in the renderer.
 */
export function toMinor(major: number): number {
  return Math.round(major * 100);
}

export async function getRevenueSummary(
  tx: typeof Db,
  args: { clubId: string; from: Date; to: Date },
): Promise<RevenueSummary> {
  const fromIso = args.from.toISOString();
  const toIso = args.to.toISOString();
  // Window 1: current
  const cur = await tx.execute<{
    gross: string | null;
    fees: string | null;
    refunds: string | null;
    bookings: string | null;
    currency: string | null;
  }>(sql`
    SELECT
      COALESCE(SUM(p.amount), 0)::text AS gross,
      COALESCE(SUM(p.platform_fee), 0)::text AS fees,
      COALESCE(SUM(p.refunded_amount), 0)::text AS refunds,
      COUNT(DISTINCT b.id)::text AS bookings,
      MAX(p.currency) AS currency
    FROM ${PAYMENTS_FROM_CLUB_BOOKINGS_SQL}
    WHERE c.club_id = ${args.clubId}::uuid
      AND p.status = 'succeeded'
      AND p.paid_at >= ${fromIso}::timestamptz
      AND p.paid_at < ${toIso}::timestamptz
  `);
  const row = (cur as unknown as Array<{
    gross: string | null;
    fees: string | null;
    refunds: string | null;
    bookings: string | null;
    currency: string | null;
  }>)[0] ?? {
    gross: '0',
    fees: '0',
    refunds: '0',
    bookings: '0',
    currency: null,
  };

  const gross = Number(row.gross ?? 0);
  const fees = Number(row.fees ?? 0);
  const refunds = Number(row.refunds ?? 0);
  const bookings = Number(row.bookings ?? 0);
  const net = gross - fees - refunds;

  // Window 0: prior 30-day window for MoM
  const windowMs = args.to.getTime() - args.from.getTime();
  const priorTo = new Date(args.from.getTime());
  const priorFrom = new Date(priorTo.getTime() - windowMs);
  const prior = await tx.execute<{ gross: string | null }>(sql`
    SELECT COALESCE(SUM(p.amount), 0)::text AS gross
    FROM ${PAYMENTS_FROM_CLUB_BOOKINGS_SQL}
    WHERE c.club_id = ${args.clubId}::uuid
      AND p.status = 'succeeded'
      AND p.paid_at >= ${priorFrom.toISOString()}::timestamptz
      AND p.paid_at < ${priorTo.toISOString()}::timestamptz
  `);
  const priorGross = Number(
    ((prior as unknown as Array<{ gross: string | null }>)[0] ?? { gross: '0' }).gross ?? 0,
  );
  const momGrowthPct = priorGross > 0 ? ((gross - priorGross) / priorGross) * 100 : 0;

  return {
    grossMinor: toMinor(gross),
    platformFeeMinor: toMinor(fees),
    refundsMinor: toMinor(refunds),
    netMinor: toMinor(net),
    bookingCount: bookings,
    avgBasketMinor: bookings > 0 ? Math.round(toMinor(gross) / bookings) : 0,
    currency: row.currency,
    momGrowthPct,
  };
}

export async function getWeeklyBuckets(
  tx: typeof Db,
  args: { clubId: string; weeks: number },
): Promise<WeeklyBucket[]> {
  const since = new Date(Date.now() - args.weeks * 7 * 24 * 60 * 60 * 1000);
  const rows = await tx.execute<{ week_start: string; gross: string }>(sql`
    SELECT
      to_char(date_trunc('week', p.paid_at), 'YYYY-MM-DD') AS week_start,
      COALESCE(SUM(p.amount), 0)::text AS gross
    FROM ${PAYMENTS_FROM_CLUB_BOOKINGS_SQL}
    WHERE c.club_id = ${args.clubId}::uuid
      AND p.status = 'succeeded'
      AND p.paid_at >= ${since.toISOString()}::timestamptz
    GROUP BY 1
    ORDER BY 1 ASC
  `);
  return (rows as unknown as Array<{ week_start: string; gross: string }>).map((r) => ({
    weekStart: r.week_start,
    grossMinor: toMinor(Number(r.gross ?? 0)),
  }));
}

export async function getRecentPayments(
  tx: typeof Db,
  args: { clubId: string; limit: number },
): Promise<RecentPayment[]> {
  const rows = await tx.execute<{
    id: string;
    paid_at: string | null;
    payer_name: string | null;
    court_name: string | null;
    amount: string;
    currency: string;
    status: string;
    refunded_amount: string;
  }>(sql`
    SELECT p.id,
           p.paid_at,
           u.display_name AS payer_name,
           c.name AS court_name,
           p.amount::text,
           p.currency,
           p.status::text AS status,
           p.refunded_amount::text
    FROM ${PAYMENTS_FROM_CLUB_BOOKINGS_SQL}
    JOIN users u ON u.id = p.payer_user_id
    WHERE c.club_id = ${args.clubId}::uuid
    ORDER BY p.created_at DESC
    LIMIT ${args.limit}
  `);
  return (rows as unknown as Array<{
    id: string;
    paid_at: string | null;
    payer_name: string | null;
    court_name: string | null;
    amount: string;
    currency: string;
    status: string;
    refunded_amount: string;
  }>).map((r) => ({
    id: r.id,
    paidAt: r.paid_at,
    payerName: r.payer_name,
    courtName: r.court_name,
    amount: Number(r.amount),
    currency: r.currency,
    status: r.status,
    refundedAmount: Number(r.refunded_amount ?? 0),
  }));
}

/**
 * Format a minor-units integer as a display string like "PKR 12,500.00".
 */
export function formatMinor(minor: number, currency: string | null): string {
  if (!currency) return (minor / 100).toFixed(2);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}
