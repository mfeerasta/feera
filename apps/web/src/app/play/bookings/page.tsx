import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api/request-context';
import { playFetch } from '@/lib/play/api-client';
import { EmptyState } from '@/components/play/empty-state';

interface BookingRow {
  id: string;
  courtId: string;
  courtName?: string;
  clubName?: string;
  clubSlug?: string;
  startAt: string;
  endAt: string;
  status: string;
  isOpenMatch: boolean;
  totalAmount: number;
  currency: string;
  organizerUserId: string;
  maxParticipants: number;
}

function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function MyBookingsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/bookings');

  const qs = new URLSearchParams({
    organizerUserId: session.userId,
    limit: '100',
  });
  const res = await playFetch(`/api/v1/bookings?${qs.toString()}`);
  let rows: BookingRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const j = (await res.json()) as { data: BookingRow[] };
    rows = j.data;
  } else {
    error = `Failed to load bookings (HTTP ${res.status}).`;
  }

  const now = new Date();
  const upcoming = rows
    .filter((r) => new Date(r.startAt) >= now && r.status !== 'cancelled')
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  const past = rows
    .filter((r) => new Date(r.startAt) < now || r.status === 'cancelled')
    .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt));

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Account
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-cream">
            My bookings.
          </h1>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          {error && (
            <p className="mb-8 border border-red-500/40 bg-paper px-6 py-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <BookingsSection
            title="Upcoming"
            rows={upcoming}
            currentUserId={session.userId}
            emptyHeadline="Nothing here yet."
            emptyBody="You have no upcoming bookings. Browse clubs to book a court."
          />
          <div className="mt-16">
            <BookingsSection
              title="Past"
              rows={past}
              currentUserId={session.userId}
              isPast
              emptyHeadline="No past bookings."
              emptyBody="Once you have played, your history will appear here."
            />
          </div>
        </div>
      </section>
    </>
  );
}

interface SectionProps {
  title: string;
  rows: BookingRow[];
  currentUserId: string;
  emptyHeadline: string;
  emptyBody: string;
  isPast?: boolean;
}

function BookingsSection({
  title,
  rows,
  currentUserId,
  emptyHeadline,
  emptyBody,
  isPast,
}: SectionProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
        {title}
      </p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight text-ink-deep">
        {rows.length} booking{rows.length === 1 ? '' : 's'}.
      </h2>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            headline={emptyHeadline}
            body={emptyBody}
            ctaHref="/play/clubs"
            ctaLabel="Browse clubs"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((b) => {
              const isOrganizer = b.organizerUserId === currentUserId;
              return (
                <article
                  key={b.id}
                  className="flex flex-col gap-3 border border-ink-deep/15 bg-paper p-6"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                      {b.clubName ?? ''}
                    </p>
                    <span
                      className={`border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                        b.status === 'confirmed'
                          ? 'border-court text-court'
                          : b.status === 'cancelled'
                            ? 'border-red-500 text-red-500'
                            : 'border-ink-deep/30 text-ink-deep/60'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl tracking-tight text-ink-deep">
                    {b.courtName ?? 'Court'}
                  </h3>
                  <p className="text-sm text-ink-deep/70">
                    {fmtFull(b.startAt)}
                  </p>
                  <p className="text-xs text-ink-deep/60">
                    {b.totalAmount} {b.currency}
                    {b.isOpenMatch ? ' · open match' : ''}
                  </p>
                  {!isPast && (
                    <div className="mt-auto flex flex-wrap gap-3 pt-2 text-sm">
                      {isOrganizer && b.isOpenMatch && (
                        <Link
                          href={`/play/bookings/${b.id}/joins`}
                          className="text-ink-deep underline-offset-4 hover:text-court hover:underline"
                        >
                          View join requests
                        </Link>
                      )}
                      {b.status === 'pending' && (
                        <Link
                          href={`/admin/bookings/${b.id}/pay`}
                          className="text-ink-deep underline-offset-4 hover:text-court hover:underline"
                        >
                          Pay
                        </Link>
                      )}
                      {isOrganizer && b.status !== 'cancelled' && (
                        <CancelButton bookingId={b.id} />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

async function cancelBookingAction(formData: FormData) {
  'use server';
  const bookingId = String(formData.get('bookingId') ?? '');
  if (!bookingId) return;
  const { playFetch } = await import('@/lib/play/api-client');
  await playFetch(`/api/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
  });
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/play/bookings');
}

function CancelButton({ bookingId }: { bookingId: string }) {
  return (
    <form action={cancelBookingAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <button
        type="submit"
        className="text-red-600 underline-offset-4 hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}
