import { sql } from 'drizzle-orm';
import type { db as Db } from '@feera/db';

export interface MemberRow {
  userId: string;
  displayName: string | null;
  bookingCount: number;
  lastBookedAt: string | null;
  matchCount: number;
  lastPlayedAt: string | null;
  totalSpendMinor: number;
  currency: string | null;
  isVip: boolean;
  isBanned: boolean;
  notes: string | null;
}

/**
 * One row per distinct user who interacted with the club in the past
 * `daysBack` days. Sorted by recent activity.
 */
export async function listClubMembers(
  tx: typeof Db,
  args: { clubId: string; daysBack: number; limit: number },
): Promise<MemberRow[]> {
  const since = new Date(Date.now() - args.daysBack * 24 * 60 * 60 * 1000);
  const rows = await tx.execute<{
    user_id: string;
    display_name: string | null;
    booking_count: string;
    last_booked_at: string | null;
    match_count: string;
    last_played_at: string | null;
    total_spend: string;
    currency: string | null;
    is_vip: boolean | null;
    is_banned: boolean | null;
    notes: string | null;
  }>(sql`
    WITH bk AS (
      SELECT b.organizer_user_id AS user_id,
             COUNT(*)::text AS booking_count,
             MAX(b.start_at) AS last_booked_at
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      WHERE c.club_id = ${args.clubId}::uuid
        AND b.start_at >= ${since.toISOString()}::timestamptz
      GROUP BY 1
    ),
    pl AS (
      SELECT bp.user_id,
             COUNT(*)::text AS match_count,
             MAX(b.start_at) AS last_played_at
      FROM booking_participants bp
      JOIN bookings b ON b.id = bp.booking_id
      JOIN courts c ON c.id = b.court_id
      WHERE c.club_id = ${args.clubId}::uuid
        AND b.start_at >= ${since.toISOString()}::timestamptz
        AND bp.status = 'accepted'
      GROUP BY 1
    ),
    sp AS (
      SELECT p.payer_user_id AS user_id,
             COALESCE(SUM(p.amount), 0)::text AS total_spend,
             MAX(p.currency) AS currency
      FROM payments p
      JOIN bookings b ON b.id = p.context_id AND p.context_table = 'bookings'
      JOIN courts c ON c.id = b.court_id
      WHERE c.club_id = ${args.clubId}::uuid
        AND p.status = 'succeeded'
        AND p.paid_at >= ${since.toISOString()}::timestamptz
      GROUP BY 1
    ),
    ids AS (
      SELECT user_id FROM bk
      UNION
      SELECT user_id FROM pl
      UNION
      SELECT user_id FROM sp
    )
    SELECT ids.user_id,
           u.display_name,
           COALESCE(bk.booking_count, '0') AS booking_count,
           bk.last_booked_at,
           COALESCE(pl.match_count, '0') AS match_count,
           pl.last_played_at,
           COALESCE(sp.total_spend, '0') AS total_spend,
           sp.currency,
           n.is_vip,
           n.is_banned,
           n.notes
    FROM ids
    LEFT JOIN users u ON u.id = ids.user_id
    LEFT JOIN bk ON bk.user_id = ids.user_id
    LEFT JOIN pl ON pl.user_id = ids.user_id
    LEFT JOIN sp ON sp.user_id = ids.user_id
    LEFT JOIN club_member_notes n
      ON n.user_id = ids.user_id AND n.club_id = ${args.clubId}::uuid
    ORDER BY COALESCE(bk.last_booked_at, pl.last_played_at) DESC NULLS LAST
    LIMIT ${args.limit}
  `);

  return (rows as unknown as Array<{
    user_id: string;
    display_name: string | null;
    booking_count: string;
    last_booked_at: string | null;
    match_count: string;
    last_played_at: string | null;
    total_spend: string;
    currency: string | null;
    is_vip: boolean | null;
    is_banned: boolean | null;
    notes: string | null;
  }>).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    bookingCount: Number(r.booking_count ?? 0),
    lastBookedAt: r.last_booked_at,
    matchCount: Number(r.match_count ?? 0),
    lastPlayedAt: r.last_played_at,
    totalSpendMinor: Math.round(Number(r.total_spend ?? 0) * 100),
    currency: r.currency,
    isVip: Boolean(r.is_vip),
    isBanned: Boolean(r.is_banned),
    notes: r.notes,
  }));
}
