import Link from 'next/link';
import { notFound } from 'next/navigation';
import { playFetch } from '@/lib/play/api-client';
import { JoinRequestForm } from './join-request-form';

interface Participant {
  userId: string;
  displayName?: string;
  ratingDisplay?: number | null;
  status: string;
}

interface BookingDetail {
  id: string;
  courtId: string;
  courtName?: string;
  clubName?: string;
  clubSlug?: string;
  city?: string;
  startAt: string;
  endAt: string;
  maxParticipants: number;
  seatsBooked?: number;
  isOpenMatch: boolean;
  status: string;
  requiredLevelMin?: number | null;
  requiredLevelMax?: number | null;
  genderPreference: 'open' | 'men_only' | 'women_only' | 'mixed';
  notes?: string | null;
  organizerName?: string;
  organizerRatingDisplay?: number | null;
  participants?: Participant[];
}

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function OpenMatchDetailPage({ params }: PageProps) {
  const { bookingId } = await params;
  const res = await playFetch(`/api/v1/bookings/${bookingId}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Failed to load booking (HTTP {res.status}).
        </p>
      </section>
    );
  }
  const { data: b } = (await res.json()) as { data: BookingDetail };
  const seatsOpen = Math.max(
    0,
    b.maxParticipants - (b.seatsBooked ?? b.maxParticipants),
  );

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href="/play/open"
            className="text-xs uppercase tracking-[0.25em] text-cream/60 transition-colors duration-150 hover:text-court"
          >
            ← Open matches
          </Link>
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-cream/60">
            {b.city ?? ''} {b.clubName ? `· ${b.clubName}` : ''}
          </p>
          <h1 className="mt-2 font-serif text-5xl tracking-tight text-cream md:text-6xl">
            {b.courtName ?? 'Court'}
          </h1>
          <p className="mt-4 text-base text-cream/80">{fmtFull(b.startAt)}</p>
          <p className="mt-2 text-sm text-cream/60">
            {seatsOpen} of {b.maxParticipants} seats open
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                Host
              </p>
              <p className="mt-2 font-serif text-2xl tracking-tight text-ink-deep">
                {b.organizerName ?? 'Organizer'}
              </p>
              {typeof b.organizerRatingDisplay === 'number' && (
                <p className="mt-1 text-sm text-ink-deep/60">
                  Display rating {b.organizerRatingDisplay.toFixed(1)}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                Participants
              </p>
              <ul className="mt-3 divide-y divide-ink-deep/10 border border-ink-deep/15 bg-paper">
                {(b.participants ?? []).filter((p) => p.status === 'accepted').length === 0 ? (
                  <li className="px-4 py-3 text-sm text-ink-deep/60">
                    None confirmed yet.
                  </li>
                ) : (
                  (b.participants ?? [])
                    .filter((p) => p.status === 'accepted')
                    .map((p) => (
                      <li
                        key={p.userId}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <span className="text-ink-deep">
                          {p.displayName ?? p.userId.slice(0, 8)}
                        </span>
                        {typeof p.ratingDisplay === 'number' && (
                          <span className="text-xs text-ink-deep/60">
                            {p.ratingDisplay.toFixed(1)}
                          </span>
                        )}
                      </li>
                    ))
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                Match details
              </p>
              <dl className="mt-3 divide-y divide-ink-deep/10 border border-ink-deep/15 bg-paper text-sm">
                <div className="flex justify-between px-4 py-3">
                  <dt className="text-ink-deep/60">Total seats</dt>
                  <dd className="text-ink-deep">{b.maxParticipants}</dd>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <dt className="text-ink-deep/60">Seats open</dt>
                  <dd className="text-ink-deep">{seatsOpen}</dd>
                </div>
                {(b.requiredLevelMin || b.requiredLevelMax) && (
                  <div className="flex justify-between px-4 py-3">
                    <dt className="text-ink-deep/60">Required level</dt>
                    <dd className="text-ink-deep">
                      {b.requiredLevelMin ?? 0} - {b.requiredLevelMax ?? 7}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3">
                  <dt className="text-ink-deep/60">Gender preference</dt>
                  <dd className="text-ink-deep">
                    {b.genderPreference.replace(/_/g, ' ')}
                  </dd>
                </div>
                {b.notes && (
                  <div className="px-4 py-3">
                    <dt className="text-ink-deep/60">Notes</dt>
                    <dd className="mt-1 text-ink-deep">{b.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div>
            <JoinRequestForm
              bookingId={b.id}
              seatsOpen={seatsOpen}
              disabled={seatsOpen === 0 || b.status === 'cancelled'}
            />
          </div>
        </div>
      </section>
    </>
  );
}
