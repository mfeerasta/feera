import { promises as fs } from 'node:fs';
import type { ReactNode } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@feera/db';
import { getSession } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import {
  ACTIVE_SESSIONS_SQL,
  DB_ACTIVE_CONNECTIONS_SQL,
  DB_PING_SQL,
  DB_SIZE_SQL,
  FUTURE_SCHEDULED_SQL,
  LATEST_HEARTBEATS_SQL,
  OUTBOX_BUCKETS_SQL,
  STUCK_CLAIMS_SQL,
  formatBytes,
  formatUptime,
  groupNginxErrors,
  maskEmail,
  type OutboxBucket,
  type WorkerHeartbeatRow,
} from '@/lib/observability/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Server-side cache window for the heavier DB queries. The page itself stays
// dynamic so each admin request gets a fresh snapshot; per-query helpers cache
// via `next: { revalidate }` would not apply to direct drizzle calls, so we
// memoise inside the request via module-level promises with a TTL.

interface CacheEntry<T> { value: T; expires: number }
const cache = new Map<string, CacheEntry<unknown>>();
async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  cache.set(key, { value, expires: now + ttlMs });
  return value;
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

interface DbHealth {
  latencyMs: number | null;
  activeConnections: number | null;
  sizeBytes: number | null;
}

async function loadDbHealth(): Promise<DbHealth> {
  return memo('db-health', 30_000, async () => {
    const start = Date.now();
    const latencyMs = await safeQuery(async () => {
      await db.execute(sql.raw(DB_PING_SQL));
      return Date.now() - start;
    }, null as number | null);

    const activeConnections = await safeQuery(async () => {
      const rows = (await db.execute(sql.raw(DB_ACTIVE_CONNECTIONS_SQL))) as unknown as Array<{ active: number }>;
      return rows[0]?.active ?? null;
    }, null);

    const sizeBytes = await safeQuery(async () => {
      const rows = (await db.execute(sql.raw(DB_SIZE_SQL))) as unknown as Array<{ bytes: number | string }>;
      const v = rows[0]?.bytes;
      return typeof v === 'string' ? Number.parseInt(v, 10) : (v ?? null);
    }, null);

    return { latencyMs, activeConnections, sizeBytes };
  });
}

async function loadOutboxBuckets(): Promise<OutboxBucket[]> {
  return memo('outbox-buckets', 30_000, async () => {
    return safeQuery(async () => {
      const rows = (await db.execute(sql.raw(OUTBOX_BUCKETS_SQL))) as unknown as OutboxBucket[];
      return rows ?? [];
    }, [] as OutboxBucket[]);
  });
}

async function loadStuckAndScheduled(): Promise<{ stuck: number; scheduled: number }> {
  return memo('stuck-scheduled', 30_000, async () => {
    const stuck = await safeQuery(async () => {
      const r = (await db.execute(sql.raw(STUCK_CLAIMS_SQL))) as unknown as Array<{ stuck: number }>;
      return r[0]?.stuck ?? 0;
    }, 0);
    const scheduled = await safeQuery(async () => {
      const r = (await db.execute(sql.raw(FUTURE_SCHEDULED_SQL))) as unknown as Array<{ scheduled: number }>;
      return r[0]?.scheduled ?? 0;
    }, 0);
    return { stuck, scheduled };
  });
}

async function loadHeartbeats(): Promise<WorkerHeartbeatRow[]> {
  return memo('heartbeats', 30_000, async () => {
    return safeQuery(async () => {
      const rows = (await db.execute(sql.raw(LATEST_HEARTBEATS_SQL))) as unknown as WorkerHeartbeatRow[];
      return rows ?? [];
    }, [] as WorkerHeartbeatRow[]);
  });
}

interface SessionsSnapshot {
  active: number | null;
  recent: { email: string | null; createdAt: string | null }[];
}

async function loadSessions(): Promise<SessionsSnapshot> {
  return memo('sessions', 30_000, async () => {
    const active = await safeQuery(async () => {
      const r = (await db.execute(sql.raw(ACTIVE_SESSIONS_SQL))) as unknown as Array<{ active: number }>;
      return r[0]?.active ?? null;
    }, null);
    const recent = await safeQuery(async () => {
      const r = (await db.execute(
        sql.raw(
          'select u.email as email, s.created_at as "createdAt" from auth_session s join auth_user u on u.id = s.user_id order by s.created_at desc limit 5',
        ),
      )) as unknown as Array<{ email: string | null; createdAt: string | null }>;
      return r ?? [];
    }, [] as { email: string | null; createdAt: string | null }[]);
    return { active, recent };
  });
}

