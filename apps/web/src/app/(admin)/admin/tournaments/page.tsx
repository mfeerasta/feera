import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface TournamentRow {
  id: string;
  name: string;
  slug: string;
  format: string;
  city: string | null;
  countryCode: string;
  status: string;
  startAt: string;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-ink-deep/10 text-ink-deep/70',
  open: 'bg-court/15 text-court',
  registration_closed: 'bg-brass/15 text-brass',
  in_progress: 'bg-court text-cream',
  completed: 'bg-ink-deep text-cream',
  cancelled: 'bg-red-500/15 text-red-700',
};

export default async function AdminTournamentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/tournaments?limit=100');
  let rows: TournamentRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: TournamentRow[] };
    rows = json.data;
  } else {
    error = `Failed to load tournaments (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">Operations</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Tournaments</h1>
          <p className="mt-2 text-sm text-ink-deep/60">{rows.length} total</p>
        </div>
        <Link href="/admin/tournaments/new">
          <Button variant="inverted" size="sm">
            New tournament
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          {error ? (
            <p className="px-6 py-8 text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-deep/60">
              No tournaments yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Format</TH>
                  <TH>City</TH>
                  <TH>Starts</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">
                      <Link
                        href={`/admin/tournaments/${t.id}`}
                        className="text-ink-deep hover:text-court"
                      >
                        {t.name}
                      </Link>
                    </TD>
                    <TD className="text-ink-deep/60">{t.format.replace(/_/g, ' ')}</TD>
                    <TD>{t.city ?? '-'}</TD>
                    <TD>{new Date(t.startAt).toLocaleDateString()}</TD>
                    <TD>
                      <span
                        className={`inline-block px-2 py-1 text-xs uppercase tracking-[0.15em] ${
                          STATUS_COLORS[t.status] ?? ''
                        }`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
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
