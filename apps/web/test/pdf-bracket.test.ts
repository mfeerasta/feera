import { describe, expect, it, vi } from 'vitest';

/**
 * Exercises the bracket PDF route end-to-end with the DB client mocked. We
 * stub the drizzle handle so the route loads a deterministic completed
 * tournament with 8 confirmed registrations and a few completed matches.
 * The assertion is on the response shape: PDF content-type, non-zero body,
 * and the attachment filename header.
 */

const tournamentRow = {
  id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt',
  organizerUserId: 'oooooooo-oooo-4ooo-8ooo-oooooooooooo',
  clubId: null,
  name: 'Test Open',
  slug: 'test-open',
  description: null,
  format: 'single_elimination' as const,
  status: 'completed' as const,
  countryCode: 'PK',
  city: 'Lahore',
  startAt: new Date('2026-05-01T08:00:00Z'),
  endAt: new Date('2026-05-01T18:00:00Z'),
  registrationOpensAt: null,
  registrationClosesAt: null,
  maxTeams: 8,
  minLevel: null,
  maxLevel: null,
  genderPreference: 'open' as const,
  entryFee: 0,
  currency: 'PKR',
  prizePool: {},
  prizePoolCurrency: null,
  prizePoolDistribution: {},
  rulesUrl: null,
  isEditionOnly: false,
  isRanked: true,
  pplpEnabled: false,
  bracket: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const players = Array.from({ length: 8 }, (_, i) => ({
  id: `pppppppp-pppp-4ppp-8ppp-${String(i).padStart(12, '0')}`,
  displayName: `Player ${i + 1}`,
}));

const regs = Array.from({ length: 8 }, (_, i) => ({
  id: `rrrrrrrr-rrrr-4rrr-8rrr-${String(i).padStart(12, '0')}`,
  tournamentId: tournamentRow.id,
  userId: players[i]!.id,
  partnerUserId: null,
  teamName: null,
  seed: i + 1,
  status: 'confirmed' as const,
  paymentId: null,
  checkedInAt: null,
  registeredAt: new Date(),
  updatedAt: new Date(),
}));

const rounds = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tournamentId: tournamentRow.id, name: 'Quarter Finals', ordinal: 1, startsAt: null, endsAt: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tournamentId: tournamentRow.id, name: 'Semi Finals', ordinal: 2, startsAt: null, endsAt: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', tournamentId: tournamentRow.id, name: 'Final', ordinal: 3, startsAt: null, endsAt: null, createdAt: new Date(), updatedAt: new Date() },
];

const matches = [
  { id: 'm1', tournamentId: tournamentRow.id, roundId: rounds[0]!.id, courtId: null, scheduledAt: null, teamARegistrationId: regs[0]!.id, teamBRegistrationId: regs[7]!.id, teamASetsWon: 2, teamBSetsWon: 0, rawScore: [], status: 'completed' as const, matchId: null, nextMatchId: null, bracketPosition: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'm2', tournamentId: tournamentRow.id, roundId: rounds[0]!.id, courtId: null, scheduledAt: null, teamARegistrationId: regs[3]!.id, teamBRegistrationId: regs[4]!.id, teamASetsWon: 1, teamBSetsWon: 2, rawScore: [], status: 'completed' as const, matchId: null, nextMatchId: null, bracketPosition: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'm3', tournamentId: tournamentRow.id, roundId: rounds[2]!.id, courtId: null, scheduledAt: null, teamARegistrationId: regs[0]!.id, teamBRegistrationId: regs[4]!.id, teamASetsWon: 2, teamBSetsWon: 1, rawScore: [], status: 'completed' as const, matchId: null, nextMatchId: null, bracketPosition: null, createdAt: new Date(), updatedAt: new Date() },
];

// Tiny mock chain: db.select().from(X).where(...).limit?(...).
function makeQueryResolver(resultFor: (table: unknown) => unknown[]) {
  function chain(table: unknown): unknown {
    const promise = Promise.resolve(resultFor(table));
    return {
      where() {
        return {
          limit() {
            return promise;
          },
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
          finally: promise.finally.bind(promise),
        };
      },
      limit() {
        return promise;
      },
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
    };
  }
  return chain;
}

vi.mock('@feera/db/client', () => {
  const resolver = makeQueryResolver((table) => {
    const t = table as { _?: { name?: string } } & Record<string, unknown>;
    const name = (t._?.name as string) ?? (t as { name?: string }).name ?? String(table);
    // Drizzle pgTable exposes the table name via Symbol; we fall back to a
    // structural match by checking for unique columns.
    const has = (key: string): boolean =>
      typeof (t as Record<string, unknown>)[key] !== 'undefined';
    if (has('slug') && has('organizerUserId')) return [tournamentRow];
    if (has('teamARegistrationId')) return matches;
    if (has('ordinal') && has('tournamentId')) return rounds;
    if (has('teamName') && has('userId')) return regs;
    if (has('displayName')) return players;
    void name;
    return [];
  });
  return {
    db: {
      select(_cols?: unknown) {
        void _cols;
        return {
          from(table: unknown) {
            return resolver(table);
          },
        };
      },
    },
  };
});

vi.mock('@/lib/api/request-context', () => ({
  getSession: async () => null,
  withRequestContext: async (_s: unknown, fn: (tx: unknown) => Promise<unknown>) => fn({}),
}));

describe('bracket PDF route', () => {
  it('responds with a non-empty application/pdf body and attachment header', async () => {
    const mod = await import('@/app/api/v1/tournaments/[id]/bracket.pdf/route');
    const res = await mod.GET(new Request('http://test/x') as unknown as never, {
      params: Promise.resolve({ id: tournamentRow.id }),
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain(`feera-bracket-${tournamentRow.slug}.pdf`);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(500);
    // PDF files start with %PDF.
    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });
});
