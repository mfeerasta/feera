import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api/request-context';
import { playFetch } from '@/lib/play/api-client';
import { EmptyState } from '@/components/play/empty-state';

interface JoinRow {
  id: string;
  bookingId: string;
  requesterUserId: string;
  requesterName?: string;
  requesterRatingDisplay?: number | null;
  seatsRequested: number;
  message?: string | null;
  status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'expired';
  createdAt: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function respondAction(formData: FormData) {
  'use server';
  const bookingId = String(formData.get('bookingId') ?? '');
  const joinId = String(formData.get('joinId') ?? '');
  const action = String(formData.get('action') ?? '');
  if (!bookingId || !joinId || !['approve', 'decline'].includes(action)) return;
  const { playFetch } = await import('@/lib/play/api-client');
  await playFetch(
    `/api/v1/bookings/${encodeURIComponent(bookingId)}/join/${encodeURIComponent(joinId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: action === 'approve' ? 'approved' : 'declined',
      }),
    },
  );
  const { revalidatePath } = await import('next/cache');
  revalidatePath(`/play/bookings/${bookingId}/joins`);
}

export default async function JoinsInboxPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=/play/bookings/${id}/joins`);

  // Verify ownership lightly by fetching the booking first.
  const bookingRes = await playFetch(`/api/v1/bookings/${id}`);
  if (!bookingRes.ok) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Failed to load booking (HTTP {bookingRes.status}).
        </p>
      </section>
    );
  }
  const { data: booking } = (await bookingRes.json()) as {
    data: { organizerUserId: string; courtName?: string; startAt: string };
  };
  const isOrganizer = booking.organizerUserId === session.userId;
  if (!isOrganizer && session.role !== 'platform_admin') {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Only the booking organizer can view join requests.
        </p>
      </section>
    );
  }

  const res = await playFetch(`/api/v1/bookings/${id}/joins`);
  let rows: JoinRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const j = (await res.json()) as { data: JoinRow[] };
    rows = j.data;
  } else if (res.status === 404) {
    error = null;
  } else {
    error = `Failed to load join requests (HTTP ${res.status}).`;
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const resolved = rows.filter((r) => r.status !== 'pending');

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href="/play/bookings"
            className="text-xs uppercase tracking-[0.25em] text-cream/60 transition-colors duration-150 hover:text-court"
          >
            ← My bookings
          </Link>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-cream">
            Join requests.
          </h1>
          <p className="mt-3 text-sm text-cream/70">
            {booking.courtName ?? 'Booking'} ·{' '}
            {new Date(booking.startAt).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          {error && (
            <p className="mb-6 border border-red-500/40 bg-paper px-6 py-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Pending
          </p>
          <div className="mt-4">
            {pending.length === 0 ? (
              <EmptyState
                headline="Nothing here yet."
                body="No pending join requests. We will notify you the moment one comes in."
                ctaHref="/play/bookings"
                ctaLabel="Back to my bookings"
              />
            ) : (
              <ul className="divide-y divide-ink-deep/10 border border-ink-deep/15 bg-paper">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-serif text-xl tracking-tight text-ink-deep">
                        {r.requesterName ?? r.requesterUserId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-ink-deep/60">
                        {typeof r.requesterRatingDisplay === 'number'
                          ? `Level ${r.requesterRatingDisplay.toFixed(1)} · `
                          : ''}
                        {r.seatsRequested} seat
                        {r.seatsRequested === 1 ? '' : 's'} requested
                      </p>
                      {r.message && (
                        <p className="mt-2 text-sm text-ink-deep/80">
                          “{r.message}”
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <form action={respondAction}>
                        <input type="hidden" name="bookingId" value={id} />
                        <input type="hidden" name="joinId" value={r.id} />
                        <input type="hidden" name="action" value="approve" />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center border border-court px-5 text-sm text-court transition-colors duration-150 hover:bg-court hover:text-cream"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={respondAction}>
                        <input type="hidden" name="bookingId" value={id} />
                        <input type="hidden" name="joinId" value={r.id} />
                        <input type="hidden" name="action" value="decline" />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center border border-ink-deep/30 px-5 text-sm text-ink-deep/70 transition-colors duration-150 hover:border-red-500 hover:text-red-600"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {resolved.length > 0 && (
            <div className="mt-12">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                Resolved
              </p>
              <ul className="mt-4 divide-y divide-ink-deep/10 border border-ink-deep/15 bg-paper">
                {resolved.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-6 py-4 text-sm"
                  >
                    <span className="text-ink-deep">
                      {r.requesterName ?? r.requesterUserId.slice(0, 8)}
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-ink-deep/60">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
