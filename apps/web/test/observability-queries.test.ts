import { describe, expect, it } from 'vitest';
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
} from '../src/lib/observability/queries';

describe('observability sql builders', () => {
  it('db ping is parameter-free', () => {
    expect(DB_PING_SQL.toLowerCase()).toContain('select 1');
  });

  it('targets the right system views', () => {
    expect(DB_ACTIVE_CONNECTIONS_SQL).toContain('pg_stat_activity');
    expect(DB_SIZE_SQL).toContain('pg_database_size');
  });

  it('outbox bucket query groups by state', () => {
    expect(OUTBOX_BUCKETS_SQL).toMatch(/group by state/i);
  });

  it('stuck and scheduled queries reference the right state filters', () => {
    expect(STUCK_CLAIMS_SQL).toContain("'sending'");
    expect(STUCK_CLAIMS_SQL).toContain('5 minutes');
    expect(FUTURE_SCHEDULED_SQL).toContain("'queued'");
    expect(FUTURE_SCHEDULED_SQL).toContain('scheduled_for');
  });

  it('latest heartbeats uses distinct on per job', () => {
    expect(LATEST_HEARTBEATS_SQL.toLowerCase()).toContain('distinct on (job_name)');
  });

  it('active sessions filters to live ones', () => {
    expect(ACTIVE_SESSIONS_SQL).toContain('expires_at > now()');
  });
});

describe('formatters', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(-1)).toBe('—');
  });

  it('formats uptime', () => {
    expect(formatUptime(5)).toBe('5s');
    expect(formatUptime(65)).toBe('1m 5s');
    expect(formatUptime(3725)).toBe('1h 2m 5s');
  });

  it('masks emails', () => {
    expect(maskEmail('meerfeerasta@gmail.com')).toBe('meer********@gmail.com');
    expect(maskEmail('a@b.com')).toBe('a*@b.com');
    expect(maskEmail(null)).toBe('—');
  });

  it('groups nginx error lines', () => {
    const lines = [
      '2026/05/17 14:32:55 [error] 12#12: *3 open() failed for /foo',
      '2026/05/17 14:33:01 [error] 12#12: *4 open() failed for /foo',
      '2026/05/17 14:34:00 [error] 12#12: *5 connection reset by peer',
    ];
    const groups = groupNginxErrors(lines);
    expect(groups[0].count).toBe(2);
    expect(groups[0].message).toContain('open() failed');
  });
});
