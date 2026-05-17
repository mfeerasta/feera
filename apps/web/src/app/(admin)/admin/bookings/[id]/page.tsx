import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface ParticipantRow {
  id: string;
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
  isOpenMatch: boolean;
  notes: string | null;
  participants: ParticipantRow[];
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function BookingDetailPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { id } = await params;
  const res = await adminFetch(`/api/v1/bookings/${id}`);
  if (!res.ok) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-sm text-red-600">Failed to load booking (HTTP {res.status}).</p>
      </section>
    );
  }
  const json = (await res.json()) as { data: BookingDetail };
  const b = json.data;

  async function confirmAction(): Promise<void> {
    'use server';
    const { adminFetch } = await import('@/lib/admin/api-client');
    const { revalidatePath } = await import('next/cache');
    await adminFetch(`/api/v1/bookings/${id}/confirm`, { method: 'POST' });
    revalidatePath(`/admin/bookings/${id}`);
  }

  async function cancelAction(): Promise<void> {
    'use server';
    const { adminFetch } = await import('@/lib/admin/api-client');
    const { revalidatePath } = await import('next/cache');
    await adminFetch(`/api/v1/bookings/${id}/cancel`, { method: 'POST' });
    revalidatePath(`/admin/bookings/${id}`);
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <Link
        href={'/admin/bookings' as never}
        className="text-xs uppercase tracking-[0.2em] text-ink-deep/60 transition-colors duration-150 hover:text-court"
      >
        Back to bookings
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Booking
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{b.status}</h1>
          <p className="mt-2 font-mono text-xs text-ink-deep/50">{b.id}</p>
        </div>
        <div className="flex gap-3">
          {b.status === 'pending' ? (
            <form action={confirmAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-none border border-ink-deep bg-transparent px-4 text-xs uppercase tracking-wide text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
              >
                Confirm
              </button>
            </form>
          ) : null}
          {b.status !== 'cancelled' && b.status !== 'completed' ? (
            <form action={cancelAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-none border border-red-500 bg-transparent px-4 text-xs uppercase tracking-wide text-red-600 transition-colors duration-150 hover:bg-red-500 hover:text-cream"
              >
                Cancel
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-6 text-sm">
          {[
            { label: 'Status', value: b.status },
            { label: 'Amount', value: `${b.totalAmount} ${b.currency}` },
            { label: 'Start', value: new Date(b.startAt).toLocaleString() },
            { label: 'End', value: new Date(b.endAt).toLocaleString() },
            { label: 'Court', value: b.courtId, mono: true },
            { label: 'Organizer', value: b.organizerUserId, mono: true },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
                {f.label}
              </p>
              <p
                className={`mt-1 ${f.mono ? 'font-mono text-xs' : 'font-medium'}`}
              >
                {f.value}
              </p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/50">
              Notes
            </p>
            <p className="mt-1">{b.notes ?? '-'}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants ({b.participants.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>User</TH>
                <TH>RSVP</TH>
                <TH>Payment</TH>
              </TR>
            </THead>
            <TBody>
              {b.participants.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.userId}</TD>
                  <TD>{p.status}</TD>
                  <TD>{p.paymentStatus}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      {b.status === 'completed' ? (
        <Card>
          <CardHeader>
            <CardTitle>Record match score</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-ink-deep/70">
              Use the API to record sets:
            </p>
            <pre className="mt-3 overflow-x-auto border border-ink-deep/20 bg-ink-deep p-3 text-xs text-cream">
{`POST /api/v1/matches
  { "bookingId": "${b.id}", "teamAPlayer1": "...", ... }
POST /api/v1/matches/{matchId}/score
  { "sets": [[6,4],[3,6],[7,5]] }`}
            </pre>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}
