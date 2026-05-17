import { sql as drizzleSql } from 'drizzle-orm';
import {
  ExpoPushChannel,
  NotificationRouter,
  OneSignalWebChannel,
  ResendEmailChannel,
  TwilioSmsChannel,
  TwilioWhatsappChannel,
  templateRegistry,
  type NotificationChannel,
  type NotificationChannelName,
  type NotificationRequest,
  type NotificationResult,
  type NotificationTemplateName,
  type NotificationUrgency,
} from '@feera/notifications';
import type { CountryCode, Locale, Uuid } from '@feera/types';
import { db } from '../lib/db.js';
import type { Job, JobContext, JobResult } from '../types.js';

/**
 * Worker outbox row shape used by this job. Mirrors `notifications_outbox`.
 */
export interface OutboxRow {
  id: string;
  recipientUserId: string;
  template: NotificationTemplateName;
  variables: Record<string, string | number>;
  urgency: NotificationUrgency;
  retries: number;
  channelsAttempted: NotificationChannelName[];
}

export interface RecipientProfile {
  userId: string;
  locale: Locale;
  countryCode: CountryCode;
  phoneE164: string | null;
  email: string | null;
  expoPushToken: string | null;
  optIns: Partial<Record<NotificationChannelName, boolean>>;
}

export interface NotificationFanoutDb {
  /**
   * Atomically claim up to `limit` rows: marks `state='sending'` and returns
   * the rows that were claimed. Implementations must use a single UPDATE
   * with WHERE state='queued' AND (scheduled_for IS NULL OR scheduled_for <= now())
   * so concurrent workers can't double-claim.
   */
  claimBatch(limit: number, now: Date): Promise<OutboxRow[]>;
  loadRecipient(userId: string): Promise<RecipientProfile | null>;
  markDelivered(
    rowId: string,
    channelsAttempted: NotificationChannelName[],
    now: Date,
  ): Promise<void>;
  markSkipped(rowId: string, reason: string, now: Date): Promise<void>;
  rescheduleAfterFailure(
    rowId: string,
    retries: number,
    lastError: string,
    nextScheduledFor: Date,
  ): Promise<void>;
  markPermanentFailure(
    rowId: string,
    lastError: string,
    channelsAttempted: NotificationChannelName[],
    now: Date,
  ): Promise<void>;
}

const MAX_RETRIES = 3;
const BATCH_SIZE = 100;

function backoffDelayMs(retries: number): number {
  // Exponential: 2^retries minutes.
  return Math.pow(2, retries) * 60_000;
}

function buildRouter(): NotificationRouter {
  const channels = new Map<NotificationChannelName, NotificationChannel>([
    ['expo_push', new ExpoPushChannel()],
    ['twilio_sms', new TwilioSmsChannel()],
    ['twilio_whatsapp', new TwilioWhatsappChannel()],
    ['resend_email', new ResendEmailChannel()],
    ['onesignal_web', new OneSignalWebChannel()],
  ]);
  return new NotificationRouter({ channels });
}

/**
 * Default opt-ins per region, used until per-user notification prefs land.
 *   PK -> WhatsApp + SMS default on.
 *   else -> Push + Email default on.
 * Marketing is never on by default.
 */
function defaultOptIns(
  country: string,
  existing: Partial<Record<NotificationChannelName, boolean>>,
): Partial<Record<NotificationChannelName, boolean>> {
  const merged: Partial<Record<NotificationChannelName, boolean>> = { ...existing };
  if (country === 'PK') {
    if (merged.twilio_whatsapp === undefined) merged.twilio_whatsapp = true;
    if (merged.twilio_sms === undefined) merged.twilio_sms = true;
  } else {
    if (merged.expo_push === undefined) merged.expo_push = true;
    if (merged.resend_email === undefined) merged.resend_email = true;
  }
  return merged;
}

export interface FanoutMetrics {
  drained: number;
  delivered: number;
  skipped: number;
  retried: number;
  failedPermanent: number;
}

