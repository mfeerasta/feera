import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface TournamentSummary {
  tournament: {
    id: string;
    name: string;
    entryFee: number;
    currency: string;
    pplpEnabled: boolean;
    status: string;
    format: string;
  };
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

const PPLP_TEAMS = ['Lions', 'Hawks', 'Sharks', 'Stallions', 'Bulls', 'Markhor'] as const;

export default async function RegisterPage({ params }: PageProps) {
  const { id } = await params;
  const base = await origin();
  const res = await fetch(`${base}/api/v1/tournaments/${id}`, { cache: 'no-store' });
  if (!res.ok) notFound();
  const { data } = (await res.json()) as { data: TournamentSummary };
  const t = data.tournament;

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">Register</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">{t.name}</h1>
      <p className="mt-3 text-sm text-ink-deep/70">
        {t.entryFee > 0
          ? `Entry fee: ${t.entryFee} ${t.currency}. Payment collected after the organizer confirms your spot.`
          : 'Free entry.'}
      </p>

      <form action={`/api/v1/tournaments/${t.id}/registrations`} method="post" className="mt-10 space-y-6">
        {/* Solo formats: Americano + Mexicano + King of court do not need a partner. */}
        {!['americano', 'mexicano', 'king_of_the_court'].includes(t.format) ? (
          <label className="block">
            <span className="text-sm text-ink-deep/80">Partner user id (optional)</span>
            <input
              type="text"
              name="partnerUserId"
              placeholder="UUID of your doubles partner"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
        ) : null}

        {t.pplpEnabled ? (
          <label className="block">
            <span className="text-sm text-ink-deep/80">Franchise team</span>
            <select
              name="teamName"
              required
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            >
              <option value="">Pick a team</option>
              {PPLP_TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm text-ink-deep/80">Team name (optional)</span>
            <input
              type="text"
              name="teamName"
              placeholder="A name your bracket will remember"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="border border-court bg-court px-6 py-3 text-sm text-cream hover:opacity-90"
          >
            Confirm registration
          </button>
          <Link
            href={`/play/tournaments/${t.id}`}
            className="border border-ink-deep/30 px-6 py-3 text-sm text-ink-deep hover:border-ink-deep"
          >
            Back
          </Link>
        </div>
      </form>
    </section>
  );
}
