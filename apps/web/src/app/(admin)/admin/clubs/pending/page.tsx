import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface PendingRow {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  email: string | null;
  createdAt: Date;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

async function loadPending(): Promise<PendingRow[]> {
  const session = await getSession();
  const rows = await withRequestContext(session, (tx) =>
    tx
      .select({
        id: clubs.id,
        name: clubs.name,
        slug: clubs.slug,
        countryCode: clubs.countryCode,
        city: clubs.city,
        email: clubs.email,
        createdAt: clubs.createdAt,
      })
      .from(clubs)
      .where(and(eq(clubs.approvalStatus, 'pending'), isNull(clubs.deletedAt)))
      .orderBy(desc(clubs.createdAt))
      .limit(200),
  );
  return rows;
}

async function approveAction(formData: FormData): Promise<void> {
  'use server';
  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;
  await adminFetch(`/api/v1/clubs/${encodeURIComponent(slug)}/approve`, {
    method: 'POST',
  });
  revalidatePath('/admin/clubs/pending');
  revalidatePath('/admin/clubs');
}

async function rejectAction(formData: FormData): Promise<void> {
  'use server';
  const slug = String(formData.get('slug') ?? '');
  const reason = String(formData.get('reason') ?? 'Not specified');
  if (!slug) return;
  await adminFetch(`/api/v1/clubs/${encodeURIComponent(slug)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  revalidatePath('/admin/clubs/pending');
  revalidatePath('/admin/clubs');
}

export default async function AdminClubsPendingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const rows = await loadPending();

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Operations
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Pending clubs</h1>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
            {rows.length} awaiting review
          </p>
        </div>
        <Link
          href="/admin/clubs"
          className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
        >
          All clubs
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[color:var(--color-fg-muted)]">
              No clubs are waiting for approval.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Location</TH>
                  <TH>Owner email</TH>
                  <TH>Submitted</TH>
                  <TH className="text-end">Action</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">
                      <Link
                        className="transition-colors duration-150 hover:text-[color:var(--color-accent)]"
                        href={`/admin/clubs/${c.slug}`}
                      >
                        {c.name}
                      </Link>
                      <span className="ms-2 text-xs text-[color:var(--color-fg-muted)]">
                        {c.slug}
                      </span>
                    </TD>
                    <TD>
                      {c.city}, {c.countryCode}
                    </TD>
                    <TD className="text-[color:var(--color-fg-muted)]">
                      {c.email ?? 'not set'}
                    </TD>
                    <TD className="text-[color:var(--color-fg-muted)]">
                      {new Date(c.createdAt).toISOString().slice(0, 10)}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <form action={approveAction}>
                          <input type="hidden" name="slug" value={c.slug} />
                          <Button type="submit" size="sm" variant="inverted">
                            Approve
                          </Button>
                        </form>
                        <form
                          action={rejectAction}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="slug" value={c.slug} />
                          <input
                            name="reason"
                            placeholder="Reason"
                            className="h-9 w-32 border border-[color:var(--color-border)] bg-transparent px-2 text-xs"
                            required
                            minLength={3}
                          />
                          <Button type="submit" size="sm" variant="danger">
                            Reject
                          </Button>
                        </form>
                      </div>
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
