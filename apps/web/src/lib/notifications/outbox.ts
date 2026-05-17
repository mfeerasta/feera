/**
 * Notifications outbox helper.
 *
 * App-side services call enqueueNotification() instead of talking to the
 * @feera/notifications router directly. The services/workers
 * `notification-fanout` job drains the table, calls the router, and handles
 * retries with exponential backoff.
 *
 * Idempotency key is the unique guard: callers compose a stable string
 * (e.g. `booking_confirmed:{bookingId}:{userId}`) so a retry of the
 * triggering action never duplicates the send.
 */

import { sql } from 'drizzle-orm';
import { notificationsOutbox } from '@feera/db/schema';
import type { db as Db } from '@feera/db';
import { db as defaultDb } from '@feera/db';
import type { NotificationTemplateName, NotificationUrgency } from '@feera/notifications';

export interface EnqueueNotificationInput {
  recipientUserId: string;
  template: NotificationTemplateName;
  variables: Record<string, string | number>;
  urgency: NotificationUrgency;
  idempotencyKey: string;
  scheduledFor?: Date;
}

export interface EnqueueNotificationResult {
  id: string;
  queued: boolean;
}

export async function enqueueNotification(
  input: EnqueueNotificationInput,
  tx: typeof Db = defaultDb,
): Promise<EnqueueNotificationResult> {
  // ON CONFLICT DO NOTHING + RETURNING so we get the existing row's id when
  // the idempotency key collides. Single roundtrip.
  const [row] = await tx
    .insert(notificationsOutbox)
    .values({
      recipientUserId: input.recipientUserId,
      template: input.template as (typeof notificationsOutbox.$inferInsert)['template'],
      variables: input.variables as unknown as object,
      urgency: input.urgency as (typeof notificationsOutbox.$inferInsert)['urgency'],
      idempotencyKey: input.idempotencyKey,
      scheduledFor: input.scheduledFor,
    })
    .onConflictDoNothing({ target: notificationsOutbox.idempotencyKey })
    .returning({ id: notificationsOutbox.id });

  if (row) return { id: row.id, queued: true };

  // Collision: look up the existing row.
  const [existing] = await tx.execute<{ id: string }>(
    sql`SELECT id FROM notifications_outbox WHERE idempotency_key = ${input.idempotencyKey} LIMIT 1`,
  ) as unknown as Array<{ id: string }>;
  return { id: existing?.id ?? '', queued: false };
}

/**
 * Best-effort fire-and-forget wrapper. Logs and swallows errors so a
 * notification failure can never break the originating mutation.
 */
export async function enqueueNotificationSafe(
  input: EnqueueNotificationInput,
  tx: typeof Db = defaultDb,
): Promise<void> {
  try {
    await enqueueNotification(input, tx);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[notifications.outbox] enqueue failed', {
      template: input.template,
      idempotencyKey: input.idempotencyKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
