import { sql } from 'drizzle-orm';
import type { db as Db } from '@feera/db';

/**
 * Returns true if the proposed [startAt, endAt) window overlaps any
 * existing pending or confirmed booking on the same court. Optional
 * `excludeBookingId` for the PATCH-time path so we don't false-positive
 * against the very row being updated.
 */
export async function hasCourtConflict(
  tx: typeof Db,
  args: {
    courtId: string;
    startAt: Date;
    endAt: Date;
    excludeBookingId?: string;
  },
): Promise<boolean> {
  const startIso = args.startAt.toISOString();
  const endIso = args.endAt.toISOString();
  const exclude = args.excludeBookingId ?? null;

  const rows = await tx.execute<{ hit: number }>(
    sql`
      SELECT 1 AS hit FROM bookings
      WHERE court_id = ${args.courtId}
        AND status IN ('pending', 'confirmed')
        AND start_at < ${endIso}::timestamptz
        AND end_at > ${startIso}::timestamptz
        AND (${exclude}::uuid IS NULL OR id <> ${exclude}::uuid)
      LIMIT 1
    `,
  );
  if ((rows as unknown as { length: number }).length > 0) return true;

  // Also reject if the window overlaps any maintenance / closure row.
  const closureRows = await tx.execute<{ hit: number }>(
    sql`
      SELECT 1 AS hit FROM court_closures
      WHERE court_id = ${args.courtId}
        AND start_at < ${endIso}::timestamptz
        AND end_at > ${startIso}::timestamptz
      LIMIT 1
    `,
  );
  return (closureRows as unknown as { length: number }).length > 0;
}

/**
 * Pure helper for tests: window overlap predicate. Two half-open intervals
 * [aStart, aEnd) and [bStart, bEnd) overlap iff aStart < bEnd AND aEnd > bStart.
 */
export function windowsOverlap(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date },
): boolean {
  return a.startAt.getTime() < b.endAt.getTime() && a.endAt.getTime() > b.startAt.getTime();
}
