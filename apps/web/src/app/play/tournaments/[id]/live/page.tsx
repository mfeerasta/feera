import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

/**
 * Big-screen live scoring view. Server Component, refreshes every 15s via
 * `<meta http-equiv="refresh">` so the club TV stays current without JS.
 * Cache no-store to always pull live data.
 */

interface Standing {
  participantId: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  teamName: string | null;
}

interface Upcoming {
  id: string;
  roundNumber: number;
  bracketPosition: { segment: string; slot: number; label?: string };
  teamA: [string, string];
  teamB: [string, string];
}

interface LiveData {
  tournament: { id: string; name: string; format: string; status: string };
  standings: Standing[];
  upcoming: Upcoming[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export default async function LiveTournamentPage({ params }: PageProps) {
  const { id } = await params;
  const base = await origin();
  const res = await fetch(`${base}/api/v1/tournaments/${id}`, { cache: 'no-store' });
  if (!res.ok) notFound();
  const { data } = (await res.json()) as { data: LiveData };
  const top = data.standings.slice(0, 6);
  const current = data.upcoming.slice(0, 2);
  const next = data.upcoming.slice(2, 6);

  return (
    <>
      <meta httpEquiv="refresh" content="15" />
      <section className="min-h-screen bg-ink-deep px-12 py-12 text-cream">
        <header className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-cream/50">Live</p>
            <h1 className="mt-3 font-serif text-7xl tracking-tight">{data.tournament.name}</h1>
            <p className="mt-3 text-sm uppercase tracking-[0.3em] text-cream/50">
              {data.tournament.format.replace(/_/g, ' ')}
            </p>
          </div>
          <p className="text-sm text-cream/40">Updated {new Date().toLocaleTimeString()}</p>
        </header>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-6 text-xs uppercase tracking-[0.3em] text-cream/50">On court</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {current.length === 0 ? (
                <p className="border border-cream/20 px-6 py-16 text-center text-sm text-cream/50">
                  No matches in play.
                </p>
              ) : (
                current.map((m) => (
                  <div key={m.id} className="border border-cream/20 p-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-cream/40">
                      {m.bracketPosition.label ?? `Round ${m.roundNumber}`}
                    </p>
                    <p className="mt-6 font-serif text-4xl">{m.teamA[0].slice(0, 8)}</p>
                    <p className="my-3 text-xs uppercase tracking-[0.3em] text-cream/40">vs</p>
                    <p className="font-serif text-4xl">{m.teamB[0].slice(0, 8)}</p>
                  </div>
                ))
              )}
            </div>

            <h2 className="mt-12 mb-6 text-xs uppercase tracking-[0.3em] text-cream/50">Up next</h2>
            <ul className="space-y-3">
              {next.map((m) => (
                <li key={m.id} className="flex justify-between border-b border-cream/15 py-3 text-lg">
                  <span>{m.teamA[0].slice(0, 8)} vs {m.teamB[0].slice(0, 8)}</span>
                  <span className="text-cream/40">{m.bracketPosition.label ?? `R${m.roundNumber}`}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-6 text-xs uppercase tracking-[0.3em] text-cream/50">Standings</h2>
            <ol className="space-y-3">
              {top.map((s) => (
                <li
                  key={s.participantId}
                  className="flex items-baseline justify-between border-b border-cream/15 py-3"
                >
                  <span className="text-cream/40">{s.rank}</span>
                  <span className="flex-1 ms-4 font-serif text-2xl">
                    {s.teamName ?? s.participantId.slice(0, 8)}
                  </span>
                  <span className="font-serif text-3xl">{s.points}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
