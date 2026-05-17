import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface ClubRow {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  isActive: boolean;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

export default async function AdminClubsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/clubs?limit=100');
  let clubs: ClubRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: ClubRow[] };
    clubs = json.data;
  } else {
    error = `Failed to load clubs (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Operations
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Clubs</h1>
          <p className="mt-2 text-sm text-ink-deep/60">{clubs.length} total</p>
        </div>
        <Link href="/admin/clubs/new">
          <Button variant="inverted" size="sm">
            New club
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          {error ? (
            <p className="px-6 py-8 text-sm text-red-600">{error}</p>
          ) : clubs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-deep/60">
              No clubs yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Slug</TH>
                  <TH>Country</TH>
                  <TH>City</TH>
                  <TH>Active</TH>
                </TR>
              </THead>
              <TBody>
                {clubs.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">
                      <Link
                        className="text-ink-deep transition-colors duration-150 hover:text-court"
                        href={`/admin/clubs/${c.slug}`}
                      >
                        {c.name}
                      </Link>
                    </TD>
                    <TD className="text-ink-deep/60">{c.slug}</TD>
                    <TD>{c.countryCode}</TD>
                    <TD>{c.city}</TD>
                    <TD>{c.isActive ? 'Yes' : 'No'}</TD>
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