async function loadNginxErrors(): Promise<{ available: boolean; groups: { message: string; count: number }[] }> {
  const path = '/var/log/nginx/feera-web.error.log';
  try {
    const stat = await fs.stat(path);
    if (!stat.isFile()) return { available: false, groups: [] };
    const buf = await fs.readFile(path, 'utf8');
    const lines = buf.split('\n').slice(-50);
    return { available: true, groups: groupNginxErrors(lines).slice(0, 10) };
  } catch {
    return { available: false, groups: [] };
  }
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border border-[color:var(--color-border)] p-5">
      <h2 className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{label}</span>
      <span className="feera-motion font-mono text-base">{value}</span>
    </div>
  );
}

export default async function ObservabilityPage() {
  const session = await getSession();
  const t = await getT();

  if (!session || session.role !== 'platform_admin') {
    return (
      <main className="px-2 py-10">
        <h1 className="font-serif text-2xl">{t('errors.forbidden')}</h1>
      </main>
    );
  }

  const [dbHealth, outbox, stuckScheduled, heartbeats, sessions, errors] = await Promise.all([
    loadDbHealth(),
    loadOutboxBuckets(),
    loadStuckAndScheduled(),
    loadHeartbeats(),
    loadSessions(),
    loadNginxErrors(),
  ]);

  const mem = process.memoryUsage();
  const outboxTotal = outbox.reduce((acc, b) => acc + Number(b.count ?? 0), 0);

  return (
    <main>
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          {t('admin.title')}
        </p>
        <h1 className="feera-motion mt-2 font-serif text-3xl tracking-tight">
          {t('observability.title')}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          {t('observability.subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card title={t('observability.cardWeb')}>
          <Stat label={t('observability.uptime')} value={formatUptime(process.uptime())} />
          <Stat label={t('observability.memory')} value={formatBytes(mem.rss)} />
          <Stat label="Node" value={process.version} />
        </Card>

        <Card title={t('observability.cardDb')}>
          <Stat
            label={t('observability.latency')}
            value={dbHealth.latencyMs == null ? '—' : `${dbHealth.latencyMs} ms`}
          />
          <Stat
            label={t('observability.activeConnections')}
            value={dbHealth.activeConnections ?? '—'}
          />
          <Stat
            label={t('observability.dbSize')}
            value={dbHealth.sizeBytes == null ? '—' : formatBytes(dbHealth.sizeBytes)}
          />
        </Card>

        <Card title={t('observability.cardOutbox')}>
          {outbox.length === 0 ? (
            <p className="text-[color:var(--color-fg-muted)]">{t('observability.noData')}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {outbox.map((b) => {
                const pct = outboxTotal ? Math.round((Number(b.count) / outboxTotal) * 100) : 0;
                return (
                  <div key={b.state}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">{b.state}</span>
                      <span className="font-mono">{b.count}</span>
                    </div>
                    <div className="mt-1 h-1 bg-[color:var(--color-border)]">
                      <div
                        className="h-1 bg-[color:var(--color-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title={t('observability.cardSessions')}>
          <Stat label={t('observability.cardSessions')} value={sessions.active ?? '—'} />
          <ul className="mt-3 flex flex-col gap-1.5 text-xs">
            {sessions.recent.length === 0 ? (
              <li className="text-[color:var(--color-fg-muted)]">{t('observability.noData')}</li>
            ) : (
              sessions.recent.map((row, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono">{maskEmail(row.email)}</span>
                  <span className="text-[color:var(--color-fg-muted)]">
                    {row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 16).replace('T', ' ') : ''}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card title={t('observability.cardErrors')}>
          {errors.available ? (
            errors.groups.length === 0 ? (
              <p className="text-[color:var(--color-fg-muted)]">{t('observability.noData')}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-xs">
                {errors.groups.map((g) => (
                  <li key={g.message} className="flex items-baseline justify-between gap-3">
                    <span className="truncate">{g.message}</span>
                    <span className="font-mono text-[color:var(--color-fg-muted)]">×{g.count}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-[color:var(--color-fg-muted)]">{t('observability.logsUnavailable')}</p>
          )}
        </Card>

        <Card title={t('observability.cardWorkers')}>
          <Stat label={t('observability.stuckClaims')} value={stuckScheduled.stuck} />
          <Stat label={t('observability.scheduled')} value={stuckScheduled.scheduled} />
          <div className="mt-3">
            <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {t('observability.lastHeartbeat')}
            </p>
            {heartbeats.length === 0 ? (
              <p className="text-xs text-[color:var(--color-fg-muted)]">{t('observability.noData')}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-xs">
                {heartbeats.map((h) => (
                  <li key={h.jobName} className="flex items-baseline justify-between gap-3">
                    <span className="font-mono">{h.jobName}</span>
                    <span className="text-[color:var(--color-fg-muted)]">
                      {new Date(h.tickedAt).toISOString().slice(11, 19)} · {h.durationMs}ms · {h.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
