import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
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
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}

function fmtSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminPayPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { id } = await params;

  const res = await adminFetch(`/api/v1/bookings/${id}`);
  if (!res.ok) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <p className="border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          Failed to load booking (HTTP {res.status}).
        </p>
      </section>
    );
  }
  const { data: booking } = (await res.json()) as { data: BookingDetail };

  const max = Math.max(booking.maxParticipants, 1);
  const perSeatMajor = Math.round((Number(booking.totalAmount) / max) * 100) / 100;
  const seats = Math.min(Math.max(booking.seatsBooked, 1), max);
  const organizerMajor =
    seats === max
      ? Number(booking.totalAmount)
      : Math.round(perSeatMajor * seats * 100) / 100;

  const amountMinor = Math.round(organizerMajor * 100);
  const perSeatMinor = Math.round(perSeatMajor * 100);

  return (
    <section className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <div>
        <Link
          href={`/admin/bookings/${id}?admin=1` as never}
          className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)] feera-motion hover:text-[color:var(--color-accent)]"
        >
          Back to booking
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Checkout
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-[color:var(--color-fg)]">
          Settle your seats.
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          {fmtSlot(booking.startAt)} to {fmtSlot(booking.endAt)} on court{' '}
          {booking.courtId.slice(0, 8)}. Court total{' '}
          {Number(booking.totalAmount).toLocaleString()} {booking.currency}.
        </p>
      </div>

      <CheckoutCard
        bookingId={booking.id}
        payerUserId={booking.organizerUserId}
        amountMinor={amountMinor}
        currency={booking.currency}
        returnUrl={`/admin/bookings/${booking.id}?admin=1`}
        seats={seats}
        perSeatMinor={perSeatMinor}
      />

      <aside className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] px-6 py-5 text-sm text-[color:var(--color-fg-muted)]">
        <p className="font-serif text-base tracking-tight text-[color:var(--color-fg)]">
          How payouts settle
        </p>
        <p className="mt-2">
          Each joiner pays their own seat as their request is approved. The
          club receives the full court price once every seat has settled. Refunds
          follow the cancellation policy: full refund more than 24 hours before
          start, 50 percent inside 24 hours, none inside 4 hours.
        </p>
      </aside>
    </section>
  );
}
