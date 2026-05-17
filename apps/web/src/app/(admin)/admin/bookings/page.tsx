import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface BookingRow {
  id: string;
  courtId: string;
  organizerUserId: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  maxParticipants: number;
}

interface PageProps {
  searchParams: Promise<{
    admin?: string;
    status?: string;
    courtId?: string;
    from?: string;
    to?: string;
  }>;
}

const inputCls =
  'h-10 rounded-none border border-ink-deep/30 bg-transparent px-3 text-sm text-ink-deep focus:border-court focus:outline-none';

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const params = new URLSearchParams({ limit: '100' });
  if (sp.status) params.set('status', sp.status);
  if (sp.courtId) params.set('courtId', sp.courtId);
  if (sp.from) params.set('from', sp.from);
  if (sp.to) params.set('to', sp.to);

  const res = await adminFetch(`/api/v1/bookings?${params.toString()}`);
  let rows: BookingRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: BookingRow[] };
    rows = json.data;
  } else {
    error = `Failed to load bookings (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Operations
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Bookings</h1>
          <p className="mt-2 text-sm text-ink-deep/60">{rows.length} shown</p>
        </div>
        <Link href={'/admin/bookings/new' as never}>
          <Button variant="inverted" size="sm">
            New booking
          </Button>
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-4 text-sm" method="get">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
            Status
          </span>
          <select
            name="status"
            defaultValue={sp.status ?? ''}
            className={inputCls}
          >
            <option value="">Any</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="no_show">no_show</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
            Court ID
          </span>
          <input
            type="text"
            name="courtId"
            defaultValue={sp.courtId ?? ''}
            className={`${inputCls} w-72`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
            From
          </span>
          <input
            type="datetime-local"
            name="from"
            defaultValue={sp.from ?? ''}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-deep/60">
            To
          </span>
          <input
            type="datetime-local"
            name="to"
            defaultValue={sp.to ?? ''}
            className={inputCls}
          />
        </label>
        <Button type="submit" variant="inverted" size="sm">
          Filter
        </Button>
      </form>

      <Card>
        <CardBody className="p-0">
          {error ? (
            <p className="px-6 py-8 text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-deep/60">No bookings match.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Status</TH>
                  <TH>Court</TH>
                  <TH>Organizer</TH>
                  <TH>Amount</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((b) => (
                  <TR key={b.id}>
                    <TD className="font-medium">
                      {new Date(b.startAt).toLocaleString()}
                    </TD>
                    <TD>{b.status}</TD>
                    <TD className="font-mono text-xs">{b.courtId.slice(0, 8)}</TD>
                    <TD className="font-mono text-xs">
                      {b.organizerUserId.slice(0, 8)}
                    </TD>
                    <TD>
                      {b.totalAmount} {b.currency}
                    </TD>
                    <TD>
                      <Link
                        className="text-ink-deep transition-colors duration-150 hover:text-court"
                        href={`/admin/bookings/${b.id}` as never}
                      >
                        Open
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
