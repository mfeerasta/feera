/**
 * Pure SQL-string builders for the admin Observability dashboard. Kept in a
 * dedicated module so they can be unit-tested without a live database, and so
 * the page component stays a thin orchestrator.
 *
 * All queries are read-only and target system / metadata tables. Anything that
 * touches user data flows through the regular RLS-aware request context.
 */

export interface OutboxBucket {
  state: string;
  count: number;
}

export interface WorkerHeartbeatRow {
  jobName: string;
  tickedAt: string;
  durationMs: number;
  status: string;
}

/** `SELECT 1` round-trip used to derive DB latency. */
export const DB_PING_SQL = 'select 1 as ok';

/** Active backend count from pg_stat_activity. */
export const DB_ACTIVE_CONNECTIONS_SQL =
  "select count(*)::int as active from pg_stat_activity where state = 'active'";

/** Total on-disk database size in bytes. */
export const DB_SIZE_SQL = 'select pg_database_size(current_database())::bigint as bytes';

/** Outbox grouped by state. */
export const OUTBOX_BUCKETS_SQL =
  'select state::text as state, count(*)::int as count from notifications_outbox group by state order by state';

/** Active session count (better-auth). */
export const ACTIVE_SESSIONS_SQL =
  'select count(*)::int as active from auth_session where expires_at > now()';

/** Bookings with empty completion is unrelated; included here for completeness:
 *  stuck outbox claims = state='sending' for longer than 5 minutes. */
export const STUCK_CLAIMS_SQL =
  "select count(*)::int as stuck from notifications_outbox where state = 'sending' and updated_at < now() - interval '5 minutes'";

/** Future-scheduled outbox rows. */
export const FUTURE_SCHEDULED_SQL =
  "select count(*)::int as scheduled from notifications_outbox where state = 'queued' and scheduled_for is not null and scheduled_for > now()";

/** Latest heartbeat per job. */
export const LATEST_HEARTBEATS_SQL = `
  select distinct on (job_name)
    job_name      as "jobName",
    ticked_at     as "tickedAt",
    duration_ms   as "durationMs",
    status        as status
  from worker_heartbeats
  order by job_name, ticked_at desc
`;

/** Format bytes as a human string. Pure, exported for testability. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format seconds as Hh Mm Ss. */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

/** Mask an email like `meer***@gmail.com`. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, Math.min(4, local.length));
  return `${head}${'*'.repeat(Math.max(1, local.length - head.length))}${domain}`;
}

/** Group nginx error log lines by message (everything after the timestamp / level). */
export function groupNginxErrors(lines: readonly string[]): { message: string; count: number }[] {
  const map = new Map<string, number>();
  for (const raw of lines) {
    if (!raw.trim()) continue;
    // Nginx error line: `2026/05/17 14:32:55 [error] 12#12: *3 ...`
    const stripped = raw
      .replace(/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+/, '')
      .replace(/^\[[a-z]+\]\s+\d+#\d+:\s+\*?\d*\s*/, '')
      .trim();
    const key = stripped.slice(0, 200);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);
}