export async function runFanout(
  handle: NotificationFanoutDb,
  ctx: JobContext,
  now: Date = new Date(),
  router: NotificationRouter = buildRouter(),
): Promise<FanoutMetrics> {
  const metrics: FanoutMetrics = {
    drained: 0,
    delivered: 0,
    skipped: 0,
    retried: 0,
    failedPermanent: 0,
  };

  // The fanout job is a real-money critical path (refund/booking notifications)
  // and must drain in production scheduler ticks too. Respect dryRun only when
  // the caller explicitly opts in via the `--dry-run` argv flag.
  const explicitDryRun = ctx.argv.includes('--dry-run');
  if (explicitDryRun) {
    ctx.log.info('notification-fanout: dry run, not draining outbox');
    return metrics;
  }

  const claimed = await handle.claimBatch(BATCH_SIZE, now);
  metrics.drained = claimed.length;
  ctx.log.info('notification-fanout: claimed', { count: claimed.length });

  for (const row of claimed) {
    try {
      const profile = await handle.loadRecipient(row.recipientUserId);
      if (!profile) {
        await handle.markSkipped(row.id, 'recipient_not_found', now);
        metrics.skipped += 1;
        continue;
      }

      const template = templateRegistry[row.template];
      if (!template) {
        await handle.markSkipped(row.id, `unknown_template:${row.template}`, now);
        metrics.skipped += 1;
        continue;
      }

      const optIns = defaultOptIns(profile.countryCode, profile.optIns);

      const request: NotificationRequest = {
        recipient: {
          userId: profile.userId as Uuid,
          locale: profile.locale,
          countryCode: profile.countryCode,
          phoneE164: profile.phoneE164 ?? undefined,
          email: profile.email ?? undefined,
          expoPushToken: profile.expoPushToken ?? undefined,
          optIns,
        },
        template: row.template,
        variables: row.variables,
        urgency: row.urgency,
        idempotencyKey: row.id,
      };

      const rendered = template.render(profile.locale, row.variables as Record<string, string | number>);
      const chain = router.pickChannelChain(request);

      if (chain.length === 0) {
        await handle.markSkipped(row.id, 'no_eligible_channel', now);
        metrics.skipped += 1;
        continue;
      }

      const attempted: NotificationChannelName[] = [...row.channelsAttempted];
      let lastResult: NotificationResult | null = null;
      let delivered = false;

      for (const channel of chain) {
        try {
          const result = await channel.send(request, rendered);
          lastResult = result;
          if (!attempted.includes(channel.name)) attempted.push(channel.name);
          if (result.status === 'sent' || result.status === 'delivered' || result.status === 'queued') {
            delivered = true;
            break;
          }
          // failed or skipped: try the next channel in the chain.
        } catch (err) {
          lastResult = {
            channel: channel.name,
            status: 'failed',
            reason: err instanceof Error ? err.message : 'channel_threw',
          };
        }
      }

      if (delivered) {
        await handle.markDelivered(row.id, attempted, now);
        metrics.delivered += 1;
      } else {
        const nextRetries = row.retries + 1;
        const reason = lastResult?.reason ?? 'no_channel_delivered';
        if (nextRetries >= MAX_RETRIES) {
          await handle.markPermanentFailure(row.id, reason, attempted, now);
          metrics.failedPermanent += 1;
        } else {
          const next = new Date(now.getTime() + backoffDelayMs(nextRetries));
          await handle.rescheduleAfterFailure(row.id, nextRetries, reason, next);
          metrics.retried += 1;
        }
      }
    } catch (err) {
      ctx.log.error('notification-fanout: row crashed', err, { rowId: row.id });
      const nextRetries = row.retries + 1;
      const message = err instanceof Error ? err.message : 'unknown_error';
      if (nextRetries >= MAX_RETRIES) {
        await handle.markPermanentFailure(row.id, message, row.channelsAttempted, now);
        metrics.failedPermanent += 1;
      } else {
        const next = new Date(now.getTime() + backoffDelayMs(nextRetries));
        await handle.rescheduleAfterFailure(row.id, nextRetries, message, next);
        metrics.retried += 1;
      }
    }
  }

  return metrics;
}

/**
 * Live drizzle-backed implementation. Uses raw SQL for the atomic claim so we
 * can issue a single UPDATE ... RETURNING with the WHERE-state guard, which
 * is the canonical safe pattern for outbox claiming.
 */
