import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

interface Standing {
  participantId: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  teamName: string | null;
}

interface Upcoming {
  id: string;
  roundNumber: number;
  bracketPosition: { segment: string; slot: number; label?: string };
  teamA: [string, string];
  teamB: [string, string];
}

interface TournamentDetail {
  tournament: {
    id: string;
    name: string;
    description: string | null;
    format: string;
    city: string | null;
    countryCode: string;
    startAt: string;
    endAt: string;
    entryFee: number;
    currency: string;
    status: string;
    registrationClosesAt: string | null;
    pplpEnabled: boolean;
  };
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

export default async function TournamentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const base = await origin();
  const res = await fetch(`${base}/api/v1/tournaments/${id}`, { cache: 'no-store' });
  if (!res.ok) notFound();
  const { data } = (await res.json()) as { data: TournamentDetail };
  const t = data.tournament;
  const open = t.status === 'open';

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            {t.format.replace(/_/g, ' ')} . {t.countryCode}
          </p>
          <h1 className="mt-3 font-serif text-5xl tracking-tight text-ink-deep">{t.name}</h1>
          <p className="mt-3 text-sm text-ink-deep/70">
            {t.city ?? 'Online'} . {new Date(t.startAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          {open ? (
            <Link
              href={`/play/tournaments/${t.id}/register`}
              className="border border-court bg-court px-6 py-3 text-sm text-cream hover:opacity-90"
            >
              Register
            </Link>
          ) : (
            <span className="border border-ink-deep/30 px-6 py-3 text-sm text-ink-deep/50">
              Registration closed
            </span>
          )}
          <Link
            href={`/play/tournaments/${t.id}/live`}
            className="border border-ink-deep px-6 py-3 text-sm text-ink-deep hover:bg-ink-deep hover:text-cream"
          >
            Live
          </Link>
        </div>
      </header>

      {t.description ? (
        <p className="mb-12 max-w-2xl text-sm leading-relaxed text-ink-deep/80">{t.description}</p>
      ) : null}

      {t.pplpEnabled ? (
        <p className="mb-8 inline-block border border-brass px-3 py-1 text-xs uppercase tracking-[0.2em] text-brass">
          PPLP franchise event
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <h2 className="mb-6 font-serif text-2xl tracking-tight">Standings</h2>
          {data.standings.length === 0 ? (
            <p className="border border-dashed border-ink-deep/20 px-4 py-12 text-center text-sm text-ink-deep/60">
              Standings appear once the tournament starts.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-deep/20 text-left text-xs uppercase tracking-[0.2em] text-ink-deep/60">
                  <th className="py-2">#</th>
                  <th className="py-2">Team</th>
                  <th className="py-2 text-end">W</th>
                  <th className="py-2 text-end">L</th>
                  <th className="py-2 text-end">Pts</th>
                </tr>
              </thead>
              <tbody>
                {data.standings.map((s) => (
                  <tr key={s.participantId} className="border-b border-ink-deep/10">
                    <td className="py-2 text-ink-deep/60">{s.rank}</td>
                    <td className="py-2 font-medium">{s.teamName ?? s.participantId.slice(0, 8)}</td>
                    <td className="py-2 text-end">{s.wins}</td>
                    <td className="py-2 text-end">{s.losses}</td>
                    <td className="py-2 text-end font-medium">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h2 className="mb-6 font-serif text-2xl tracking-tight">Up next</h2>
          {data.upcoming.length === 0 ? (
            <p className="border border-dashed border-ink-deep/20 px-4 py-12 text-center text-sm text-ink-deep/60">
              No upcoming matches.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.upcoming.map((m) => (
                <li key={m.id} className="border border-ink-deep/15 bg-paper p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-deep/50">
                    {m.bracketPosition.label ?? `Round ${m.roundNumber}`}
                  </p>
                  <p className="mt-2 font-mono text-sm">
                    {m.teamA[0].slice(0, 8)} vs {m.teamB[0].slice(0, 8)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
