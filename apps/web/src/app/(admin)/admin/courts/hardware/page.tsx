import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface HardwareOrder {
  id: string;
  projectId: string | null;
  projectName: string | null;
  vendor: string | null;
  courtsOrdered: number | null;
  wholesaleUnit: number | null;
  sellUnit: number | null;
  marginPerCourt: number | null;
  totalMargin: number | null;
  status: string | null;
  orderDate: string | null;
  shipDate: string | null;
  installDate: string | null;
  paidDate: string | null;
}

interface HardwareStats {
  courtsPlacedYtd: number;
  wholesaleSpendYtd: number;
  marginCapturedYtd: number;
  ordersPending: number;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  quoted: 'bg-gray-100 text-gray-800',
  'po-issued': 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  installed: 'bg-green-100 text-green-800',
  invoiced: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {status}
    </span>
  );
}

function fmtMoney(cents: number | null | undefined): string {
  if (cents == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function HardwareSalesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/courts/hardware');
  let orders: HardwareOrder[] = [];
  let stats: HardwareStats = {
    courtsPlacedYtd: 0,
    wholesaleSpendYtd: 0,
    marginCapturedYtd: 0,
    ordersPending: 0,
  };
  let error: string | null = null;

  if (res.ok) {
    const json = (await res.json()) as {
      data: HardwareOrder[];
      stats: HardwareStats;
    };
    orders = json.data;
    stats = json.stats;
  } else {
    error = `Failed to load hardware orders (HTTP ${res.status}).`;
  }

  const statTiles = [
    { label: 'Courts placed YTD', value: String(stats.courtsPlacedYtd) },
    { label: 'Wholesale spend YTD', value: fmtMoney(stats.wholesaleSpendYtd) },
    { label: 'Margin captured YTD', value: fmtMoney(stats.marginCapturedYtd) },
    { label: 'Orders pending', value: String(stats.ordersPending) },
  ];

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts Business
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Hardware Sales
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Court hardware procurement, margins, and payment tracking.
        </p>
      </div>

      {/* Aggregate stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="border border-[color:var(--color-border)] p-4"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              {tile.label}
            </p>
            <p className="mt-2 font-serif text-2xl text-court">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <Card>
        <CardBody className="p-0">
          {error ? (
            <p className="px-6 py-8 text-sm text-red-600">{error}</p>
          ) : orders.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-deep/60">
              No hardware orders yet. Orders appear here when added to a
              project.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Project</TH>
                  <TH>Vendor</TH>
                  <TH>Courts</TH>
                  <TH>Wholesale total</TH>
                  <TH>Sell-to-client total</TH>
                  <TH>Feera Courts margin</TH>
                  <TH>Status</TH>
                  <TH>Order date</TH>
                  <TH>Expected payment</TH>
                </TR>
              </THead>
              <TBody>
                {orders.map((order) => {
                  const wholesaleTotal =
                    (order.wholesaleUnit ?? 0) * (order.courtsOrdered ?? 0);
                  const sellTotal =
                    (order.sellUnit ?? 0) * (order.courtsOrdered ?? 0);

                  return (
                    <TR key={order.id}>
                      <TD className="font-medium">
                        {order.projectName ?? 'Unlinked'}
                      </TD>
                      <TD>{order.vendor ?? '-'}</TD>
                      <TD>{order.courtsOrdered ?? 0}</TD>
                      <TD className="whitespace-nowrap">
                        {fmtMoney(wholesaleTotal)}
                      </TD>
                      <TD className="whitespace-nowrap">
                        {fmtMoney(sellTotal)}
                      </TD>
                      <TD className="whitespace-nowrap font-medium text-court">
                        {fmtMoney(order.totalMargin)}
                      </TD>
                      <TD>
                        <StatusBadge status={order.status ?? 'quoted'} />
                      </TD>
                      <TD className="whitespace-nowrap text-ink-deep/60">
                        {fmtDate(order.orderDate)}
                      </TD>
                      <TD className="whitespace-nowrap text-ink-deep/60">
                        {fmtDate(order.paidDate)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
