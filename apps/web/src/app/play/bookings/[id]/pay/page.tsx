import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api/request-context';
import { playFetch } from '@/lib/play/api-client';
import { CheckoutCard } from '@/components/payments/checkout-card';

export const dynamic = 'force-dynamic';

interface ParticipantRow {
  userId: string;
  status: string;
  paymentStatus: string;
}

interface BookingDetail {
  id: string;
  courtId: string;
  organizerUserId: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  maxParticipants: number;
  seatsBooked: number;
  isOpenMatch: boolean;
  notes: string | null;
  participants: ParticipantRow[];
  courtName?: string;
  clubName?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PlayPayPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=/play/bookings/${id}/pay`);

  const res = await playFetch(`/api/v1/bookings/${id}`);
  if (!res.ok) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-20">
        <p className="border border-red-500/40 bg-red-500/5 px-6 py-4 text-sm text-red-600">
          We could not find that booking. It may have been cancelled or you may
          not have access (HTTP {res.status}).
        </p>
      </section>
    );
  }
  const { data: booking } = (await res.json()) as { data: BookingDetail };

  // Authorise: organizer + accepted participants only.
  const isOrganizer = booking.organizerUserId === session.userId;
  const acceptedPart = booking.participants?.find(
    (p) => p.userId === session.userId && p.status === 'accepted',
  );
  const isAdmin = session.role === 'platform_admin';
  if (!isOrganizer && !acceptedPart && !isAdmin) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-20">
        <p className="border border-red-500/40 bg-red-500/5 px-6 py-4 text-sm text-red-600">
          Only the organizer and accepted players can pay for this booking.
        </p>
      </section>
    );
  }

  const max = Math.max(booking.maxParticipants, 1);
  const perSeatMajor = Math.round((Number(booking.totalAmount) / max) * 100) / 100;
  const seats = isOrganizer
    ? Math.min(Math.max(booking.seatsBooked, 1), max)
    : 1;
  const payerMajor =
    isOrganizer && seats === max
      ? Number(booking.totalAmount)
      : Math.round(perSeatMajor * seats * 100) / 100;

  const amountMinor = Math.round(payerMajor * 100);
  const perSeatMinor = Math.round(perSeatMajor * 100);

  return (
    <>
      <section className="bg-ink-shadow text-cream" data-theme="dark">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href="/play/bookings"
            className="text-xs uppercase tracking-[0.25em] text-cream/60 feera-motion hover:text-court"
          >
            Back to my bookings
          </Link>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-cream">
            Pay your seat.
          </h1>
          <p className="mt-3 text-sm text-cream/70">
            {booking.clubName ? `${booking.clubName} - ` : ''}
            {booking.courtName ?? `Court ${booking.courtId.slice(0, 8)}`} on{' '}
            {fmtSlot(booking.startAt)}.
          </p>
        </div>
      </section>

      <section className="bg-cream" data-theme="light">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-14 md:grid-cols-[2fr_3fr]">
          <aside className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                Court summary
              </p>
              <dl className="mt-4 space-y-3 border border-ink-deep/15 bg-paper px-5 py-4 text-sm text-ink-deep">
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-deep/60">Court total</dt>
                  <dd className="font-serif text-base">
                    {Number(booking.totalAmount).toLocaleString()} {booking.currency}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-deep/60">Per seat</dt>
                  <dd>{perSeatMajor.toLocaleString()} {booking.currency}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-deep/60">Your share</dt>
                  <dd>
                    {seats} of {max} seats
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                Cancellation
              </p>
              <p className="mt-3 text-sm text-ink-deep/80">
                Full refund more than 24 hours before start. 50 percent refund
                inside 24 hours. No refund inside the final 4 hours, though
                cancelling still frees the court for someone else.
              </p>
            </div>
          </aside>
          <div>
            <CheckoutCard
              bookingId={booking.id}
              payerUserId={session.userId}
              amountMinor={amountMinor}
              currency={booking.currency}
              returnUrl={`/play/bookings`}
              seats={seats}
              perSeatMinor={perSeatMinor}
              surface="light"
            />
          </div>
        </div>
      </section>
    </>
  );
}
