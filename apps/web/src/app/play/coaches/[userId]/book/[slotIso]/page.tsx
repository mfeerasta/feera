import Link from 'next/link';
import { notFound } from 'next/navigation';
import { playFetch } from '@/lib/play/api-client';

interface CoachDetail {
  userId: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  currency: string;
  hourlyRate: number;
}

interface SessionDetail {
  id: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  sessionType: string;
  notes: string | null;
}

interface PageProps {
  params: Promise<{ userId: string; slotIso: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function CoachingBookingConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { userId } = await params;
  const { sessionId } = await searchParams;

  const coachRes = await playFetch(`/api/v1/coaches/${encodeURIComponent(userId)}`);
  if (coachRes.status === 404) notFound();
  if (!coachRes.ok) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Failed to load coach (HTTP {coachRes.status}).
        </p>
      </section>
    );
  }
  const { data: coach } = (await coachRes.json()) as { data: CoachDetail };

  let session: SessionDetail | null = null;
  if (sessionId) {
    const sRes = await playFetch(
      `/api/v1/coaching-sessions/${encodeURIComponent(sessionId)}`,
    );
    if (sRes.ok) {
      const j = (await sRes.json()) as { data: SessionDetail };
      session = j.data;
    }
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href={`/play/coaches/${coach.userId}`}
            className="text-xs uppercase tracking-[0.25em] text-cream/60 transition-colors duration-150 hover:text-court"
          >
            Back to {coach.displayName}
          </Link>
          <h1 className="mt-6 font-serif text-5xl tracking-tight">
            Confirm and pay.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Your slot is held for 15 minutes. Pay below to confirm the session.
            You can cancel for free up to 24 hours before the session starts.
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-12 md:grid-cols-2">
          <div className="border border-ink-deep/15 bg-paper p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              Session
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink-deep">
              {coach.displayName}
            </h2>
            <p className="mt-1 text-sm text-ink-deep/70">
              {coach.countryCode}
              {coach.city ? ` · ${coach.city}` : ''}
            </p>
            {session ? (
              <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-ink-deep/60">When</dt>
                <dd className="text-end text-ink-deep">
                  {new Date(session.startAt).toLocaleString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
                <dt className="text-ink-deep/60">Duration</dt>
                <dd className="text-end text-ink-deep">
                  {Math.round(
                    (new Date(session.endAt).getTime() -
                      new Date(session.startAt).getTime()) /
                      60_000,
                  )}{' '}
                  min
                </dd>
                <dt className="text-ink-deep/60">Type</dt>
                <dd className="text-end text-ink-deep">{session.sessionType}</dd>
                <dt className="text-ink-deep/60">Status</dt>
                <dd className="text-end text-ink-deep">{session.status}</dd>
                <dt className="text-ink-deep/60">Total</dt>
                <dd className="text-end font-serif text-2xl text-ink-deep">
                  {session.currency} {session.totalAmount.toFixed(2)}
                </dd>
              </dl>
            ) : (
              <p className="mt-6 text-sm text-ink-deep/70">
                Session not found. Return to the coach page and pick a slot.
              </p>
            )}
          </div>

          <div className="border border-ink-deep/15 bg-paper p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              Payment
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink-deep">
              Pay now to confirm.
            </h2>
            <p className="mt-4 text-sm text-ink-deep/70">
              Card payments are processed by Stripe. PKR and AED routing falls
              back to Raast and Apple Pay respectively when available.
            </p>
            <form
              action={session ? `/admin/bookings/${session.id}/pay` : '#'}
              method="get"
              className="mt-6"
            >
              <button
                type="submit"
                disabled={!session}
                className="inline-flex h-11 w-full items-center justify-center border border-ink-deep px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court disabled:opacity-50"
              >
                {session
                  ? `Pay ${session.currency} ${session.totalAmount.toFixed(2)}`
                  : 'No session selected'}
              </button>
            </form>
            <p className="mt-4 text-xs text-ink-deep/60">
              By paying you agree to the cancellation policy: full refund up to
              24 hours before the session, no refund after.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