function liveDb(): NotificationFanoutDb {
  return {
    async claimBatch(limit, now) {
      const rows = await db.execute<{
        id: string;
        recipient_user_id: string;
        template: string;
        variables: Record<string, string | number> | null;
        urgency: string;
        retries: number;
        channels_attempted: NotificationChannelName[] | null;
      }>(drizzleSql`
        UPDATE notifications_outbox
        SET state = 'sending', updated_at = ${now}
        WHERE id IN (
          SELECT id FROM notifications_outbox
          WHERE state = 'queued'
            AND (scheduled_for IS NULL OR scheduled_for <= ${now})
          ORDER BY
            CASE urgency
              WHEN 'high' THEN 0
              WHEN 'medium' THEN 1
              WHEN 'low' THEN 2
              WHEN 'marketing' THEN 3
            END ASC,
            created_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, recipient_user_id, template, variables, urgency, retries, channels_attempted
      `);
      const list = rows as unknown as Array<{
        id: string;
        recipient_user_id: string;
        template: string;
        variables: Record<string, string | number> | null;
        urgency: string;
        retries: number;
        channels_attempted: NotificationChannelName[] | null;
      }>;
      return list.map((r) => ({
        id: r.id,
        recipientUserId: r.recipient_user_id,
        template: r.template as NotificationTemplateName,
        variables: r.variables ?? {},
        urgency: r.urgency as NotificationUrgency,
        retries: r.retries,
        channelsAttempted: r.channels_attempted ?? [],
      }));
    },
    async loadRecipient(userId) {
      const rows = await db.execute<{
        id: string;
        locale: Locale;
        country_code: string;
        phone: string | null;
        email: string | null;
        expo_push_token: string | null;
      }>(drizzleSql`
        SELECT u.id, u.locale, u.country_code, u.phone, u.email,
               (SELECT token FROM push_tokens p
                  WHERE p.user_id = u.id AND p.platform = 'expo'
                  ORDER BY p.last_seen_at DESC NULLS LAST, p.created_at DESC
                  LIMIT 1) AS expo_push_token
        FROM users u
        WHERE u.id = ${userId} AND u.deleted_at IS NULL
        LIMIT 1
      `);
      const list = rows as unknown as Array<{
        id: string;
        locale: Locale;
        country_code: string;
        phone: string | null;
        email: string | null;
        expo_push_token: string | null;
      }>;
      const r = list[0];
      if (!r) return null;
      return {
        userId: r.id,
        locale: r.locale,
        countryCode: r.country_code as unknown as CountryCode,
        phoneE164: r.phone,
        email: r.email,
        expoPushToken: r.expo_push_token,
        optIns: {},
      };
    },
    async markDelivered(rowId, channels, now) {
      await db.execute(drizzleSql`
        UPDATE notifications_outbox
        SET state = 'delivered',
            sent_at = ${now},
            updated_at = ${now},
            channels_attempted = ${JSON.stringify(channels)}::jsonb
        WHERE id = ${rowId}
      `);
    },
    async markSkipped(rowId, reason, now) {
      await db.execute(drizzleSql`
        UPDATE notifications_outbox
        SET state = 'skipped', last_error = ${reason}, updated_at = ${now}
        WHERE id = ${rowId}
      `);
    },
    async rescheduleAfterFailure(rowId, retries, lastError, nextScheduledFor) {
      await db.execute(drizzleSql`
        UPDATE notifications_outbox
        SET state = 'queued',
            retries = ${retries},
            last_error = ${lastError},
            scheduled_for = ${nextScheduledFor},
            updated_at = now()
        WHERE id = ${rowId}
      `);
    },
    async markPermanentFailure(rowId, lastError, channels, now) {
      await db.execute(drizzleSql`
        UPDATE notifications_outbox
        SET state = 'failed',
            last_error = ${lastError},
            updated_at = ${now},
            channels_attempted = ${JSON.stringify(channels)}::jsonb
        WHERE id = ${rowId}
      `);
    },
  };
}

export const notificationFanout: Job = {
  name: 'notification-fanout',
  // Every 30 seconds: outbox stays drained well within p95 latency budget.
  schedule: '*/30 * * * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    try {
      const metrics = await runFanout(liveDb(), ctx);
      return {
        status: metrics.failedPermanent === 0 ? 'success' : 'partial',
        metrics: { ...metrics },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      ctx.log.error('notification-fanout crashed', err);
      return {
        status: 'failed',
        metrics: { drained: 0 },
        durationMs: Date.now() - start,
      };
    }
  },
};
