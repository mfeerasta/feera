import { describe, expect, it, vi } from 'vitest';
import { runPurge, type AccountPurgeDb, type DeletionRequestRow } from '../src/jobs/account-purge.js';
import type { JobContext } from '../src/types.js';

function silentLogger() {
  const noop = () => {};
  const self: any = {
    child: () => self,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  };
  return self;
}

function ctx(dryRun: boolean): JobContext {
  return { runId: 'test', log: silentLogger(), dryRun, argv: [] };
}

function fakeDb(rows: DeletionRequestRow[]): AccountPurgeDb & { purged: string[] } {
  const purged: string[] = [];
  return {
    purged,
    async selectDue() {
      return rows;
    },
    async purgeUser(req) {
      purged.push(req.userId);
    },
  };
}

describe('account-purge', () => {
  it('dry run never calls purgeUser', async () => {
    const db = fakeDb([
      { id: 'r1', userId: 'u1', willDeleteAt: new Date('2026-01-01') },
    ]);
    const spy = vi.spyOn(db, 'purgeUser');
    const res = await runPurge(db, ctx(true));
    expect(res).toEqual({ purged: 0, failed: 0 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('apply run purges every due request', async () => {
    const db = fakeDb([
      { id: 'r1', userId: 'u1', willDeleteAt: new Date('2026-01-01') },
      { id: 'r2', userId: 'u2', willDeleteAt: new Date('2026-01-02') },
    ]);
    const res = await runPurge(db, ctx(false));
    expect(res).toEqual({ purged: 2, failed: 0 });
    expect(db.purged).toEqual(['u1', 'u2']);
  });

  it('counts failures without aborting subsequent rows', async () => {
    const rows: DeletionRequestRow[] = [
      { id: 'r1', userId: 'u1', willDeleteAt: new Date('2026-01-01') },
      { id: 'r2', userId: 'u2', willDeleteAt: new Date('2026-01-02') },
    ];
    const db: AccountPurgeDb = {
      async selectDue() { return rows; },
      async purgeUser(req) {
        if (req.userId === 'u1') throw new Error('boom');
      },
    };
    const res = await runPurge(db, ctx(false));
    expect(res).toEqual({ purged: 1, failed: 1 });
  });
});
