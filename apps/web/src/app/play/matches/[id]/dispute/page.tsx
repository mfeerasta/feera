import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { matches } from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { DisputeForm } from './dispute-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDisputePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=/play/matches/${id}/dispute`);

  const match = await withRequestContext(session, async (tx) => {
    const [row] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);
    return row ?? null;
  });

  if (!match) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-20">
        <p className="border border-red-500/40 bg-red-500/5 px-6 py-4 text-sm text-red-600">
          We could not find that match. It may have been removed.
        </p>
      </section>
    );
  }

  const players = [
    match.teamAPlayer1,
    match.teamAPlayer2,
    match.teamBPlayer1,
    match.teamBPlayer2,
  ];
  const isPlayer = players.includes(session.userId);
  const isAdmin = session.role === 'platform_admin';
  const isClubStaff = session.role === 'club_staff';
  if (!isPlayer && !isAdmin && !isClubStaff) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-20">
        <p className="border border-red-500/40 bg-red-500/5 px-6 py-4 text-sm text-red-600">
          Only the four players or club staff can dispute this match.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream" data-theme="dark">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href={`/play/bookings`}
            className="text-xs uppercase tracking-[0.25em] text-cream/60 feera-motion hover:text-court"
          >
            Back
          </Link>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-cream">
            Dispute this match.
          </h1>
          <p className="mt-3 text-sm text-cream/70">
            Played{' '}
            {new Date(match.playedAt).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            . Recorded score {match.teamASetsWon} - {match.teamBSetsWon}.
          </p>
        </div>
      </section>

      <section className="bg-cream" data-theme="light">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <DisputeForm matchId={match.id} />
          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            What happens next
          </p>
          <p className="mt-3 text-sm text-ink-deep/80">
            An admin reviews every dispute. If we uphold yours, the match
            verification flips back to unverified and the rating worker
            recomputes on its next pass. We will message you with the decision.
          </p>
        </div>
      </section>
    </>
  );
}
